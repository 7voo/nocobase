# Design Document

## Overview

plugin-wecom 是一个 NocoBase 认证插件，实现企业微信扫码登录功能。该插件遵循 NocoBase 的认证插件架构，通过扩展 BaseAuth 类实现企业微信 OAuth 2.0 授权流程，为用户提供便捷的扫码登录体验。

插件的核心功能包括：
- 注册企业微信认证类型到 NocoBase Auth Manager
- 在登录页面展示企业微信二维码
- 处理企业微信 OAuth 2.0 授权回调
- 自动创建或绑定用户账号
- 提供管理员配置界面

## Architecture

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        NocoBase App                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────────────────────┐  │
│  │   Client     │         │         Server               │  │
│  │              │         │                              │  │
│  │  ┌────────┐  │         │  ┌────────────────────────┐ │  │
│  │  │ QR Code│  │         │  │  WeComAuth             │ │  │
│  │  │Component│◄─┼─────────┼─►│  (extends BaseAuth)    │ │  │
│  │  └────────┘  │         │  └───────┬────────────────┘ │  │
│  │              │         │          │                   │  │
│  │  ┌────────┐  │         │  ┌───────▼────────────────┐ │  │
│  │  │Settings│  │         │  │  WeComAuthService      │ │  │
│  │  │  Form  │  │         │  │  - getAccessToken()    │ │  │
│  │  └────────┘  │         │  │  - getUserInfo()       │ │  │
│  │              │         │  │  - createOrBindUser()  │ │  │
│  └──────────────┘         │  └───────┬────────────────┘ │  │
│                           │          │                   │  │
│                           │  ┌───────▼────────────────┐ │  │
│                           │  │  Auth Manager          │ │  │
│                           │  │  User Repository       │ │  │
│                           │  └────────────────────────┘ │  │
└───────────────────────────┴──────────┬───────────────────┘  │
                                       │                       │
                            ┌──────────▼──────────┐            │
                            │   WeCom API         │            │
                            │  - OAuth 2.0        │            │
                            │  - User Info API    │            │
                            └─────────────────────┘            │
```

### 认证流程

```
User          Client          Server          WeCom API
 │              │               │                 │
 │──Visit Login Page──►         │                 │
 │              │               │                 │
 │              │──Request QR Code──►             │
 │              │               │                 │
 │              │               │──Get Auth URL──►│
 │              │               │◄──Return URL────│
 │              │               │                 │
 │              │◄──Display QR Code──             │
 │              │               │                 │
 │──Scan QR Code──────────────────────────────────►
 │              │               │                 │
 │──Confirm Login─────────────────────────────────►
 │              │               │                 │
 │              │               │◄──Callback with Code──
 │              │               │                 │
 │              │               │──Exchange Token─►
 │              │               │◄──Access Token──│
 │              │               │                 │
 │              │               │──Get User Info──►
 │              │               │◄──User Data─────│
 │              │               │                 │
 │              │               │──Create/Bind User
 │              │               │──Generate JWT Token
 │              │               │                 │
 │              │◄──Return Token & User Info──    │
 │              │               │                 │
 │◄──Redirect to Home──         │                 │
```

## Components and Interfaces

### Server-Side Components

#### 1. WeComAuth (extends BaseAuth)

企业微信认证类，继承自 NocoBase 的 BaseAuth，实现企业微信特定的认证逻辑。

```typescript
class WeComAuth extends BaseAuth {
  // 验证企业微信授权码并返回用户
  async validate(): Promise<Model>
  
  // 处理 OAuth 回调，获取 access token
  async getAccessToken(code: string): Promise<string>
  
  // 使用 access token 获取用户信息
  async getUserInfo(accessToken: string): Promise<WeComUserInfo>
  
  // 创建或绑定用户账号
  async createOrBindUser(wecomUserInfo: WeComUserInfo): Promise<Model>
}
```

#### 2. WeComAuthService

企业微信 API 服务类，封装与企业微信 API 的交互。

```typescript
class WeComAuthService {
  constructor(config: WeComConfig)
  
  // 获取授权 URL
  getAuthorizationUrl(redirectUri: string, state: string): string
  
  // 使用授权码换取 access token
  async getAccessToken(code: string): Promise<string>
  
