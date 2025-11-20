# WeCom Plugin API Documentation

This document describes the API endpoints and configuration schema for the @nocobase/plugin-wecom plugin.

## Table of Contents

- [Endpoints](#endpoints)
  - [GET /api/wecom:getAuthUrl](#get-apiwecomgetauthurl)
  - [POST /api/wecom:callback](#post-apiwecomcallback)
- [Configuration Schema](#configuration-schema)
- [Data Models](#data-models)
- [Error Codes](#error-codes)

## Endpoints

### GET /api/wecom:getAuthUrl

Generates a WeCom OAuth 2.0 authorization URL for initiating the login flow.

#### Request

**Method**: `GET`

**URL**: `/api/wecom:getAuthUrl`

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `authenticator` | string | No | Name of the authenticator to use (default: "wecom") |

**Headers**:
- None required (public endpoint)

**Example Request**:

```bash
curl -X GET "https://your-domain.com/api/wecom:getAuthUrl?authenticator=wecom"
```

#### Response

**Success Response** (200 OK):

```json
{
  "data": {
    "authUrl": "https://open.weixin.qq.com/connect/oauth2/authorize?appid=CORP_ID&redirect_uri=https%3A%2F%2Fyour-domain.com%2Fapi%2Fwecom%3Acallback&response_type=code&scope=snsapi_base&agentid=AGENT_ID&state=abc123def456",
    "state": "abc123def456"
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `data.authUrl` | string | Complete OAuth authorization URL for WeCom |
| `data.state` | string | CSRF protection token (stored in session) |

**Error Responses**:

- **404 Not Found**: Authenticator not found or disabled
  ```json
  {
    "errors": [
      {
        "message": "Authenticator not found or disabled"
      }
    ]
  }
  ```

- **500 Internal Server Error**: Failed to generate authorization URL
  ```json
  {
    "errors": [
      {
        "message": "Failed to generate authorization URL"
      }
    ]
  }
  ```

#### Implementation Details

1. Retrieves the authenticator configuration from the database
2. Generates a random state parameter for CSRF protection
3. Stores the state in the user's session
4. Constructs the WeCom OAuth URL with required parameters:
   - `appid`: Corp ID from configuration
   - `redirect_uri`: Callback URL from configuration
   - `response_type`: Always "code"
   - `scope`: Always "snsapi_base"
   - `agentid`: Agent ID from configuration
   - `state`: Generated CSRF token

**Requirements**: 2.2, 2.3

---

### POST /api/wecom:callback

Handles the OAuth callback from WeCom after user authorization.

#### Request

**Method**: `POST`

**URL**: `/api/wecom:callback`

**Body Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Authorization code from WeCom |
| `state` | string | Yes | CSRF protection token (must match session) |
| `authenticator` | string | No | Name of the authenticator (default: "wecom") |

**Headers**:
- `Cookie`: Session cookie (required for state validation)

**Example Request**:

```bash
curl -X POST "https://your-domain.com/api/wecom:callback" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-id" \
  -d '{
    "code": "authorization_code_from_wecom",
    "state": "abc123def456",
    "authenticator": "wecom"
  }'
```

#### Response

**Success Response** (200 OK):

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "nickname": "Zhang San",
      "email": "zhangsan@example.com",
      "phone": "13800138000"
    }
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `data.token` | string | JWT token for authenticated session |
| `data.user.id` | number | User ID in NocoBase |
| `data.user.nickname` | string | User's display name |
| `data.user.email` | string \| null | User's email address |
| `data.user.phone` | string \| null | User's phone number |

**Error Responses**:

- **400 Bad Request**: Missing or invalid parameters
  ```json
  {
    "errors": [
      {
        "message": "Authorization code is required"
      }
    ]
  }
  ```

- **400 Bad Request**: State parameter mismatch (CSRF protection)
  ```json
  {
    "errors": [
      {
        "message": "Invalid state parameter"
      }
    ]
  }
  ```

- **401 Unauthorized**: Authentication failed
  ```json
  {
    "errors": [
      {
        "message": "Authentication failed"
      }
    ]
  }
  ```

- **404 Not Found**: Authenticator not found or disabled
  ```json
  {
    "errors": [
      {
        "message": "Authenticator not found or disabled"
      }
    ]
  }
  ```

- **500 Internal Server Error**: Server error during authentication
  ```json
  {
    "errors": [
      {
        "message": "Authentication failed. Please try again."
      }
    ]
  }
  ```

#### Implementation Details

1. Validates required parameters (code, state)
2. Validates state parameter against session (CSRF protection)
3. Retrieves authenticator configuration
4. Exchanges authorization code for access token with WeCom API
5. Retrieves user information from WeCom API using access token
6. Creates new user or authenticates existing user based on WeCom user ID
7. Generates JWT token for NocoBase session
8. Returns token and user information

**Authentication Flow**:

```
Client → NocoBase → WeCom API
  1. POST /api/wecom:callback with code
  2. Exchange code for access_token
  3. Get user info with access_token
  4. Create/authenticate user
  5. Generate JWT token
  6. Return token to client
```

**Requirements**: 3.1, 5.2, 5.3

---

## Configuration Schema

### Authenticator Configuration

The WeCom authenticator configuration is stored in the `authenticators` collection with the following schema:

```typescript
{
  name: string;              // Unique authenticator name
  authType: "wecom";         // Authentication type
  enabled: boolean;          // Whether authenticator is enabled
  options: {
    // Public options (visible to client)
    public: {
      autoSignup: boolean;   // Allow automatic user registration
      defaultRole?: string;  // Default role for new users (optional)
    };
    // Private options (server-only)
    corpId: string;          // WeCom Corp ID
    agentId: string;         // WeCom Agent ID
    secret: string;          // WeCom Secret
    callbackUrl: string;     // OAuth callback URL
  };
}
```

### Configuration Fields

#### Public Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `public.autoSignup` | boolean | Yes | `true` | Whether to automatically create user accounts for first-time WeCom users |
| `public.defaultRole` | string | No | `null` | Role name to assign to newly created users |

#### Private Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `corpId` | string | Yes | WeCom enterprise ID (found in WeCom admin console) |
| `agentId` | string | Yes | WeCom application ID (found in application settings) |
| `secret` | string | Yes | WeCom application secret (found in application settings) |
| `callbackUrl` | string | Yes | OAuth redirect URI (must match WeCom application configuration) |

### Example Configuration

```json
{
  "name": "wecom",
  "authType": "wecom",
  "enabled": true,
  "options": {
    "public": {
      "autoSignup": true,
      "defaultRole": "member"
    },
    "corpId": "ww1234567890abcdef",
    "agentId": "1000002",
    "secret": "your_secret_here",
    "callbackUrl": "https://your-domain.com/api/wecom:callback"
  }
}
```

### Validation Rules

1. **Required Fields**: `corpId`, `agentId`, `secret`, `callbackUrl`, and `public.autoSignup` must be provided
2. **Corp ID Format**: Must start with "ww" followed by alphanumeric characters
3. **Agent ID Format**: Must be a numeric string
4. **Callback URL Format**: Must be a valid HTTPS URL (HTTP allowed only in development)
5. **Default Role**: Must reference an existing role name in the system (if provided)

**Requirements**: 1.2, 1.4, 7.3

---

## Data Models

### User WeCom Binding

User accounts are extended with WeCom-specific fields:

```typescript
{
  id: number;                // User ID
  nickname: string;          // User display name
  email?: string;            // User email
  phone?: string;            // User phone
  // WeCom-specific fields
  wecomUserId?: string;      // WeCom user ID (unique)
  wecomOpenId?: string;      // WeCom OpenID
  wecomUnionId?: string;     // WeCom UnionID (if available)
}
```

### WeCom User Info

User information retrieved from WeCom API:

```typescript
{
  userid: string;            // WeCom user ID (required)
  name: string;              // User display name (required)
  mobile?: string;           // Mobile phone number
  email?: string;            // Email address
  avatar?: string;           // Avatar URL
  department?: number[];     // Department IDs
  position?: string;         // Job position
  gender?: string;           // Gender ("1" = male, "2" = female)
  status?: number;           // Account status
}
```

### Field Mapping

WeCom user data is mapped to NocoBase user fields as follows:

| WeCom Field | NocoBase Field | Notes |
|-------------|----------------|-------|
| `userid` | `wecomUserId` | Unique identifier for binding |
| `name` | `nickname` | User display name |
| `email` | `email` | Email address (if available) |
| `mobile` | `phone` | Phone number (if available) |

**Requirements**: 4.2, 4.3

---

## Error Codes

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 401 | Unauthorized (authentication failed) |
| 404 | Not Found (authenticator not found) |
| 500 | Internal Server Error |

### WeCom API Error Codes

The plugin handles the following WeCom API error codes:

| Error Code | Description | Handling |
|------------|-------------|----------|
| 0 | Success | Continue processing |
| 40001 | Invalid secret | Return error to user |
| 40013 | Invalid Corp ID | Return error to user |
| 40014 | Invalid access token | Retry token request |
| 40029 | Invalid authorization code | Return error to user |
| 41001 | Missing access token | Retry token request |
| 42001 | Access token expired | Retry token request |
| 42007 | User access token expired | Return error to user |
| 42009 | Authorization code expired | Return error to user |
| 45009 | API rate limit exceeded | Retry with exponential backoff |

### Error Response Format

All error responses follow this format:

```json
{
  "errors": [
    {
      "message": "User-friendly error message",
      "code": "ERROR_CODE",
      "details": {}
    }
  ]
}
```

### Common Error Messages

| Message | Cause | Solution |
|---------|-------|----------|
| "Authorization code is required" | Missing `code` parameter | Ensure WeCom callback includes authorization code |
| "State parameter is required" | Missing `state` parameter | Ensure WeCom callback includes state parameter |
| "Invalid state parameter" | State mismatch (CSRF) | Clear cookies and try again |
| "Authenticator not found or disabled" | Invalid authenticator name or disabled | Check authenticator configuration |
| "Authentication failed" | General authentication error | Check logs for details |
| "Failed to generate authorization URL" | Configuration error | Verify authenticator configuration |

**Requirements**: 6.1, 6.2

---

## Security Considerations

### CSRF Protection

- State parameter is generated for each authorization request
- State is stored in server-side session
- State is validated on callback to prevent CSRF attacks

### Token Security

- Access tokens are never exposed to the client
- JWT tokens follow NocoBase security standards
- Tokens expire according to NocoBase configuration

### Data Privacy

- Sensitive data (secrets, tokens) are masked in logs
- Only necessary user information is collected from WeCom
- User data is stored securely in the database

### HTTPS Requirement

- Callback URLs must use HTTPS in production
- HTTP is only allowed in development environments

**Requirements**: 6.5

---

## Rate Limiting

### WeCom API Limits

WeCom API has the following rate limits:

- **Access Token**: 2000 requests per day per application
- **User Info**: 10000 requests per day per application

### Plugin Handling

The plugin implements the following strategies to handle rate limits:

1. **Token Caching**: Access tokens are cached for 2 hours (7200 seconds)
2. **Retry Logic**: Failed requests are retried up to 3 times with exponential backoff
3. **Error Handling**: Rate limit errors (45009) trigger automatic retry

**Requirements**: 6.4

---

## Integration Examples

### Frontend Integration

#### React Example

```typescript
import { useRequest } from '@nocobase/client';

function WeComLogin() {
  const { data, loading, run } = useRequest({
    url: '/api/wecom:getAuthUrl',
    params: { authenticator: 'wecom' },
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <QRCode value={data?.data?.authUrl} />
    </div>
  );
}
```

#### Handling Callback

```typescript
import { useNavigate } from 'react-router-dom';
import { useRequest } from '@nocobase/client';

function WeComCallback() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');

  const { run } = useRequest({
    url: '/api/wecom:callback',
    method: 'post',
    data: { code, state, authenticator: 'wecom' },
    onSuccess: (data) => {
      // Store token
      localStorage.setItem('token', data.data.token);
      // Redirect to home
      navigate('/');
    },
    onError: (error) => {
      console.error('Authentication failed:', error);
    },
  });

  useEffect(() => {
    if (code && state) {
      run();
    }
  }, [code, state]);

  return <div>Authenticating...</div>;
}
```

### Backend Integration

#### Custom User Creation Logic

```typescript
import { WeComAuth } from '@nocobase/plugin-wecom/server';

// Extend WeComAuth to customize user creation
class CustomWeComAuth extends WeComAuth {
  async createOrBindUser(wecomUserInfo) {
    // Custom logic before user creation
    const user = await super.createOrBindUser(wecomUserInfo);
    
    // Custom logic after user creation
    // e.g., send welcome email, assign to specific department
    
    return user;
  }
}
```

---

## Testing

### Testing Endpoints

Use the following curl commands to test the endpoints:

#### Test getAuthUrl

```bash
curl -X GET "http://localhost:13000/api/wecom:getAuthUrl?authenticator=wecom" \
  -H "Accept: application/json"
```

#### Test callback (requires valid code from WeCom)

```bash
curl -X POST "http://localhost:13000/api/wecom:callback" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your-session-id" \
  -d '{
    "code": "valid_authorization_code",
    "state": "state_from_session",
    "authenticator": "wecom"
  }'
```

### Mock Testing

For testing without actual WeCom integration, you can mock the WeCom API responses:

```typescript
import { vi } from 'vitest';
import { WeComAuthService } from '@nocobase/plugin-wecom/server';

// Mock WeCom API
vi.mock('axios', () => ({
  default: {
    get: vi.fn((url) => {
      if (url.includes('gettoken')) {
        return Promise.resolve({
          data: {
            errcode: 0,
            errmsg: 'ok',
            access_token: 'mock_access_token',
            expires_in: 7200,
          },
        });
      }
      if (url.includes('getuserinfo')) {
        return Promise.resolve({
          data: {
            errcode: 0,
            errmsg: 'ok',
            userid: 'test_user',
            name: 'Test User',
            email: 'test@example.com',
          },
        });
      }
    }),
  },
}));
```

---

## Changelog

### Version 1.0.0

- Initial release
- WeCom OAuth 2.0 authentication
- Automatic user creation
- Multi-language support (zh-CN, en-US)
- Admin configuration interface

---

## Support

For issues, questions, or contributions:

- **GitHub Issues**: https://github.com/nocobase/nocobase/issues
- **Documentation**: https://docs.nocobase.com/
- **Forum**: https://forum.nocobase.com/

---

## License

This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.

For more information, please refer to: https://www.nocobase.com/agreement
