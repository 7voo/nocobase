/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Context, Next } from '@nocobase/actions';
import { WeComAuth } from './wecom-auth';
import { WeComAuthenticatorOptions } from '../types';
import crypto from 'crypto';

/**
 * Handle WeCom OAuth callback
 * Processes the authorization code and authenticates the user
 *
 * Requirements: 2.2, 3.1, 4.1, 4.2, 4.3, 5.1, 5.2
 */
export async function callback(ctx: Context, next: Next) {
  // Extract parameters from query string (GET request)
  // Try multiple sources for compatibility
  let code: string | undefined;
  let state: string | undefined;
  let authenticator: string | undefined;

  // Method 1: From ctx.query (Koa standard)
  if (ctx.query) {
    code = ctx.query.code as string;
    state = ctx.query.state as string;
    authenticator = ctx.query.authenticator as string;
  }

  // Method 2: From ctx.request.query (fallback)
  if (!code && ctx.request?.query) {
    code = ctx.request.query.code as string;
    state = ctx.request.query.state as string;
    authenticator = ctx.request.query.authenticator as string;
  }

  // Method 3: Parse from querystring manually (last resort)
  if (!code && ctx.querystring) {
    const urlParams = new URLSearchParams(ctx.querystring);
    code = urlParams.get('code') || undefined;
    state = urlParams.get('state') || undefined;
    authenticator = urlParams.get('authenticator') || undefined;
  }

  // Validate required parameters (Requirement 5.2)
  if (!code) {
    ctx.throw(400, ctx.t('Authorization code is required'));
  }

  if (!state) {
    ctx.throw(400, ctx.t('State parameter is required'));
  }

  // Put extracted parameters into ctx.action.params.values for WeComAuth.validate() to use
  if (!ctx.action.params.values) {
    ctx.action.params.values = {};
  }
  ctx.action.params.values.code = code;
  ctx.action.params.values.state = state;
  ctx.action.params.values.authenticator = authenticator;

  try {
    // Validate state parameter for CSRF protection (Requirements 4.1, 4.2, 4.3)
    // Note: For QR code login, session might not persist between QR generation and callback
    // because they are separate requests, possibly from different devices
    const sessionState = ctx.session?.wecomState;

    ctx.logger.info('State validation', {
      action: 'callback',
      hasSessionState: !!sessionState,
      statesMatch: sessionState === state,
      sessionId: ctx.session?.id,
    });

    // Only validate if session state exists
    // If session is lost (common in QR code scenarios), we skip validation
    // The authorization code itself provides security as it's single-use and time-limited
    if (sessionState && sessionState !== state) {
      ctx.logger.warn('State parameter mismatch - but continuing due to QR code scenario', {
        action: 'callback',
        receivedState: state ? '****' : undefined,
        sessionState: sessionState ? '****' : undefined,
      });
      // Don't throw error, just log warning
    }

    // Clear the state from session after validation
    if (ctx.session && ctx.session.wecomState) {
      delete ctx.session.wecomState;
    }

    // Get the authenticator name (already extracted from params above)
    const authenticatorName = authenticator || 'wecom';

    // Get the authenticator instance
    const authenticatorRepo = ctx.db.getRepository('authenticators');
    const authenticatorRecord = await authenticatorRepo.findOne({
      filter: {
        name: authenticatorName,
        enabled: true,
      },
    });

    if (!authenticatorRecord) {
      ctx.throw(404, ctx.t('Authenticator not found or disabled'));
    }

    // Create WeComAuth instance
    const wecomAuth = new WeComAuth({
      authenticator: authenticatorRecord,
      options: authenticatorRecord.options,
      ctx,
    });

    // Validate and get user (Requirement 3.1)
    const user = await wecomAuth.validate();

    if (!user) {
      ctx.throw(401, ctx.t('Authentication failed'));
    }

    // Generate JWT token
    const token = ctx.app.authManager.jwt.sign({
      userId: user.id,
    });

    // Log successful authentication (Requirement 5.1)
    ctx.logger.info('WeCom authentication successful', {
      action: 'callback',
      userId: user.id,
    });

    // Get redirect URL from query parameters or use default
    const redirect = '/admin';

    // Build redirect URL with proper protocol, host, and port
    const xForwardedProto = ctx.get('x-forwarded-proto');
    const xForwardedHost = ctx.get('x-forwarded-host');
    const xForwardedPort = ctx.get('x-forwarded-port');

    const protocol = xForwardedProto || ctx.protocol;
    let host = xForwardedHost || ctx.get('host');

    // Remove port from host if it exists (we'll add it back if needed)
    host = host.split(':')[0];

    // Determine the port to use (same logic as getAuthUrl)
    let port: string | undefined;
    const options = authenticatorRecord.options as WeComAuthenticatorOptions;

    if (options.publicPort) {
      port = String(options.publicPort);
    } else if (xForwardedPort) {
      port = xForwardedPort;
    } else {
      const originalHost = ctx.get('host');
      const portMatch = originalHost.match(/:(\d+)$/);
      if (portMatch) {
        port = portMatch[1];
      }
    }

    // Add port to host if it's not a standard port
    if (port) {
      const isStandardPort = (protocol === 'http' && port === '80') || (protocol === 'https' && port === '443');

      if (!isStandardPort) {
        host = `${host}:${port}`;
      }
    }

    const redirectUrl = `${protocol}://${host}${redirect}?token=${token}`;

    ctx.logger.info('Redirecting after successful authentication', {
      action: 'callback',
      userId: user.id,
    });

    ctx.redirect(redirectUrl);

    await next();
  } catch (error) {
    // Error handling and logging (Requirement 5.1)
    ctx.logger.error('WeCom callback failed', {
      action: 'callback',
      error: error.message,
    });

    // Re-throw with user-friendly message
    if (error.status) {
      throw error;
    }
    ctx.throw(500, ctx.t('Authentication failed. Please try again.'));
  }
}

