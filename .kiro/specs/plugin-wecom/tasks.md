# Implementation Plan

- [x] 1. Set up plugin structure and core configuration
  - Create plugin directory structure following NocoBase conventions
  - Set up package.json with dependencies (axios for HTTP requests, fast-check for property testing)
  - Create server and client entry files
  - Define TypeScript interfaces for WeCom configuration and user info
  - _Requirements: 1.1, 1.2_

- [x] 2. Implement server-side WeCom API service
  - [x] 2.1 Create WeComAuthService class
    - Implement getAuthorizationUrl() method to generate OAuth URL
    - Implement getAccessToken() method to exchange code for token
    - Implement getUserInfo() method to fetch user data from WeCom API
    - Implement retry logic with exponential backoff for network errors
    - _Requirements: 3.2, 3.3, 6.4_

  - [ ]* 2.2 Write property test for authorization URL generation
    - **Property 2: Authorization URL contains required parameters**
    - **Property 3: Authorization URL includes callback URL**
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 2.3 Write property test for retry logic
    - **Property 19: Network error retry with exponential backoff**
    - **Validates: Requirements 6.4**

  - [ ]* 2.4 Write unit tests for WeComAuthService
    - Test getAccessToken with mocked API responses
    - Test getUserInfo with mocked API responses
    - Test error handling for various API error codes
    - _Requirements: 3.2, 3.3, 6.2_

- [x] 3. Implement WeComAuth authentication class
  - [x] 3.1 Create WeComAuth class extending BaseAuth
    - Implement validate() method to handle OAuth callback
    - Implement getAccessToken() wrapper method
    - Implement getUserInfo() wrapper method
    - Implement createOrBindUser() method for user management
    - _Requirements: 3.1, 3.4, 4.1, 5.1_

  - [ ]* 3.2 Write property test for user identifier extraction
    - **Property 6: User identifier extraction from API response**
    - **Validates: Requirements 3.4**

  - [ ]* 3.3 Write property test for new user creation
    - **Property 8: New user creation for unmatched WeCom users**
    - **Property 9: WeCom identifier uniqueness**
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 3.4 Write property test for user field population
    - **Property 10: User field population from WeCom data**
    - **Validates: Requirements 4.3**

  - [ ]* 3.5 Write property test for existing user authentication
    - **Property 13: Existing user authentication**
    - **Validates: Requirements 5.1**

  - [ ]* 3.6 Write unit tests for WeComAuth
    - Test validate() with valid and invalid codes
    - Test createOrBindUser() with new users
    - Test createOrBindUser() with existing users
    - _Requirements: 3.1, 4.1, 5.1_

- [x] 4. Implement database schema extensions
  - [x] 4.1 Create migration to extend users collection
    - Add wecomUserId field with unique constraint
    - Add wecomOpenId field
    - Add wecomUnionId field
    - Create index on wecomUserId for performance
    - _Requirements: 4.2, 4.5_

  - [ ]* 4.2 Write property test for user persistence
    - **Property 12: User persistence verification**
    - **Validates: Requirements 4.5**

- [x] 5. Implement error handling and logging
  - [x] 5.1 Create error handling utilities
    - Implement sensitive data masking function
    - Create error response formatter
    - Implement error logging with appropriate levels
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ]* 5.2 Write property test for error handling
    - **Property 7: Error handling for authorization failures**
    - **Property 16: Invalid authorization code rejection**
    - **Property 17: Graceful API error handling**
    - **Property 18: No side effects on token request failure**
    - **Validates: Requirements 3.5, 6.1, 6.2, 6.3**

  - [ ]* 5.3 Write property test for sensitive data masking
    - **Property 20: Sensitive data masking in logs**
    - **Validates: Requirements 6.5**

- [x] 6. Implement server-side action handlers
  - [x] 6.1 Create callback action handler
    - Handle OAuth callback with authorization code
    - Validate state parameter for CSRF protection
    - Call WeComAuth.validate() to authenticate user
    - Return JWT token and user info
    - _Requirements: 3.1, 5.2, 5.3_

  - [x] 6.2 Create getAuthUrl action handler
    - Generate and return WeCom authorization URL
    - Include state parameter for CSRF protection
    - _Requirements: 2.2, 2.3_

  - [ ]* 6.3 Write property test for JWT token generation
    - **Property 14: JWT token generation for authenticated users**
    - **Property 15: Token response includes user information**
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 6.4 Write unit tests for action handlers
    - Test callback handler with valid code
    - Test callback handler with invalid code
    - Test getAuthUrl handler
    - _Requirements: 3.1, 5.2, 5.3_

