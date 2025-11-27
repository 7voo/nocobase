/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import axios, { AxiosError } from 'axios';
import { WeComConfig, WeComUserInfo, WeComAccessTokenResponse, WeComUserInfoResponse } from '../types';
import { WECOM_API, RETRY_CONFIG, API_TIMEOUT } from '../constants';

/**
 * WeCom API service class
 * Handles all interactions with WeCom (Enterprise WeChat) API
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 5.3
 */
export class WeComService {
  private config: WeComConfig;
  private accessTokenCache: { token: string; expiresAt: number } | null = null;
  private logger?: any;

  constructor(config: WeComConfig, logger?: any) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Generate WeCom OAuth authorization URL
   * Creates the URL that users will be redirected to for authentication
   * Uses PC QR code login flow for better user experience
   *
   * @param redirectUri - The callback URL after authorization
   * @param state - State parameter for CSRF protection
   * @returns The complete authorization URL
   *
   * Requirement 6.1: Generate OAuth authorization URL
   */
  getAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      appid: this.config.corpId,
      agentid: this.config.agentId,
      redirect_uri: redirectUri,
      state: state,
      self_redirect: 'false', // Use postMessage instead of direct redirect to avoid iframe cross-origin issues
    });

    return `${WECOM_API.OAUTH_AUTHORIZE}?${params.toString()}`;
  }

  /**
   * Get access token from WeCom API
   * Retrieves the corp access token needed for API calls
   * Implements caching to avoid unnecessary API calls
   * Implements retry mechanism with exponential backoff
   *
   * @returns The corp access token
   * @throws Error if token retrieval fails after retries
   *
   * Requirements: 6.1, 6.2, 5.3
   */
  async getAccessToken(): Promise<string> {
    // Check cache first
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > Date.now()) {
      return this.accessTokenCache.token;
    }

    const fetchToken = async (): Promise<string> => {
      try {
        const params = new URLSearchParams({
          corpid: this.config.corpId,
          corpsecret: this.config.secret,
        });

        const url = `${WECOM_API.BASE_URL}${WECOM_API.GET_TOKEN}?${params.toString()}`;
        const response = await axios.get<WeComAccessTokenResponse>(url, {
          timeout: API_TIMEOUT.REQUEST_TIMEOUT,
        });

        // Validate response format (Requirement 6.4)
        if (response.data.errcode !== 0) {
          throw new Error(`WeCom API error: ${response.data.errmsg} (code: ${response.data.errcode})`);
        }

        if (!response.data.access_token) {
          throw new Error('Access token not found in response');
        }

        // Cache the token (expires in 2 hours by default)
        const expiresIn = response.data.expires_in || 7200;
        this.accessTokenCache = {
          token: response.data.access_token,
          expiresAt: Date.now() + (expiresIn - 300) * 1000, // Refresh 5 minutes before expiry
        };

        return response.data.access_token;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          // Convert network errors to retryable errors
          if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
            throw new Error('Network timeout');
          }
          if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
            throw new Error('Network error');
          }
        }
        throw error;
      }
    };

    return this.retryRequest(fetchToken);
  }

  /**
   * Get user information from WeCom API using authorization code
   * First uses the code to get userid, then the access token to get full user details
   * Implements retry mechanism with exponential backoff
   *
   * @param code - The authorization code from WeCom callback
   * @returns User information from WeCom
   * @throws Error if user info retrieval fails after retries
   *
   * Requirements: 6.3, 6.4, 5.3
   */
  async getUserInfo(code: string): Promise<WeComUserInfo> {
    const fetchUserInfo = async (): Promise<WeComUserInfo> => {
      try {
        // First, get the corp access token (Requirement 6.1)
        const accessToken = await this.getAccessToken();

        // Then use the access token and code to get user info
        const params = new URLSearchParams({
          access_token: accessToken,
          code: code,
        });

        const url = `${WECOM_API.BASE_URL}${WECOM_API.GET_USER_INFO}?${params.toString()}`;
        const response = await axios.get<WeComUserInfoResponse>(url, {
          timeout: API_TIMEOUT.REQUEST_TIMEOUT,
        });

        // Log the full response for debugging
        if (this.logger) {
          this.logger.info('WeCom getUserInfo API response', {
            method: 'getUserInfo',
            responseData: response.data,
            allKeys: Object.keys(response.data),
          });
        }

        // Validate response format (Requirement 6.4)
        if (response.data.errcode !== 0) {
          if (this.logger) {
            this.logger.error('WeCom API error', {
              method: 'getUserInfo',
              errcode: response.data.errcode,
              errmsg: response.data.errmsg,
              fullResponse: response.data,
            });
          }
          throw new Error(`WeCom API error: ${response.data.errmsg} (code: ${response.data.errcode})`);
        }

        // Log what fields are present
        if (this.logger) {
          this.logger.info('WeCom response field analysis', {
            method: 'getUserInfo',
            hasUserid: !!response.data.userid,
            hasOpenid: !!(response.data as any).openid,
            hasUserId: !!(response.data as any).UserId,
            allKeys: Object.keys(response.data),
          });
        }

        // PC QR code login returns "UserId" (capital U and I)
        // Mobile OAuth returns "userid" (lowercase)
        // We need to support both formats
        const userId = response.data.userid || (response.data as any).UserId;

        if (!userId) {
          if (this.logger) {
            this.logger.error('User ID not found in WeCom response', {
              method: 'getUserInfo',
              fullResponse: response.data,
            });
          }
          throw new Error('User ID not found in response');
        }

        if (this.logger) {
          this.logger.info('Successfully extracted user ID', {
            method: 'getUserInfo',
            userId,
          });
        }

        // Map API response to WeComUserInfo
        const userInfo: WeComUserInfo = {
          userid: userId,
          name: response.data.name || userId, // Fallback to userid if name not available
          mobile: response.data.mobile,
          email: response.data.email,
          avatar: response.data.avatar,
          department: response.data.department,
          position: response.data.position,
          gender: response.data.gender,
          status: response.data.status,
        };

        return userInfo;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          // Convert network errors to retryable errors
          if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
            throw new Error('Network timeout');
          }
          if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
            throw new Error('Network error');
          }
        }
        throw error;
      }
    };

    return this.retryRequest(fetchUserInfo);
  }

  /**
   * Retry a request with exponential backoff
   * Implements exponential backoff strategy for network errors
   * Retries up to 3 times with delays: 1s, 2s, 4s
   *
   * @param fn - The function to retry
   * @returns The result of the function
   * @throws The last error if all retries fail
   *
   * Requirement 5.3: Network retry mechanism with exponential backoff
   */
  private async retryRequest<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Only retry on network errors
        const isRetryable = this.isRetryableError(lastError);

        // Don't retry if it's the last attempt or error is not retryable
        if (!isRetryable || attempt === RETRY_CONFIG.MAX_RETRIES - 1) {
          throw lastError;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Check if error is a network error that should be retried
   *
   * @param error - The error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('network timeout') ||
      message.includes('network error') ||
      message.includes('econnaborted') ||
      message.includes('etimedout') ||
      message.includes('enotfound') ||
      message.includes('econnrefused')
    );
  }
}
