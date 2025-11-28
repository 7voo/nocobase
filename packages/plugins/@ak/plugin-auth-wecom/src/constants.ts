/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

// @ts-ignore
import { name } from '../package.json';

/**
 * Authentication type identifier for WeCom
 */
export const authType = 'WeCom';

/**
 * Plugin namespace
 */
export const namespace = name;

/**
 * Login type enum
 */
export enum LoginType {
  /**
   * PC QR code login
   */
  QRCODE = 'qrcode',
  /**
   * OAuth2.0 login (for WeCom mobile client)
   */
  OAUTH = 'oauth',
}

/**
 * WeCom API endpoints
 */
export const WECOM_API = {
  /**
   * Base URL for WeCom API
   */
  BASE_URL: 'https://qyapi.weixin.qq.com',
  /**
   * Get access token endpoint
   */
  GET_TOKEN: '/cgi-bin/gettoken',
  /**
   * Get user info endpoint (used after OAuth2.0 authorization)
   */
  GET_USER_INFO: '/cgi-bin/auth/getuserinfo',
  /**
   * Get user detail endpoint
   */
  GET_USER_DETAIL: '/cgi-bin/user/get',
  /**
   * OAuth authorization endpoint for PC QR code login
   */
  QRCODE_AUTHORIZE: 'https://open.work.weixin.qq.com/wwopen/sso/qrConnect',
  /**
   * OAuth2.0 authorization endpoint for mobile client login
   */
  OAUTH2_AUTHORIZE: 'https://open.weixin.qq.com/connect/oauth2/authorize',
};

/**
 * OAuth2.0 scope types
 */
export const OAUTH_SCOPE = {
  /**
   * Base scope - get basic user info (UserId)
   */
  BASE: 'snsapi_base',
  /**
   * Private info scope - get detailed user info (requires user confirmation)
   */
  PRIVATE_INFO: 'snsapi_privateinfo',
};

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  /**
   * Maximum number of retry attempts
   */
  MAX_RETRIES: 3,
  /**
   * Initial retry delay in milliseconds
   */
  INITIAL_DELAY: 1000,
  /**
   * Backoff multiplier for exponential backoff
   */
  BACKOFF_MULTIPLIER: 2,
};

/**
 * Token cache configuration
 */
export const TOKEN_CACHE = {
  /**
   * Access token cache duration in seconds (2 hours)
   */
  EXPIRES_IN: 7200,
};

/**
 * API timeout configuration
 */
export const API_TIMEOUT = {
  /**
   * Request timeout in milliseconds (30 seconds)
   */
  REQUEST_TIMEOUT: 30000,
};