  // 获取用户信息
  async getUserInfo(accessToken: string): Promise<WeComUserInfo>
  
  // 重试机制
  private async retryRequest<T>(fn: () => Promise<T>, maxRetries: number): Promise<T>
}
```

#### 3. PluginWeComServer (extends Plugin)

服务端插件主类，负责插件的生命周期管理。

```typescript
class PluginWeComServer extends Plugin {
  async load(): Promise<void>
  async install(options?: InstallOptions): Promise<void>
}
```

#### 4. Actions

处理 HTTP 请求的 action handlers。

```typescript
// 处理企业微信 OAuth 回调
async function wecomCallback(ctx: Context): Promise<void>

// 获取企业微信授权 URL
async function getAuthUrl(ctx: Context): Promise<void>
```

### Client-Side Components

#### 1. WeComSignInButton

企业微信登录按钮组件，显示二维码或跳转到授权页面。

```typescript
interface WeComSignInButtonProps {
  authenticator: Authenticator
}

const WeComSignInButton: React.FC<WeComSignInButtonProps>
```

#### 2. WeComQRCode

企业微信二维码组件，使用企业微信 JS SDK 或生成二维码图片。

```typescript
interface WeComQRCodeProps {
  authUrl: string
  onSuccess: (code: string) => void
  onError: (error: Error) => void
}

const WeComQRCode: React.FC<WeComQRCodeProps>
```

#### 3. WeComAdminSettings

管理员配置表单组件。

```typescript
const WeComAdminSettings: React.FC
```

#### 4. PluginWeComClient (extends Plugin)

客户端插件主类。

```typescript
class PluginWeComClient extends Plugin {
  async load(): Promise<void>
}
```

## Data Models

### Authenticator Configuration

企业微信认证器的配置存储在 `authenticators` 表中，options 字段包含以下结构：

```typescript
interface WeComAuthenticatorOptions {
  // 公开配置（客户端可见）
  public: {
    // 是否允许自动注册
    autoSignup: boolean
    // 默认角色 ID（可选）
    defaultRole?: number
  }
  
