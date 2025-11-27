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
import { WeComService } from './wecom-service';
import { WeComUserInfo, WeComAuthenticatorOptions } from '../types';

/**
 * WeCom authentication class
 * Handles WeCom OAuth 2.0 authentication flow
 *
 * Requirements: 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5
 */
export class WeComAuth extends BaseAuth {
  private wecomService: WeComService;

  constructor(config: AuthConfig) {
    const { ctx } = config;
    super({
      ...config,
      userCollection: ctx.db.getCollection('users'),
    });

    // Initialize WeCom service with configuration
    const options = this.authenticator.options as WeComAuthenticatorOptions;
    this.wecomService = new WeComService(
      {
        corpId: options.corpId,
        agentId: options.agentId,
        secret: options.secret,
      },
      ctx.logger,
    );
  }

  /**
   * Validate WeCom authorization and return user
   * Handles the OAuth callback flow:
   * 1. Extract authorization code from request
   * 2. Get user info from WeCom API
   * 3. Create or bind user account
   *
   * @returns The authenticated user model
   * @throws Error if validation fails
   *
   * Requirements: 2.3, 2.4, 2.5
   */
  async validate(): Promise<Model> {
    const ctx = this.ctx;
    const { code } = ctx.action.params.values || {};

    if (!code) {
      ctx.throw(400, ctx.t('Authorization code is required'));
    }

    try {
      // Get user info from WeCom using the authorization code (Requirement 2.4)
      const wecomUserInfo = await this.getUserInfo(code);

      // Create or bind user account (Requirement 2.5)
      const user = await this.createOrBindUser(wecomUserInfo);

      return user;
    } catch (error) {
      ctx.logger.error('WeCom authentication failed', {
        method: 'validate',
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get user information from WeCom API
   * Wrapper method for WeComService.getUserInfo
   *
   * @param code - Authorization code from WeCom callback
   * @returns WeCom user information
   *
   * Requirement 2.4: Get user info from WeCom API
   */
  async getUserInfo(code: string): Promise<WeComUserInfo> {
    return await this.wecomService.getUserInfo(code);
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
   *
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  async createOrBindUser(wecomUserInfo: WeComUserInfo): Promise<Model> {
    const ctx = this.ctx;
    const { userid, name, email, mobile } = wecomUserInfo;

    // Check if user already exists with this WeCom ID (Requirement 3.2)
    let user = await this.userRepository.findOne({
      filter: {
        wecomUserId: userid,
      },
    });

    if (user) {
      // User already exists, return it
      return user;
    }

    // User doesn't exist, check if autoSignup is enabled (Requirement 3.1)
    const options = this.authenticator.options as WeComAuthenticatorOptions;
    const { autoSignup, defaultRole } = options.public || {};

    if (!autoSignup) {
      throw new Error(
        ctx.t('User not found. Please contact administrator to enable auto-signup or create your account manually.'),
      );
    }

    // Create new user with WeCom information (Requirement 3.1, 3.5)
    const authenticator = this.authenticator as AuthModel;

    // Prepare user values (Requirements 3.2, 3.3)
    const userValues: any = {
      nickname: name || userid, // Use name from WeCom, fallback to userid (Requirement 3.3)
      username: name || userid, // Also set username for better user experience
      wecomUserId: userid, // Use WeCom user ID as unique identifier (Requirement 3.2)
    };

    // Add optional fields if available (though WeCom may not return these due to privacy restrictions)
    if (email) {
      userValues.email = email;
    }
    if (mobile) {
      userValues.phone = mobile;
    }

    // Create user using authenticator's method
    user = await authenticator.findOrCreateUser(userid, userValues);

    // Assign default role if specified (Requirement 3.4)
    if (defaultRole && user) {
      try {
        const rolesRepo = ctx.db.getRepository('roles');
        const role = await rolesRepo.findOne({
          filter: { name: defaultRole },
        });

        if (role) {
          await user.setRoles([role]);
        } else {
          ctx.logger.warn('Default role not found', {
            method: 'createOrBindUser',
            userId: user.id,
            defaultRole,
          });
        }
      } catch (error) {
        ctx.logger.warn('Failed to assign default role', {
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
