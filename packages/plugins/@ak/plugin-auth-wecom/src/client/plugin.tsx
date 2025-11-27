/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Plugin } from '@nocobase/client';
import AuthPlugin from '@nocobase/plugin-auth/client';
import { authType } from '../constants';
import { SignInButton } from './SignInButton';
import { AdminSettings } from './AdminSettings';

/**
 * WeCom Client Plugin
 *
 * Registers WeCom authentication type with the Auth plugin and provides
 * UI components for sign-in and admin configuration.
 *
 * Requirements: 1.5, 2.1
 */
export class PluginAuthWecomClient extends Plugin {
  async load() {
    // Register WeCom authentication type with Auth plugin
    // Requirements: 1.5, 2.1
    const auth = this.app.pm.get(AuthPlugin);
    auth.registerType(authType, {
      components: {
        SignInButton: SignInButton,
        AdminSettingsForm: AdminSettings,
      },
    });
  }
}

export default PluginAuthWecomClient;