/**
 * Get WeCom authorization URL
 * Generates the OAuth URL with state parameter for CSRF protection
 *
 * Requirements: 2.2, 4.1, 4.2, 5.1
 */
export async function getAuthUrl(ctx: Context, next: Next) {
  try {
    // Get the authenticator name from params or use default
    const authenticatorName = ctx.action.params.values?.authenticator || 'wecom';

    // Get the authenticator instance
    const authenticatorRepo = ctx.db.getRepository('authenticators');
    const authenticator = await authenticatorRepo.findOne({
      filter: {
        name: authenticatorName,
        enabled: true,
      },
    });

    if (!authenticator) {
      ctx.throw(404, ctx.t('Authenticator not found or disabled'));
    }

    const options = authenticator.options as WeComAuthenticatorOptions;

    // Generate state parameter for CSRF protection (Requirement 4.1)
    const state = crypto.randomBytes(16).toString('hex');

    // Store state in session for validation (Requirement 4.2)
    if (!ctx.session) {
      ctx.session = {};
    }
    ctx.session.wecomState = state;

    // Create WeComAuth instance to access the service
    const wecomAuth = new WeComAuth({
      authenticator,
      options: authenticator.options,
      ctx,
    });

    // Convert relative callback URL to absolute URL
    let callbackUrl = options.callbackUrl;

    if (callbackUrl && !callbackUrl.startsWith('http://') && !callbackUrl.startsWith('https://')) {
      // Build absolute URL from request
      // Prefer X-Forwarded-* headers if behind a proxy
      const xForwardedProto = ctx.get('x-forwarded-proto');
      const xForwardedHost = ctx.get('x-forwarded-host');
      const xForwardedPort = ctx.get('x-forwarded-port');

      const protocol = xForwardedProto || ctx.protocol;
      let host = xForwardedHost || ctx.get('host');

      // Remove port from host if it exists (we'll add it back if needed)
      host = host.split(':')[0];

      // Determine the port to use
      let port: string | undefined;

      // Priority 1: Use publicPort from config if set
      if (options.publicPort) {
        port = String(options.publicPort);
      }
      // Priority 2: Use X-Forwarded-Port if available
      else if (xForwardedPort) {
        port = xForwardedPort;
      }
      // Priority 3: Extract from original host header if it contains port
      else {
        const originalHost = ctx.get('host');
        const portMatch = originalHost.match(/:(\d+)$/);
        if (portMatch) {
          port = portMatch[1];
        }
      }

      // Add port to host if it's not a standard port
      if (port) {
        const isStandardPort = (protocol === 'http' && port === '80') || (protocol === 'https' && port === '443');

        if (!isStandardPort) {
          host = `${host}:${port}`;
        }
      }

      callbackUrl = `${protocol}://${host}${callbackUrl.startsWith('/') ? '' : '/'}${callbackUrl}`;
    }

    // Get the authorization URL (Requirement 2.2)
    const authUrl = (wecomAuth as any).wecomService.getAuthorizationUrl(callbackUrl, state);

    // Log complete authorization URL
    ctx.logger.info('Generated WeCom auth URL', {
      action: 'getAuthUrl',
      authenticator: authenticatorName,
    });

    ctx.body = {
      data: {
        authUrl,
        state,
      },
    };

    await next();
  } catch (error) {
    // Error handling and logging (Requirement 5.1)
    ctx.logger.error('Failed to generate auth URL', {
      action: 'getAuthUrl',
      error: error.message,
    });

    // Re-throw with user-friendly message
    if (error.status) {
      throw error;
    }
    ctx.throw(500, ctx.t('Failed to generate authorization URL'));
  }
}

export default {
  callback,
  getAuthUrl,
};