  // 私有配置（仅服务端可见）
  corpId: string        // 企业 ID
  agentId: string       // 应用 ID
  secret: string        // 应用密钥
  callbackUrl: string   // 回调地址
}
```

### User Binding

用户与企业微信账号的绑定关系存储在用户表的扩展字段中：

```typescript
// users 表扩展字段
interface UserWeComBinding {
  wecomUserId?: string      // 企业微信用户 ID
  wecomOpenId?: string      // 企业微信 OpenID
  wecomUnionId?: string     // 企业微信 UnionID（如果有）
}
```

### WeCom User Info

从企业微信 API 获取的用户信息：

```typescript
interface WeComUserInfo {
  userid: string           // 企业微信用户 ID
  name: string            // 用户名称
  mobile?: string         // 手机号
  email?: string          // 邮箱
  avatar?: string         // 头像 URL
  department?: number[]   // 部门 ID 列表
  position?: string       // 职位
  gender?: string         // 性别
  status?: number         // 状态
}
```

## Data Models

### Collections

插件需要扩展现有的 collections：

#### users collection 扩展

```typescript
{
  name: 'users',
  fields: [
    {
      type: 'string',
      name: 'wecomUserId',
      unique: true,
      allowNull: true,
    },
    {
      type: 'string',
      name: 'wecomOpenId',
      allowNull: true,
    },
    {
      type: 'string',
      name: 'wecomUnionId',
      allowNull: true,
    }
  ]
}
```

## Correct
ness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Required configuration fields validation

*For any* authenticator creation attempt with wecom type, if any of Corp ID, Agent ID, or Secret is missing, the validation should fail and reject the creation.

**Validates: Requirements 1.4**

### Property 2: Authorization URL contains required parameters

*For any* wecom authenticator configuration, the generated OAuth 2.0 authorization URL should contain Corp ID, Agent ID, redirect_uri, and state parameters.

**Validates: Requirements 2.2**

### Property 3: Authorization URL includes callback URL

*For any* wecom authenticator configuration, the generated authorization URL's redirect_uri parameter should match the configured callback URL.

**Validates: Requirements 2.3**

### Property 4: Access token exchange uses correct credentials

*For any* valid authorization code, the token exchange request should include Corp ID, Secret, and the authorization code.

**Validates: Requirements 3.2**

### Property 5: User info retrieval follows token acquisition

*For any* successfully obtained access token, the system should make a user info API call using that token.

**Validates: Requirements 3.3**

### Property 6: User identifier extraction from API response

*For any* valid WeCom user info response, the system should extract the userid field as the unique identifier.

**Validates: Requirements 3.4**

### Property 7: Error handling for authorization failures

*For any* authorization failure scenario (invalid code, API error, network error), the system should return an error message without creating or authenticating users.

**Validates: Requirements 3.5, 6.1, 6.2, 6.3**

### Property 8: New user creation for unmatched WeCom users

*For any* WeCom user info where no matching wecomUserId exists in the user repository, the system should create a new user account.

**Validates: Requirements 4.1**

### Property 9: WeCom identifier uniqueness

*For any* newly created user account via WeCom authentication, the wecomUserId field should be stored and be unique across all users.

**Validates: Requirements 4.2**

### Property 10: User field population from WeCom data

*For any* WeCom user info containing name or email fields, those values should be populated in the corresponding user account fields during creation.

**Validates: Requirements 4.3**

### Property 11: Default role assignment

*For any* newly created user account via WeCom authentication, the system should assign the default roles specified in the authenticator configuration.

**Validates: Requirements 4.4**

### Property 12: User persistence verification

*For any* user account created via WeCom authentication, the account should be retrievable from the user repository using the wecomUserId.

**Validates: Requirements 4.5**

### Property 13: Existing user authentication

*For any* WeCom user info where a matching wecomUserId exists in the user repository, the system should authenticate that existing user without creating a new account.

**Validates: Requirements 5.1**

### Property 14: JWT token generation for authenticated users

*For any* successfully authenticated user via WeCom, the system should generate a valid JWT token.

**Validates: Requirements 5.2**

### Property 15: Token response includes user information

*For any* generated JWT token, the response should include both the token and the authenticated user's information.

**Validates: Requirements 5.3**

### Property 16: Invalid authorization code rejection

*For any* invalid or malformed authorization code received at the callback URL, the system should reject the request and log the error without proceeding to token exchange.

**Validates: Requirements 6.1**

### Property 17: Graceful API error handling

*For any* error response from WeCom API, the system should handle it gracefully and return a user-friendly error message without exposing internal details.

**Validates: Requirements 6.2**

### Property 18: No side effects on token request failure

*For any* failed access token request, the system should not create any user accounts or modify any existing user data.

**Validates: Requirements 6.3**

### Property 19: Network error retry with exponential backoff

*For any* network error during WeCom API calls, the system should retry the request up to 3 times with exponential backoff delays.

**Validates: Requirements 6.4**

### Property 20: Sensitive data masking in logs

*For any* log entry that would contain Corp ID, Secret, or Access Token, those values should be masked or redacted before logging.

**Validates: Requirements 6.5**

### Property 21: Configuration validation on save

*For any* configuration save attempt, all required fields (Corp ID, Agent ID, Secret) should be validated before persisting to the database.

**Validates: Requirements 7.3**

### Property 22: Configuration persistence and retrieval

*For any* saved wecom authenticator configuration, it should be retrievable from the database with all fields intact.

**Validates: Requirements 7.4**

### Property 23: UI text internationalization

*For any* supported language preference (zh-CN or en-US), all UI text including labels, buttons, and error messages should be displayed in that language.

**Validates: Requirements 8.2, 8.3, 8.5**

## Error Handling

### Error Categories

#### 1. Configuration Errors
- Missing required fields (Corp ID, Agent ID, Secret)
- Invalid callback URL format
- Duplicate authenticator name

**Handling Strategy:**
- Validate configuration before saving
- Return clear error messages indicating which fields are invalid
- Prevent authenticator creation/update if validation fails

#### 2. OAuth Flow Errors
- Invalid authorization code
- Expired authorization code
- State parameter mismatch (CSRF protection)

**Handling Strategy:**
- Validate authorization code format
- Check state parameter matches the session
- Return user-friendly error messages
- Log detailed error information for debugging

#### 3. WeCom API Errors
- Access token request failure
- User info request failure
- Rate limiting
- Invalid credentials

**Handling Strategy:**
- Implement retry logic with exponential backoff (max 3 attempts)
- Parse WeCom API error responses
- Map WeCom error codes to user-friendly messages
- Log API errors with masked sensitive data

#### 4. Network Errors
- Connection timeout
- DNS resolution failure
- Network unreachable

**Handling Strategy:**
- Retry with exponential backoff (max 3 attempts)
- Set appropriate timeout values (10s for connection, 30s for request)
- Provide fallback error messages
- Log network errors for monitoring

#### 5. User Creation Errors
- Duplicate wecomUserId (should not happen due to uniqueness check)
- Database constraint violations
- Missing required user fields

**Handling Strategy:**
- Check for existing user before creation
- Validate user data before persistence
- Handle database errors gracefully
- Rollback on failure

### Error Response Format

All errors should follow NocoBase's standard error response format:

```typescript
{
  errors: [
    {
      message: string,      // User-friendly error message (i18n)
      code?: string,        // Error code for client handling
      details?: any         // Additional error details (dev mode only)
    }
  ]
}
```

### Logging Strategy

- **INFO**: Successful authentication, user creation
- **WARN**: Retry attempts, deprecated API usage
- **ERROR**: Authentication failures, API errors, configuration errors
- **DEBUG**: Detailed request/response data (with sensitive data masked)

Sensitive data to mask:
- Corp ID (show only first 4 characters)
- Secret (completely masked)
- Access Token (completely masked)
- Authorization Code (completely masked)

## Testing Strategy

### Unit Testing

Unit tests will verify individual components and functions work correctly:

#### Server-Side Unit Tests

1. **WeComAuthService Tests**
   - Test authorization URL generation with various configurations
   - Test access token exchange with mocked WeCom API responses
   - Test user info retrieval with mocked API responses
   - Test retry logic with simulated network failures
   - Test error handling for various API error responses

2. **WeComAuth Tests**
   - Test validate() method with various authorization codes
   - Test createOrBindUser() with new and existing users
   - Test user field mapping from WeCom user info
   - Test default role assignment

3. **Action Handler Tests**
   - Test callback handler with valid and invalid codes
   - Test getAuthUrl handler returns correct URL
   - Test error responses for various failure scenarios

#### Client-Side Unit Tests

1. **WeComSignInButton Tests**
   - Test button renders correctly
   - Test click handler triggers auth flow
   - Test error display

2. **WeComQRCode Tests**
   - Test QR code generation with auth URL
   - Test refresh mechanism
   - Test expiration handling

3. **WeComAdminSettings Tests**
   - Test form renders all required fields
   - Test form validation
   - Test save handler

### Property-Based Testing

Property-based tests will verify universal properties hold across all inputs using a PBT library (fast-check for TypeScript/JavaScript):

#### Configuration

- Each property-based test should run a minimum of 100 iterations
- Each test must be tagged with a comment referencing the correctness property from the design document
- Format: `// Feature: plugin-wecom, Property {number}: {property_text}`

