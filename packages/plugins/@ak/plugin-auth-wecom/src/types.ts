/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

/**
 * WeCom authenticator configuration options
 */
export interface WeComAuthenticatorOptions {
  /**
   * Public configuration (visible to client)
   */
  public: {
    /**
     * Whether to allow automatic user registration
     */
    autoSignup: boolean;
    /**
     * Default role name to assign to new users (optional)
     */
    defaultRole?: string;
  };
  /**
   * Enterprise ID from WeCom
   */
  corpId: string;
  /**
   * Application ID from WeCom
   */
  agentId: string;
  /**
   * Application secret from WeCom
   */
  secret: string;
  /**
   * OAuth callback URL
   */
  callbackUrl: string;
  /**
   * Public port number (optional)
   *
   * Use this when your application is behind a reverse proxy with port mapping.
   * For example, if users access your site via https://example.com:7737
   * but the reverse proxy forwards to port 443 internally, set this to 7737.
   *
   * If not set, the port will be automatically detected from the request.
   * Standard ports (80 for HTTP, 443 for HTTPS) will be omitted from URLs.
   */
  publicPort?: number;
}

/**
 * WeCom user information from API
 */
export interface WeComUserInfo {
  /**
   * WeCom user ID (unique within enterprise)
   */
  userid: string;
  /**
   * User's display name
   */
  name: string;
  /**
   * User's mobile phone number (optional)
   */
  mobile?: string;
  /**
   * User's email address (optional)
   */
  email?: string;
  /**
   * User's avatar URL (optional)
   */
  avatar?: string;
  /**
   * Department IDs the user belongs to (optional)
   */
  department?: number[];
  /**
   * User's position/title (optional)
   */
  position?: string;
  /**
   * User's gender (optional)
   */
  gender?: string;
  /**
   * User's status (optional)
   */
  status?: number;
}

/**
 * WeCom API configuration
 */
export interface WeComConfig {
  /**
   * Enterprise ID
   */
  corpId: string;
  /**
   * Application ID
   */
  agentId: string;
  /**
   * Application secret
   */
  secret: string;
}

/**
 * WeCom access token response
 */
export interface WeComAccessTokenResponse {
  /**
   * Error code (0 means success)
   */
  errcode: number;
  /**
   * Error message
   */
  errmsg: string;
  /**
   * Access token
   */
  access_token?: string;
  /**
   * Token expiration time in seconds
   */
  expires_in?: number;
}

/**
 * WeCom user info API response
 */
export interface WeComUserInfoResponse {
  /**
   * Error code (0 means success)
   */
  errcode: number;
  /**
   * Error message
   */
  errmsg: string;
  /**
   * User ID
   */
  userid?: string;
  /**
   * User name
   */
  name?: string;
  /**
   * Mobile phone
   */
  mobile?: string;
  /**
   * Email
   */
  email?: string;
  /**
   * Avatar URL
   */
  avatar?: string;
  /**
   * Department list
   */
  department?: number[];
  /**
   * Position
   */
  position?: string;
  /**
   * Gender
   */
  gender?: string;
  /**
   * Status
   */
  status?: number;
}

/**
 * User binding data for WeCom
 */
export interface UserWeComBinding {
  /**
   * WeCom user ID
   */
  wecomUserId?: string;
  /**
   * WeCom OpenID
   */
  wecomOpenId?: string;
  /**
   * WeCom UnionID (if available)
   */
  wecomUnionId?: string;
}

/**
 * Login type for WeCom authentication
 */
export type WeComLoginType = 'qrcode' | 'oauth';
