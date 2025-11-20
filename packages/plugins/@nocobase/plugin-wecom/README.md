# @nocobase/plugin-wecom

WeCom (Enterprise WeChat) authentication plugin for NocoBase.

## Features

- **WeCom QR Code Login**: Users can scan QR codes with their WeCom mobile app to sign in
- **Automatic User Creation**: First-time users are automatically registered with their WeCom identity
- **User Account Binding**: Existing users can bind their WeCom accounts for seamless authentication
- **Multi-language Support**: Full internationalization support for Chinese (zh-CN) and English (en-US)
- **Admin Configuration Interface**: Easy-to-use settings panel for administrators
- **Secure OAuth 2.0 Flow**: Industry-standard OAuth 2.0 authentication with CSRF protection
- **Error Handling**: Comprehensive error handling with retry logic and user-friendly messages
- **Sensitive Data Protection**: Automatic masking of sensitive information in logs

## Installation

### Via NocoBase Plugin Manager (Recommended)

1. Log in to your NocoBase application as an administrator
2. Navigate to **Plugin Manager**
3. Search for "WeCom" or "@nocobase/plugin-wecom"
4. Click **Install** and then **Enable**

### Via npm

```bash
npm install @nocobase/plugin-wecom
```

### Via yarn

```bash
yarn add @nocobase/plugin-wecom
```

After installation, restart your NocoBase application.

## WeCom Application Setup

Before configuring the plugin in NocoBase, you need to set up an application in your WeCom admin console:

### Step 1: Create a WeCom Application