- [-] 7. Implement server-side plugin class
  - [x] 7.1 Create PluginWeComServer class
    - Implement load() method to register auth type
    - Register action handlers with resource manager
    - Set up ACL permissions for public endpoints
    - Implement install() method for initial setup
    - _Requirements: 1.1, 1.3, 1.5_

  - [ ]* 7.2 Write property test for configuration validation
    - **Property 1: Required configuration fields validation**
    - **Property 21: Configuration validation on save**
    - **Validates: Requirements 1.4, 7.3**

  - [ ]* 7.3 Write property test for configuration persistence
    - **Property 22: Configuration persistence and retrieval**
    - **Validates: Requirements 7.4**

- [x] 8. Checkpoint - Ensure server-side tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement client-side QR code component
  - [x] 9.1 Create WeComQRCode component
    - Fetch authorization URL from server
    - Display QR code using WeCom JS SDK or QR code library
    - Implement refresh mechanism for expired codes
    - Handle success and error callbacks
    - _Requirements: 2.1, 2.4_

  - [ ]* 9.2 Write unit tests for WeComQRCode
    - Test QR code rendering
    - Test refresh mechanism
    - Test error handling
    - _Requirements: 2.1, 2.4_

- [x] 10. Implement client-side sign-in button component
  - [x] 10.1 Create WeComSignInButton component
    - Render button with WeCom branding
    - Display WeComQRCode on click or inline
    - Handle authentication success (redirect)
    - Handle authentication errors (display message)
    - _Requirements: 2.1, 5.4_

  - [ ]* 10.2 Write unit tests for WeComSignInButton
    - Test button rendering
    - Test click handler
    - Test success handling
    - Test error handling
    - _Requirements: 2.1, 5.4_

- [x] 11. Implement client-side admin settings component
  - [x] 11.1 Create WeComAdminSettings component
    - Create form with fields for Corp ID, Agent ID, Secret
    - Display callback URL for copying
    - Implement form validation
    - Implement save handler
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [ ]* 11.2 Write unit tests for WeComAdminSettings
    - Test form rendering
    - Test form validation
    - Test save handler
    - Test callback URL display
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 12. Implement client-side plugin class
  - [x] 12.1 Create PluginWeComClient class
    - Implement load() method to register auth type
    - Register WeComSignInButton component
    - Register WeComAdminSettings component
    - _Requirements: 1.5, 2.5_

  - [ ]* 12.2 Write property test for UI internationalization
    - **Property 23: UI text internationalization**
    - **Validates: Requirements 8.2, 8.3, 8.5**

- [x] 13. Implement internationalization
  - [x] 13.1 Create translation files
    - Create zh-CN.json with Chinese translations
    - Create en-US.json with English translations
    - Include all UI labels, buttons, and error messages
    - _Requirements: 8.1, 8.4_

  - [x] 13.2 Register translations in plugin
    - Register translations in server plugin
    - Register translations in client plugin
    - _Requirements: 8.1_

- [x] 14. Implement default role assignment
  - [x] 14.1 Add default role configuration to authenticator options
    - Add defaultRole field to public options
    - Implement role assignment in createOrBindUser()
    - _Requirements: 4.4_

  - [ ]* 14.2 Write property test for default role assignment
    - **Property 11: Default role assignment**
    - **Validates: Requirements 4.4**

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Create documentation
  - [x] 16.1 Write README.md
    - Document plugin features
    - Document installation steps
    - Document WeCom application setup
    - Document configuration options
    - Include troubleshooting guide

  - [x] 16.2 Write API documentation
    - Document callback endpoint
    - Document getAuthUrl endpoint
    - Document configuration schema

- [x] 17. Build and package plugin
  - Run build command to compile TypeScript
  - Run package command to create tar.gz
  - Verify package contents