#### Property Tests

1. **Authorization URL Generation**
   - Generate random authenticator configurations
   - Verify all required parameters are present in the URL
   - Verify callback URL is correctly included

2. **User Creation and Binding**
   - Generate random WeCom user info
   - Verify new users are created when no match exists
   - Verify existing users are authenticated when match exists
   - Verify wecomUserId uniqueness is maintained

3. **Error Handling**
   - Generate various error scenarios
   - Verify no user operations occur on failures
   - Verify error messages are returned

4. **Data Mapping**
   - Generate random WeCom user info with various field combinations
   - Verify user fields are correctly populated
   - Verify missing optional fields don't cause errors

5. **Sensitive Data Masking**
   - Generate random log entries with sensitive data
   - Verify all sensitive values are masked

### Integration Testing

Integration tests will verify the complete authentication flow:

1. **End-to-End OAuth Flow**
   - Mock WeCom API endpoints
   - Simulate complete login flow from QR code to JWT token
   - Verify user creation and authentication

2. **Database Integration**
   - Test user creation and retrieval
   - Test configuration persistence
   - Test uniqueness constraints

3. **Auth Manager Integration**
   - Test authenticator registration
   - Test authentication middleware
   - Test JWT token generation and validation

### Testing Tools

- **Unit Tests**: Vitest (NocoBase standard)
- **Property-Based Tests**: fast-check
- **Mocking**: Vitest mocks for API calls and database operations
- **Test Database**: SQLite in-memory for fast test execution

