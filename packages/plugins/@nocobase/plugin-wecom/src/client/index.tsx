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
import { WeComSignInButton } from './WeComSignInButton';
import { WeComAdminSettings } from './WeComAdminSettings';

// Export components
export { WeComQRCode } from './WeComQRCode';
export { WeComSignInButton } from './WeComSignInButton';
export { WeComAdminSettings } from './WeComAdminSettings';

// Export locale utilities
export { useWeComTranslation, lang, namespace } from './locale';

/**
 * WeCom Client Plugin
 *
 * Registers WeCom authentication type with the Auth plugin and provides
 * UI components for sign-in and admin configuration.
 *
 * Translations are automatically loaded from the locale directory by NocoBase.
 * The server plugin registers translations for server-side usage.
 *
 * Requirements: 1.5, 2.5, 8.1
 */
export class PluginWeComClient extends Plugin {
  async load() {
    // Register WeCom authentication type with Auth plugin
    // Requirements: 1.5, 2.5
    const auth = this.app.pm.get(AuthPlugin);
    auth.registerType(authType, {
      components: {
        SignInButton: WeComSignInButton, // Task 10 - Completed
        AdminSettingsForm: WeComAdminSettings, // Task 11 - Completed
      },
    });

    // Note: Translations are automatically loaded from src/locale/ directory
    // by NocoBase's build system. No explicit registration needed in client.
    // Requirements: 8.1
  }
}

export default PluginWeComClient;
