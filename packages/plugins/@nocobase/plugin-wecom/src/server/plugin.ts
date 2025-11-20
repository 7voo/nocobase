/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { resolve } from 'path';
import { InstallOptions, Plugin } from '@nocobase/server';
import { tval } from '@nocobase/utils';
import { authType, namespace } from '../constants';
import { WeComAuth } from './wecom-auth';
import wecomActions from './actions';

/**
 * WeCom authentication plugin for NocoBase
 *
 * This plugin provides WeCom (Enterprise WeChat) OAuth 2.0 authentication
 * for NocoBase applications, allowing users to sign in by scanning QR codes
 * with their WeCom mobile app.
 *
 * Requirements: 1.1, 1.3, 1.5
 */
export class PluginWeComServer extends Plugin {
  afterAdd() {}

  /**
   * Load plugin resources and register authentication type
   *
   * This method:
   * 1. Imports collection extensions (users table fields)
   * 2. Registers WeCom authentication type with Auth Manager
   * 3. Registers action handlers for OAuth flow
   * 4. Sets up ACL permissions for public endpoints
   * 5. Registers locale translations
   *
   * Requirements: 1.1, 1.3, 1.5
   */
  async load() {
    // Import collection extensions (adds wecomUserId, wecomOpenId, wecomUnionId to users table)
    await this.importCollections(resolve(__dirname, 'collections'));

    // Register locale translations for internationalization
    // Supports zh-CN and en-US as per Requirement 8.1, 8.4
    this.app.i18n.addResources('zh-CN', namespace, require('../locale/zh-CN.json'));
    this.app.i18n.addResources('en-US', namespace, require('../locale/en-US.json'));

    // Register WeCom authentication type with Auth Manager
    // This makes WeCom available as an authentication option
    // Requirement 1.1: Register authentication type named "wecom"
    this.app.authManager.registerTypes(authType, {
      auth: WeComAuth,
      title: tval('WeCom', { ns: namespace }),
    });

    // Register action handlers for OAuth flow
    // Requirement 1.3: Provide callback URL endpoint for OAuth 2.0 flow
    this.app.resourceManager.registerActionHandler('wecom:callback', wecomActions.callback);
    this.app.resourceManager.registerActionHandler('wecom:getAuthUrl', wecomActions.getAuthUrl);

    // Set up ACL permissions - allow public access to these endpoints
    // These endpoints must be publicly accessible for OAuth flow to work
    // Requirement 1.5: Make authenticator available on login page
    this.app.acl.allow('wecom', 'callback', 'public');
    this.app.acl.allow('wecom', 'getAuthUrl', 'public');
  }

  /**
   * Install plugin and create default authenticator if needed
   *
   * This method is called when the plugin is first installed.
   * It can be used to set up initial data or configuration.
   *
   * For WeCom plugin, we don't create a default authenticator automatically
   * because it requires specific configuration (Corp ID, Agent ID, Secret)
   * that must be provided by the administrator.
   *
   * @param options - Installation options
   */
  async install(options?: InstallOptions) {
    // No default authenticator creation needed
    // Administrators must manually configure WeCom authenticator
    // with their Corp ID, Agent ID, and Secret from WeCom admin console
  }

  async afterEnable() {}

  async afterDisable() {}

  async remove() {}
}

export default PluginWeComServer;