## Security Considerations

### 1. OAuth 2.0 Security

- **State Parameter**: Generate and validate state parameter to prevent CSRF attacks
- **Code Expiration**: Authorization codes should be used immediately and only once
- **HTTPS Only**: Callback URL must use HTTPS in production
- **Redirect URI Validation**: Validate redirect URI matches configured callback URL

### 2. Credential Storage

- **Secret Encryption**: Store Corp Secret encrypted in database
- **Environment Variables**: Support loading credentials from environment variables
- **Access Control**: Only administrators can view/edit authenticator configurations

### 3. Token Security

- **JWT Best Practices**: Follow NocoBase's JWT token management
- **Token Expiration**: Respect token expiration times
- **Token Blacklist**: Support token revocation via blacklist

### 4. Data Privacy

- **Minimal Data Collection**: Only collect necessary user information from WeCom
- **Data Masking**: Mask sensitive data in logs and error messages
- **GDPR Compliance**: Support user data deletion

### 5. Rate Limiting

- **API Rate Limits**: Respect WeCom API rate limits
- **Retry Strategy**: Implement exponential backoff to avoid overwhelming APIs
- **Circuit Breaker**: Consider implementing circuit breaker pattern for API failures

## Performance Considerations

### 1. Caching

- **User Info Cache**: Cache WeCom user info to reduce API calls (TTL: 5 minutes)
- **Access Token Cache**: Cache access tokens until expiration
- **Configuration Cache**: Cache authenticator configuration in memory

### 2. Async Operations

- **Non-blocking API Calls**: Use async/await for all WeCom API calls
- **Parallel Requests**: Fetch user info and roles in parallel when possible

### 3. Database Optimization

- **Indexes**: Add index on wecomUserId for fast user lookup
- **Connection Pooling**: Use NocoBase's database connection pool

### 4. Client-Side Performance

- **Lazy Loading**: Lazy load QR code component
- **Code Splitting**: Split client code to reduce initial bundle size

## Deployment Considerations

### 1. Environment Configuration

Required environment variables:
```bash
# Optional: Override authenticator configuration
WECOM_CORP_ID=your_corp_id
WECOM_AGENT_ID=your_agent_id
WECOM_SECRET=your_secret
WECOM_CALLBACK_URL=https://your-domain.com/api/auth:wecom/callback
```

### 2. WeCom Application Setup

Administrators need to:
1. Create an application in WeCom admin console
2. Configure OAuth redirect URI (callback URL)
3. Obtain Corp ID, Agent ID, and Secret
4. Configure trusted IP addresses (if required)

### 3. Database Migration

The plugin will automatically:
- Add wecomUserId, wecomOpenId, wecomUnionId fields to users table
- Create indexes for performance
- Handle existing users gracefully

### 4. Monitoring

Recommended monitoring:
- Authentication success/failure rates
- WeCom API response times
- Error rates by type
- User creation rates

## Future Enhancements

### 1. Advanced Features

- **Mobile Support**: Support WeCom mobile app deep linking
- **Department Sync**: Sync WeCom department structure to NocoBase roles
- **Profile Sync**: Periodic sync of user profile updates from WeCom
- **Multi-Corp Support**: Support multiple WeCom corporations

### 2. User Experience

- **Remember Device**: Remember trusted devices to skip QR code
- **Account Linking**: Allow existing users to link WeCom accounts
- **Unlink Support**: Allow users to unlink WeCom accounts

### 3. Administration

- **Audit Logs**: Detailed audit logs for WeCom authentications
- **Analytics Dashboard**: Dashboard showing WeCom login statistics
- **Bulk User Import**: Import users from WeCom directory

### 4. Security Enhancements

- **Two-Factor Authentication**: Combine WeCom with additional 2FA
- **IP Whitelisting**: Restrict WeCom logins to specific IP ranges
- **Session Management**: Advanced session management and device tracking
