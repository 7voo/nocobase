/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

/**
 * Detect if the current environment is WeCom (Enterprise WeChat) client
 *
 * Checks the User-Agent string for WeCom identifiers:
 * - wxwork: WeCom desktop/mobile client
 * - MicroMessenger: WeChat/WeCom browser
 *
 * @returns true if running in WeCom environment, false otherwise
 *
 * Requirement 9.1: Detect WeCom environment
 */
export function isWeComEnvironment(): boolean {
  if (typeof window === 'undefined' || !window.navigator) {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();

  // Check for WeCom specific identifiers
  // wxwork: WeCom client (both desktop and mobile)
  // Note: WeCom mobile client also includes "MicroMessenger" in UA
  const isWxWork = userAgent.includes('wxwork');

  return isWxWork;
}

/**
 * Get the login type based on current environment
 *
 * @returns 'oauth' if in WeCom environment, 'qrcode' otherwise
 *
 * Requirement 9.2, 9.3: Return appropriate login type based on environment
 */
export function getLoginType(): 'oauth' | 'qrcode' {
  return isWeComEnvironment() ? 'oauth' : 'qrcode';
}