1. Log in to your [WeCom Admin Console](https://work.weixin.qq.com/wework_admin/frame)
2. Navigate to **Applications & Mini Programs** > **Applications**
3. Click **Create Application**
4. Fill in the application details:
   - **Application Name**: e.g., "NocoBase Login"
   - **Application Logo**: Upload your logo
   - **Visible Range**: Select which users can use this application
5. Click **Create**

### Step 2: Configure OAuth Settings

1. In your newly created application, go to **Web Authorization and JS-SDK**
2. Set the **Trusted Domain** to your NocoBase domain (e.g., `your-domain.com`)
3. Note down the following information (you'll need these for NocoBase configuration):
   - **Corp ID**: Found in **My Enterprise** > **Enterprise Information**
   - **Agent ID**: Found in your application details
   - **Secret**: Found in your application details (click "View" to reveal)

### Step 3: Set Callback URL

The callback URL will be:
```
https://your-domain.com/api/wecom:callback
```

Make sure this URL is accessible from the internet and matches your NocoBase installation URL.

## Configuration in NocoBase

### Step 1: Enable the Plugin

1. Navigate to **Plugin Manager**
2. Find **@nocobase/plugin-wecom**
3. Click **Enable**

### Step 2: Create WeCom Authenticator

1. Navigate to **Settings** > **Authentication**
2. Click **Add New** authenticator
3. Select **WeCom** as the authentication type
4. Fill in the configuration:

| Field | Description | Required |
|-------|-------------|----------|
| **Name** | Unique identifier for this authenticator (e.g., "wecom") | Yes |
| **Corp ID** | Your WeCom enterprise ID | Yes |
| **Agent ID** | Your WeCom application ID | Yes |
| **Secret** | Your WeCom application secret | Yes |
| **Callback URL** | OAuth redirect URI (auto-generated, copy to WeCom console) | Yes |
| **Auto Signup** | Allow automatic user registration on first login | Yes |
| **Default Role** | Default role assigned to new users (optional) | No |

5. Click **Save**
6. Copy the **Callback URL** and add it to your WeCom application's trusted domains

### Step 3: Enable the Authenticator

1. Toggle the **Enabled** switch for your WeCom authenticator
2. The WeCom login option will now appear on your login page

## Configuration Options

### Public Options

These options are visible to the client and control user registration behavior:

- **autoSignup** (boolean): Whether to automatically create user accounts for first-time WeCom users
  - `true`: New users are automatically registered (recommended)
  - `false`: Only existing users can log in via WeCom

- **defaultRole** (string, optional): The role name to assign to newly created users
  - If not specified, users are created without any roles
  - Example: `"member"`, `"user"`, `"employee"`

### Private Options

These options are only accessible on the server and contain sensitive credentials:

- **corpId** (string): Your WeCom enterprise ID
- **agentId** (string): Your WeCom application ID
- **secret** (string): Your WeCom application secret
- **callbackUrl** (string): The OAuth callback URL for your NocoBase installation

## Usage

### For End Users

1. Navigate to your NocoBase login page
2. Click on the **WeCom** login option
3. A QR code will be displayed
4. Open your WeCom mobile app
5. Scan the QR code
6. Confirm the login on your mobile device
7. You will be automatically logged in to NocoBase

### For Administrators

#### Managing Authenticators

- **View Authenticators**: Settings > Authentication
- **Edit Configuration**: Click the edit icon next to the authenticator
- **Enable/Disable**: Toggle the enabled switch
- **Delete**: Click the delete icon (users with WeCom bindings will need to use alternative login methods)

#### Monitoring

Check your NocoBase logs for authentication events:
- Successful logins are logged at INFO level
- Failed authentication attempts are logged at ERROR level
- Sensitive data (tokens, secrets) are automatically masked in logs

## Troubleshooting

### QR Code Not Displaying

**Problem**: The WeCom QR code doesn't appear on the login page.

**Solutions**:
1. Verify the authenticator is enabled in Settings > Authentication
2. Check browser console for JavaScript errors
3. Ensure the plugin is properly installed and loaded
4. Clear browser cache and reload the page

### "Authenticator not found or disabled" Error

**Problem**: Error message when trying to authenticate.

**Solutions**:
1. Verify the authenticator is enabled
2. Check that the authenticator name matches the one configured
3. Restart your NocoBase application

### "Invalid state parameter" Error

**Problem**: CSRF protection error during callback.

**Solutions**:
1. Ensure cookies are enabled in your browser
2. Check that your NocoBase session configuration is correct
3. Verify the callback URL matches exactly (including protocol and domain)
4. Try clearing browser cookies and attempting login again

### "Authorization code is required" Error

**Problem**: OAuth callback missing authorization code.

**Solutions**:
1. Verify the callback URL is correctly configured in WeCom admin console
2. Check that the callback URL is accessible from the internet
3. Ensure the WeCom application is properly configured with correct trusted domains

### User Not Created Automatically

**Problem**: First-time users are not being registered.

**Solutions**:
1. Verify **autoSignup** is set to `true` in authenticator configuration
2. Check NocoBase logs for error messages during user creation
3. Verify database permissions allow user creation
4. Check that required user fields are being populated from WeCom data

### WeCom API Errors

**Problem**: Errors when communicating with WeCom API.

**Solutions**:
1. Verify Corp ID, Agent ID, and Secret are correct
2. Check that your WeCom application is not suspended or disabled
3. Verify your server can reach WeCom API endpoints (check firewall rules)
4. Check WeCom API rate limits (the plugin includes automatic retry logic)
5. Review WeCom admin console for any application restrictions

### Token Expiration Issues

**Problem**: Users are logged out unexpectedly.

**Solutions**:
1. Check NocoBase JWT token expiration settings
2. Verify session configuration in NocoBase
3. Review WeCom access token caching (tokens are cached for 2 hours by default)

### Network Errors

**Problem**: Intermittent connection failures to WeCom API.

**Solutions**:
1. The plugin automatically retries failed requests up to 3 times with exponential backoff
2. Check your server's internet connectivity
3. Verify DNS resolution for WeCom API domains
4. Check for any proxy or firewall blocking WeCom API endpoints

## API Documentation

See [API.md](./API.md) for detailed API documentation.

## Security Considerations

- **HTTPS Required**: Always use HTTPS in production for callback URLs
- **State Parameter**: CSRF protection is automatically handled via state parameter validation
- **Sensitive Data**: Secrets and tokens are automatically masked in logs
- **Token Security**: Access tokens are cached securely and expire after 2 hours
- **User Data**: Only necessary user information is collected from WeCom

## Requirements

- NocoBase >= 2.0.0
- WeCom enterprise account
- Node.js >= 18.0.0
- HTTPS-enabled domain (for production)

## Development

### Building

```bash
yarn build
```

### Testing

```bash
yarn test
```

## Support

- **Documentation**: [NocoBase Docs](https://docs.nocobase.com/)
- **Issues**: [GitHub Issues](https://github.com/nocobase/nocobase/issues)
- **Community**: [NocoBase Forum](https://forum.nocobase.com/)

## License

This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.

For more information, please refer to: https://www.nocobase.com/agreement

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.
