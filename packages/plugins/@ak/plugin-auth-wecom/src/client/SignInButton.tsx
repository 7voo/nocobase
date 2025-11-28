/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button, Modal, Alert, Space, Spin } from 'antd';
import { WechatOutlined, LoadingOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAPIClient } from '@nocobase/client';
import { QRCode } from './QRCode';
import { isWeComEnvironment, getLoginType } from './utils/detectEnvironment';

/**
 * Authenticator type from plugin-auth
 */
export type Authenticator = {
  name: string;
  authType: string;
  authTypeTitle: string;
  title?: string;
  options?: {
    [key: string]: any;
  };
  sort?: number;
};

/**
 * Props for SignInButton component
 */
export interface SignInButtonProps {
  /**
   * Authenticator configuration
   */
  authenticator: Authenticator;
}

/**
 * SignInButton Component
 *
 * Displays a button to initiate WeCom authentication.
 * Automatically detects environment and uses appropriate login method:
 * - In WeCom client: Direct OAuth2.0 redirect (one-click login)
 * - In PC browser: QR code modal
 *
 * Requirements: 2.1, 2.2, 8.1, 9.2, 9.3, 9.4
 *
 * Features:
 * - Detects WeCom environment
 * - Renders button with WeCom branding
 * - In WeCom: Redirects to OAuth authorization
 * - In PC: Displays QRCode in a modal
 * - Handles authentication errors
 *
 * Note: Authentication success and redirect are handled by the OAuth callback
 * on the server side, which redirects the browser after successful authentication.
 */
export const SignInButton: React.FC<SignInButtonProps> = ({ authenticator }) => {
  const { t } = useTranslation();
  const api = useAPIClient();

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [inWeComEnv, setInWeComEnv] = useState<boolean>(false);

  /**
   * Detect environment on mount
   * Requirement 9.1: Detect WeCom environment
   */
  useEffect(() => {
    const isWeCom = isWeComEnvironment();
    setInWeComEnv(isWeCom);
  }, []);

  /**
   * Handle authentication error
   * Requirements: 2.2, 8.4
   */
  const handleError = useCallback(
    (err: Error) => {
      const errorMessage = err?.message || t('WeCom authentication failed');
      setError(errorMessage);
      setLoading(false);
    },
    [t],
  );

  /**
   * Handle OAuth2.0 login (for WeCom environment)
   * Requirements: 8.1, 9.4
   */
  const handleOAuthLogin = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Get OAuth authorization URL from server
      const loginType = getLoginType();
      const response = await api.request({
        method: 'post',
        url: 'wecom:getAuthUrl',
        data: {
          authenticator: authenticator.name,
          loginType,
        },
      });

      const { authUrl } = response.data?.data || {};

      if (!authUrl) {
        throw new Error(t('Failed to get authorization URL'));
      }

      // Redirect to WeCom OAuth authorization page
      window.location.href = authUrl;
    } catch (err) {
      handleError(err as Error);
    }
  }, [api, authenticator.name, t, handleError]);

  /**
   * Handle button click
   * In WeCom: Trigger OAuth login
   * In PC: Show QR code modal
   * Requirements: 2.1, 9.2, 9.3
   */
  const handleClick = useCallback(() => {
    setError('');

    if (inWeComEnv) {
      // In WeCom environment: Direct OAuth login (Requirement 9.4)
      handleOAuthLogin();
    } else {
      // In PC browser: Show QR code modal (Requirement 9.3)
      setModalVisible(true);
    }
  }, [inWeComEnv, handleOAuthLogin]);

  /**
   * Handle modal close
   */
  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    setError('');
  }, []);

  return (
    <>
      {/* Sign in button with WeCom branding */}
      {/* Requirements: 2.1, 8.1, 9.2, 9.3 */}
      <Button
        block
        icon={loading ? <LoadingOutlined /> : <WechatOutlined />}
        onClick={handleClick}
        size="large"
        loading={loading}
        disabled={loading}
        style={{
          backgroundColor: '#07c160',
          borderColor: '#07c160',
          color: '#ffffff',
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = '#06ad56';
            e.currentTarget.style.borderColor = '#06ad56';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = '#07c160';
            e.currentTarget.style.borderColor = '#07c160';
          }
        }}
      >
        {loading ? t('Redirecting...') : inWeComEnv ? t('Sign in with WeCom (One-Click)') : t('Sign in with WeCom')}
      </Button>

      {/* Display error message if OAuth login fails */}
      {/* Requirement 8.4 */}
      {error && inWeComEnv && (
        <Alert
          message={t('WeCom authentication failed')}
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError('')}
          style={{ marginTop: 16 }}
        />
      )}

      {/* QR Code Modal (only for PC browser) */}
      {/* Requirements: 2.1, 2.2, 9.3 */}
      {!inWeComEnv && (
        <Modal
          title={t('Sign in with WeCom')}
          open={modalVisible}
          onCancel={handleModalClose}
          footer={null}
          centered
          width={400}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Display error message if any */}
            {/* Requirements: 2.2 */}
            {error && (
              <Alert
                message={t('WeCom authentication failed')}
                description={error}
                type="error"
                showIcon
                closable
                onClose={() => setError('')}
              />
            )}

            {/* Display QR Code */}
            {/* Requirements: 2.1, 2.2 */}
            <QRCode authenticator={authenticator.name} onError={handleError} />
          </Space>
        </Modal>
      )}
    </>
  );
};

export default SignInButton;
