/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Plugin } from '@nocobase/server';
import { tval } from '@nocobase/utils';
import { resolve } from 'path';
import { authType, namespace } from '../constants';
import { WeComAuth } from './wecom-auth';
import actions from './actions';

/**
 * WeCom Authentication Plugin Server
 *
 * This plugin provides WeCom (Enterprise WeChat) OAuth 2.0 authentication
 * for NocoBase applications.
 *
 * Requirements: 1.1, 1.3, 7.1, 7.2
 */
export class PluginAuthWecomServer extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  /**
   * Load plugin and register authentication type
   *
   * This method:
   * 1. Registers the WeCom authentication type with the auth manager
   * 2. Imports database collection extensions (users table)
   * 3. Registers wecom resource and actions (callback, getAuthUrl)
   * 4. Configures ACL permissions for public access
   * 5. Registers internationalization resources
   *
   * Requirements: 1.1, 1.3, 7.1, 7.2
   */
  async load() {
    // Import database collection extensions (Requirement 7.1)
    await this.importCollections(resolve(__dirname, 'collections'));

    // Register internationalization resources (Requirement 7.2)
    this.app.i18n.addResources('zh-CN', namespace, require('../locale/zh-CN.json'));
    this.app.i18n.addResources('en-US', namespace, require('../locale/en-US.json'));

    // Register WeCom authentication type (Requirement 7.1)
    this.app.authManager.registerTypes(authType, {
      auth: WeComAuth,
      title: tval('WeCom', { ns: namespace }),
    });

    // Register wecom resource and actions (Requirement 1.1)
    this.app.resourcer.define({
      name: 'wecom',
      actions: {
        callback: actions.callback,
        getAuthUrl: actions.getAuthUrl,
      },
    });

    // Configure ACL permissions - allow public access to callback and getAuthUrl (Requirement 1.3)
    this.app.acl.allow('wecom', 'callback', 'public');
    this.app.acl.allow('wecom', 'getAuthUrl', 'public');
  }

  async install() {}

  async afterEnable() {}

  async afterDisable() {}

  async remove() {}
}

export default PluginAuthWecomServer;
