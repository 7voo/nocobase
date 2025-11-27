/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button, Space, Typography, Spin, Alert } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useAPIClient } from '@nocobase/client';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

/**
 * Props for QRCode component
 */
export interface QRCodeProps {
  /**
   * Authenticator name
   */
  authenticator: string;
  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void;
  /**
   * QR code expiration time in milliseconds (default: 5 minutes)
   */
  expirationTime?: number;
}

/**
 * QRCode Component
 *
 * Displays a QR code for WeCom authentication with automatic refresh mechanism.
 *
 * Requirements: 2.1, 2.2
 *
 * Features:
 * - Fetches authorization URL from server
 * - Displays QR code using Ant Design QRCode component
 * - Implements refresh mechanism for expired codes
 * - Handles success and error callbacks
 */
export const QRCode: React.FC<QRCodeProps> = ({
  authenticator,
  onError,
  expirationTime = 5 * 60 * 1000, // 5 minutes default
}) => {
  const { t } = useTranslation();
  const api = useAPIClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [authUrl, setAuthUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [expired, setExpired] = useState<boolean>(false);

  /**
   * Fetch authorization URL from server
   * Requirements: 2.2
   */
  const fetchAuthUrl = useCallback(async () => {
    setLoading(true);
    setError('');
    setExpired(false);

    try {
      const response = await api.request({
        url: 'wecom:getAuthUrl',
        method: 'post',
        data: {
          authenticator,
        },
      });

      // The response structure is: response.data.data.data.authUrl
      // because NocoBase wraps the response in an additional data layer
      const authUrl = response?.data?.data?.data?.authUrl;

      if (authUrl) {
        setAuthUrl(authUrl);

        // Set expiration timer
        // Requirements: 2.2
        setTimeout(() => {
          setExpired(true);
        }, expirationTime);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const errorMessage = err?.response?.data?.errors?.[0]?.message || err?.message || t('Failed to load QR code');
      setError(errorMessage);

      if (onError) {
        onError(err as Error);
      }
    } finally {
      setLoading(false);
    }
  }, [api, authenticator, expirationTime, onError, t]);

  /**
   * Handle refresh button click
   * Requirements: 2.2
   */
  const handleRefresh = useCallback(() => {
    fetchAuthUrl();
  }, [fetchAuthUrl]);

  /**
   * Initial load
   */
  useEffect(() => {
    fetchAuthUrl();
  }, [fetchAuthUrl]);

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">{t('Loading QR code...')}</Text>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Alert
          message={t('Failed to load QR code')}
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Button type="primary" icon={<ReloadOutlined />} onClick={handleRefresh}>
          {t('Refresh')}
        </Button>
      </div>
    );
  }

  /**
   * Render official WeCom QR code iframe
   * Uses WeCom's official QR code UI with built-in expiration handling
   */
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
          }}
        >
          <iframe
            ref={iframeRef}
            src={authUrl}
            width="350"
            height="400"
            style={{
              border: 'none',
              borderRadius: '8px',
            }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            title={t('WeCom QR Code')}
          />
        </div>

        <Button type="link" icon={<ReloadOutlined />} onClick={handleRefresh} size="small">
          {t('Refresh')}
        </Button>
      </Space>
    </div>
  );
};

export default QRCode;
