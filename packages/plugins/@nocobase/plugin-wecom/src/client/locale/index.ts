/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { useTranslation } from 'react-i18next';
import { i18n } from '@nocobase/client';
import { namespace } from '../../constants';

/**
 * Hook for WeCom plugin translations
 * Uses the plugin namespace with fallback to client namespace
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.5
 */
export function useWeComTranslation() {
  return useTranslation([namespace, 'client'], { nsMode: 'fallback' });
}

/**
 * Get translated string for WeCom plugin
 * 
 * @param key - Translation key
 * @returns Translated string
 */
export function lang(key: string) {
  return i18n.t(key, { ns: [namespace, 'client'], nsMode: 'fallback' });
}

export { namespace };
