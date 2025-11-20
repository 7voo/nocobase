/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { AuthConfig, BaseAuth } from '@nocobase/auth';
import { Model } from '@nocobase/database';
import { AuthModel } from '@nocobase/plugin-auth';
import { WeComAuthService } from './wecom-auth-service';
import { WeComUserInfo, WeComAuthenticatorOptions } from '../types';
import { logError, LogLevel, formatErrorResponse } from './error-handler';

/**
 * WeCom authentication class
 * Handles WeCom OAuth 2.0 authentication flow
 */
export class WeComAuth extends BaseAuth {
  private authService: WeComAuthService;

  constructor(config: AuthConfig) {
    const { ctx } = config;
    super({
      ...config,
      userCollection: ctx.db.getCollection('users'),
    });

    // Initialize WeCom auth service with configuration
    const options = this.authenticator.options as WeComAuthenticatorOptions;
    this.authService = new WeComAuthService({
      corpId: options.corpId,
      agentId: options.agentId,
      secret: options.secret,
    });
  }

  /**
   * Validate WeCom authorization and return user
   * Handles the OAuth callback flow:
   * 1. Extract authorization code from request
   * 2. Exchange code for access token
   * 3. Get user info from WeCom API
   * 4. Create or bind user account
   *
   * @returns The authenticated user model
   * @throws Error if validation fails
   */
  async validate(): Promise<Model> {
    const ctx = this.ctx;
    const { code } = ctx.action.params.values || {};

    if (!code) {
      ctx.throw(400, ctx.t('Authorization code is required'));
    }

    try {
      // Get user info from WeCom using the authorization code
      const wecomUserInfo = await this.getUserInfo(code);

      // Create or bind user account
      const user = await this.createOrBindUser(wecomUserInfo);

      return user;
    } catch (error) {
      logError(ctx.logger, LogLevel.ERROR, 'WeCom authentication failed', {
        method: 'validate',
        error: error.message,
        code: code,
      });
      throw error;
    }
  }

  /**
   * Get access token from WeCom API
   * Wrapper method for WeComAuthService.getAccessToken
   *
   * @param code - Authorization code from WeCom callback
   * @returns Access token
   */
  async getAccessToken(code: string): Promise<string> {
    return await this.authService.getAccessToken(code);
  }

  /**
   * Get user information from WeCom API
   * Wrapper method for WeComAuthService.getUserInfo
   *
   * @param code - Authorization code from WeCom callback
   * @returns WeCom user information
   */
  async getUserInfo(code: string): Promise<WeComUserInfo> {
    return await this.authService.getUserInfo(code);
  }

  /**
   * Create or bind user account based on WeCom user info
   *
   * If a user with matching wecomUserId exists, authenticate that user.
   * If no matching user exists and autoSignup is enabled, create a new user.
   * Otherwise, throw an error.
   *
   * @param wecomUserInfo - User information from WeCom API
   * @returns The user model (existing or newly created)
   * @throws Error if user not found and autoSignup is disabled
   */
  async createOrBindUser(wecomUserInfo: WeComUserInfo): Promise<Model> {
    const ctx = this.ctx;
    const { userid, name, email, mobile } = wecomUserInfo;

    // Check if user already exists with this WeCom ID
    let user = await this.userRepository.findOne({
      filter: {
        wecomUserId: userid,
      },
    });

    if (user) {
      // User already exists, return it
      return user;
    }

    // User doesn't exist, check if autoSignup is enabled
    const options = this.authenticator.options as WeComAuthenticatorOptions;
    const { autoSignup, defaultRole } = options.public || {};

    if (!autoSignup) {
      throw new Error(
        ctx.t('User not found. Please contact administrator to enable auto-signup or create your account manually.'),
      );
    }

    // Create new user with WeCom information
    const authenticator = this.authenticator as AuthModel;

    // Prepare user values
    const userValues: any = {
      nickname: name || userid,
      wecomUserId: userid,
    };

    // Add optional fields if available
    if (email) {
      userValues.email = email;
    }
    if (mobile) {
      userValues.phone = mobile;
    }

    // Create user using authenticator's method
    user = await authenticator.findOrCreateUser(userid, userValues);

    // Assign default role if specified
    if (defaultRole && user) {
      try {
        const rolesRepo = ctx.db.getRepository('roles');
        const role = await rolesRepo.findOne({
          filter: { name: defaultRole },
        });

        if (role) {
          await user.setRoles([role]);
        } else {
          logError(ctx.logger, LogLevel.WARN, 'Default role not found', {
            method: 'createOrBindUser',
            userId: user.id,
            defaultRole,
          });
        }
      } catch (error) {
        logError(ctx.logger, LogLevel.WARN, 'Failed to assign default role', {
          method: 'createOrBindUser',
          userId: user.id,
          defaultRole,
          error: error.message,
        });
        // Don't fail the authentication if role assignment fails
      }
    }

    return user;
  }
}
