/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Action, FormItem, Input, SchemaComponent, useAPIClient, useRecord } from '@nocobase/client';
import { Alert } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { authType } from '../constants';

/**
 * Admin settings form for WeCom authenticator
 * Allows administrators to configure Corp ID, Agent ID, Secret, and Callback URL
 *
 * Requirements: 1.2, 1.3
 */
export const AdminSettings: React.FC = () => {
  const { t } = useTranslation();
  const record = useRecord();
  const apiClient = useAPIClient();

  // Generate the callback URL based on the current API URL
  const callbackUrl = useMemo(() => {
    const apiUrl = apiClient.axios.defaults.baseURL || window.location.origin;
    const cleanUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${cleanUrl}/wecom:callback?authenticator=${record.name || authType.toLowerCase()}`;
  }, [apiClient, record.name]);

  const handleCopy = () => {
    navigator.clipboard.writeText(callbackUrl);
  };

  const CallbackUrlField = () => (
    <FormItem label={t('Callback URL')} description={t('Copy this URL to your WeCom application settings')}>
      <Input readOnly value={callbackUrl} addonAfter={<Action icon={<CopyOutlined />} onClick={handleCopy} />} />
    </FormItem>
  );

  return (
    <SchemaComponent
      scope={{ t, handleCopy, callbackUrl }}
      components={{ Alert, CopyOutlined, Action, CallbackUrlField }}
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
            },
            'x-reactions': {
              target: 'callbackUrl',
              fulfill: {
                state: {
                  value: callbackUrl,
                },
              },
            },
            description: t('This URL is automatically generated. Copy it to your WeCom application settings.'),
          },
          publicPort: {
            type: 'number',
            title: t('Public Port'),
            'x-decorator': 'FormItem',
            'x-component': 'InputNumber',
            'x-component-props': {
              placeholder: t('e.g., 7737'),
              min: 1,
              max: 65535,
              style: { width: '100%' },
            },
            description: t(
              'Set this if your application is accessed via a non-standard port (e.g., 7737) but runs behind a reverse proxy on a different port. Leave empty for automatic detection.',
            ),
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

export default AdminSettings;
