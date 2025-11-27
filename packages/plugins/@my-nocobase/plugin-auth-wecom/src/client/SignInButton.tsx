/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import React, { useState, useCallback } from 'react';
import { Button, Modal, Alert, Space } from 'antd';
import { WechatOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { QRCode } from './QRCode';

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
 * Displays a button to initiate WeCom authentication with QR code modal.
 *
 * Requirements: 2.1, 2.2
 *
 * Features:
 * - Renders button with WeCom branding
 * - Displays QRCode in a modal on click
 * - Handles authentication errors (display error message)
 *
 * Note: Authentication success and redirect are handled by the OAuth callback
 * on the server side, which redirects the browser after successful authentication.
 */
export const SignInButton: React.FC<SignInButtonProps> = ({ authenticator }) => {
  const { t } = useTranslation();

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  /**
   * Handle authentication error
   * Requirements: 2.2
   */
  const handleError = useCallback(
    (err: Error) => {
      const errorMessage = err?.message || t('WeCom authentication failed');
      setError(errorMessage);
    },
    [t],
  );

  /**
   * Handle button click to show QR code modal
   * Requirements: 2.1
   */
  const handleClick = useCallback(() => {
    setError('');
    setModalVisible(true);
  }, []);

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
      {/* Requirements: 2.1 */}
      <Button
        block
        icon={<WechatOutlined />}
        onClick={handleClick}
        size="large"
        style={{
          backgroundColor: '#07c160',
          borderColor: '#07c160',
          color: '#ffffff',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#06ad56';
          e.currentTarget.style.borderColor = '#06ad56';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#07c160';
          e.currentTarget.style.borderColor = '#07c160';
        }}
      >
        {t('Sign in with WeCom')}
      </Button>

      {/* QR Code Modal */}
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
    </>
  );
};

export default SignInButton;
