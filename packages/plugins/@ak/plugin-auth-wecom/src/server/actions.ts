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
  const { code, state } = ctx.action.params.values || {};

  // Validate required parameters (Requirement 5.2)
  if (!code) {
    ctx.throw(400, ctx.t('Authorization code is required'));
  }

  if (!state) {
    ctx.throw(400, ctx.t('State parameter is required'));
  }

  try {
    // Validate state parameter for CSRF protection (Requirements 4.1, 4.2, 4.3)
    const sessionState = ctx.session?.wecomState;
    if (!sessionState || sessionState !== state) {
      ctx.logger.error('State parameter mismatch - possible CSRF attack', {
        action: 'callback',
        receivedState: state ? '****' : undefined,
        sessionState: sessionState ? '****' : undefined,
      });
      ctx.throw(400, ctx.t('Invalid state parameter'));
    }

    // Clear the state from session after validation
    if (ctx.session) {
      delete ctx.session.wecomState;
    }

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

    // Create WeComAuth instance
    const wecomAuth = new WeComAuth({
      authenticator,
      options: authenticator.options,
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

    // Return token and user info
    ctx.body = {
      data: {
        token,
        user: {
          id: user.id,
          nickname: user.nickname,
          email: user.email,
          phone: user.phone,
        },
      },
    };

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
      const protocol = ctx.protocol;
      const host = ctx.get('host');
      callbackUrl = `${protocol}://${host}${callbackUrl.startsWith('/') ? '' : '/'}${callbackUrl}`;
    }

    // Get the authorization URL (Requirement 2.2)
    const authUrl = (wecomAuth as any).wecomService.getAuthorizationUrl(callbackUrl, state);

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
