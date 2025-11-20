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
import { mapWeComError, isRetryableError } from './error-handler';

// WeCom API endpoints
const WECOM_OAUTH_URL = 'https://open.weixin.qq.com/connect/oauth2/authorize';
const WECOM_TOKEN_URL = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken';
const WECOM_USERINFO_URL = 'https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo';

/**
 * WeCom API service
 * Handles interactions with WeCom API
 */
export class WeComAuthService {
  private config: WeComConfig;
  private readonly maxRetries = 3;
  private readonly connectionTimeout = 10000; // 10 seconds
  private readonly requestTimeout = 30000; // 30 seconds

  constructor(config: WeComConfig) {
    this.config = config;
  }

  /**
   * Get WeCom OAuth authorization URL
   * Generates the URL for WeCom OAuth 2.0 authorization
   *
   * @param redirectUri - The callback URL after authorization
   * @param state - State parameter for CSRF protection
   * @returns The complete authorization URL
   */
  getAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      appid: this.config.corpId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'snsapi_base',
      state: state,
      agentid: this.config.agentId,
    });

    return `${WECOM_OAUTH_URL}?${params.toString()}#wechat_redirect`;
  }

  /**
   * Exchange authorization code for access token
   * First gets the corp access token, then uses it to get user info
   * Implements retry logic with exponential backoff for network errors
   *
   * @param code - The authorization code from WeCom callback (not used in this flow)
   * @returns The corp access token
   * @throws Error if token exchange fails after retries
   */
  async getAccessToken(code: string): Promise<string> {
    const fetchToken = async (): Promise<string> => {
      try {
        const params = new URLSearchParams({
          corpid: this.config.corpId,
          corpsecret: this.config.secret,
        });

        const response = await axios.get<WeComAccessTokenResponse>(`${WECOM_TOKEN_URL}?${params.toString()}`, {
          timeout: this.requestTimeout,
        });

        if (response.data.errcode !== 0) {
          const errorMessage = mapWeComError(response.data.errcode, response.data.errmsg);
          throw new Error(errorMessage);
        }

        if (!response.data.access_token) {
          throw new Error('Access token not found in response');
        }

        return response.data.access_token;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
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

    return this.retryRequest(fetchToken, this.maxRetries);
  }

  /**
   * Get user information from WeCom API using authorization code
   * First uses the code to get userid, then fetches full user details
   * Implements retry logic with exponential backoff for network errors
   *
   * @param code - The authorization code from WeCom callback
   * @returns User information from WeCom
   * @throws Error if user info retrieval fails after retries
   */
  async getUserInfo(code: string): Promise<WeComUserInfo> {
    const fetchUserInfo = async (): Promise<WeComUserInfo> => {
      try {
        // First, get the corp access token
        const accessToken = await this.getAccessToken(code);

        // Then use the access token and code to get user info
        const params = new URLSearchParams({
          access_token: accessToken,
          code: code,
        });

        const response = await axios.get<WeComUserInfoResponse>(`${WECOM_USERINFO_URL}?${params.toString()}`, {
          timeout: this.requestTimeout,
        });

        if (response.data.errcode !== 0) {
          const errorMessage = mapWeComError(response.data.errcode, response.data.errmsg);
          throw new Error(errorMessage);
        }

        if (!response.data.userid) {
          throw new Error('User ID not found in response');
        }

        // Map API response to WeComUserInfo
        const userInfo: WeComUserInfo = {
          userid: response.data.userid,
          name: response.data.name || response.data.userid, // Fallback to userid if name not available
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

    return this.retryRequest(fetchUserInfo, this.maxRetries);
  }

  /**
   * Retry a request with exponential backoff
   * Implements exponential backoff strategy for network errors
   *
   * @param fn - The function to retry
   * @param maxRetries - Maximum number of retry attempts
   * @returns The result of the function
   * @throws The last error if all retries fail
   */
  private async retryRequest<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Only retry on network errors using the error handler utility
        if (!isRetryableError(lastError) || attempt === maxRetries - 1) {
          throw lastError;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // If we get here, all retries failed
    if (lastError) {
      throw lastError;
    }
    throw new Error('Request failed after all retries');
  }
}
