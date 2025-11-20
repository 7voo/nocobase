/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { SchemaComponent, useAPIClient, useRecord } from '@nocobase/client';
import { Alert } from 'antd';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { authType } from '../constants';

/**
 * Admin settings form for WeCom authenticator
 * Allows administrators to configure Corp ID, Agent ID, Secret, and Callback URL
 *
 * Requirements: 7.1, 7.2, 7.3, 7.5
 */
export const WeComAdminSettings: React.FC = () => {
  const { t } = useTranslation();
  const record = useRecord();
  const apiClient = useAPIClient();

  // Generate the callback URL based on the current API URL
  const callbackUrl = useMemo(() => {
    const apiUrl = apiClient.axios.defaults.baseURL || window.location.origin;
    const cleanUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${cleanUrl}/auth:signIn?authenticator=${
      record.name || authType.toLowerCase()
    }&type=${authType.toLowerCase()}`;
  }, [apiClient, record.name]);

  return (
    <SchemaComponent
      scope={{ t }}
      components={{ Alert }}
      schema={{
        type: 'object',
        properties: {
          notice: {
            type: 'void',
            'x-decorator': 'FormItem',
            'x-component': 'Alert',
            'x-component-props': {
              showIcon: true,
              type: 'info',
              message: t('Configure your WeCom application credentials'),
            },
          },
          corpId: {
            type: 'string',
            title: t('Corp ID'),
            required: true,
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            'x-component-props': {
              placeholder: t('Corp ID'),
            },
            'x-validator': [
              {
                required: true,
                message: t('Corp ID is required'),
              },
            ],
          },
          agentId: {
            type: 'string',
            title: t('Agent ID'),
            required: true,
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            'x-component-props': {
              placeholder: t('Agent ID'),
            },
            'x-validator': [
              {
                required: true,
                message: t('Agent ID is required'),
              },
            ],
          },
          secret: {
            type: 'string',
            title: t('Secret'),
            required: true,
            'x-decorator': 'FormItem',
            'x-component': 'Password',
            'x-component-props': {
              placeholder: t('Secret'),
              autoComplete: 'new-password',
            },
            'x-validator': [
              {
                required: true,
                message: t('Secret is required'),
              },
            ],
          },
          callbackUrl: {
            type: 'string',
            title: t('Callback URL'),
            'x-decorator': 'FormItem',
            'x-component': 'Input',
            'x-component-props': {
              readOnly: true,
              addonAfter: {
                type: 'button',
                props: {
                  icon: 'CopyOutlined',
                  onClick: () => {
                    navigator.clipboard.writeText(callbackUrl);
                  },
                },
              },
            },
            'x-read-pretty': true,
            default: callbackUrl,
            description: t('Copy this URL to your WeCom application settings'),
          },
          public: {
            type: 'object',
            properties: {
              autoSignup: {
                type: 'boolean',
                title: t('Allow automatic sign up'),
                'x-decorator': 'FormItem',
                'x-component': 'Checkbox',
                'x-component-props': {
                  children: t('Automatically create user accounts for new WeCom users'),
                },
                default: true,
              },
              defaultRole: {
                type: 'string',
                title: t('Default role'),
                'x-decorator': 'FormItem',
                'x-component': 'RemoteSelect',
                'x-component-props': {
                  fieldNames: {
                    label: 'title',
                    value: 'name',
                  },
                  service: {
                    resource: 'roles',
                  },
                  placeholder: t('Select default role for new users'),
                },
                description: t('Role to assign to newly created users (optional)'),
              },
            },
          },
        },
      }}
    />
  );
};
