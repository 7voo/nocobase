/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  maskSensitiveValue,
  maskSensitiveData,
  formatErrorResponse,
  logError,
  LogLevel,
  mapWeComError,
  isRetryableError,
  withErrorHandling,
} from '../error-handler';

describe('Error Handler Utilities', () => {
  describe('maskSensitiveValue', () => {
    it('should mask Corp ID showing only first 4 characters', () => {
      const corpId = 'wx1234567890abcdef';
      const masked = maskSensitiveValue(corpId, 'corpId');
      expect(masked).toBe('wx12****');
    });

    it('should completely mask secret', () => {
      const secret = 'my-super-secret-key-12345';
      const masked = maskSensitiveValue(secret, 'secret');
      expect(masked).toBe('********');
    });

    it('should completely mask access token', () => {
      const token = 'access-token-abc123xyz';
      const masked = maskSensitiveValue(token, 'access_token');
      expect(masked).toBe('********');
    });

    it('should completely mask authorization code', () => {
      const code = 'auth-code-xyz789';
      const masked = maskSensitiveValue(code, 'code');
      expect(masked).toBe('********');
    });

    it('should handle short Corp ID', () => {
      const shortCorpId = 'wx1';
      const masked = maskSensitiveValue(shortCorpId, 'corpId');
      expect(masked).toBe('****');
    });

    it('should return empty string for empty value', () => {
      const masked = maskSensitiveValue('', 'secret');
      expect(masked).toBe('');
    });

    it('should handle null/undefined values', () => {
      expect(maskSensitiveValue(null as any, 'secret')).toBeNull();
      expect(maskSensitiveValue(undefined as any, 'secret')).toBeUndefined();
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask sensitive fields in objects', () => {
      const data = {
        corpId: 'wx1234567890',
        secret: 'my-secret',
        agentId: 'agent123',
        name: 'Test User',
      };

      const masked = maskSensitiveData(data);
      expect(masked.corpId).toBe('wx12****');
      expect(masked.secret).toBe('********');
      expect(masked.agentId).toBe('agent123'); // Not sensitive
      expect(masked.name).toBe('Test User'); // Not sensitive
    });

    it('should mask nested sensitive data', () => {
      const data = {
        config: {
          corpId: 'wx1234567890',
          secret: 'my-secret',
        },
        user: {
          name: 'Test',
        },
      };

      const masked = maskSensitiveData(data);
      expect(masked.config.corpId).toBe('wx12****');
      expect(masked.config.secret).toBe('********');
      expect(masked.user.name).toBe('Test');
    });

    it('should mask sensitive data in arrays', () => {
      const data = [
        { code: 'auth-code-1', name: 'User 1' },
        { code: 'auth-code-2', name: 'User 2' },
      ];

      const masked = maskSensitiveData(data);
      expect(masked[0].code).toBe('********');
      expect(masked[0].name).toBe('User 1');
      expect(masked[1].code).toBe('********');
      expect(masked[1].name).toBe('User 2');
    });

    it('should handle null and undefined', () => {
      expect(maskSensitiveData(null)).toBeNull();
      expect(maskSensitiveData(undefined)).toBeUndefined();
    });

    it('should handle primitive types', () => {
      expect(maskSensitiveData('string')).toBe('string');
      expect(maskSensitiveData(123)).toBe(123);
      expect(maskSensitiveData(true)).toBe(true);
    });

    it('should mask access_token and accessToken fields', () => {
      const data = {
        access_token: 'token123',
        accessToken: 'token456',
        other: 'value',
      };

      const masked = maskSensitiveData(data);
      expect(masked.access_token).toBe('********');
      expect(masked.accessToken).toBe('********');
      expect(masked.other).toBe('value');
    });
  });

  describe('formatErrorResponse', () => {
    it('should format error object', () => {
      const error = new Error('Test error message');
      const response = formatErrorResponse(error, 'TEST_ERROR');

      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].message).toBe('Test error message');
      expect(response.errors[0].code).toBe('TEST_ERROR');
    });

    it('should format error string', () => {
      const response = formatErrorResponse('Simple error message', 'SIMPLE_ERROR');

      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].message).toBe('Simple error message');
      expect(response.errors[0].code).toBe('SIMPLE_ERROR');
    });

    it('should include details when requested', () => {
      const error = new Error('Test error');
      const response = formatErrorResponse(error, 'TEST_ERROR', true);

      expect(response.errors[0].details).toBeDefined();
      expect(response.errors[0].details.name).toBe('Error');
      expect(response.errors[0].details.stack).toBeDefined();
    });

    it('should not include details by default', () => {
      const error = new Error('Test error');
      const response = formatErrorResponse(error, 'TEST_ERROR');

      expect(response.errors[0].details).toBeUndefined();
    });

    it('should work without error code', () => {
      const error = new Error('Test error');
      const response = formatErrorResponse(error);

      expect(response.errors[0].message).toBe('Test error');
      expect(response.errors[0].code).toBeUndefined();
    });
  });

  describe('logError', () => {
    it('should log with correct level and masked data', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      };

      const context = {
        method: 'testMethod',
        corpId: 'wx1234567890',
        secret: 'my-secret',
      };

      logError(mockLogger, LogLevel.ERROR, 'Test error', context);

      expect(mockLogger.error).toHaveBeenCalledWith('Test error', {
        method: 'testMethod',
        corpId: 'wx12****',
        secret: '********',
      });
    });

    it('should handle different log levels', () => {
      const mockLogger = {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
      };

      logError(mockLogger, LogLevel.WARN, 'Warning message');
      expect(mockLogger.warn).toHaveBeenCalledWith('Warning message', {});

      logError(mockLogger, LogLevel.INFO, 'Info message');
      expect(mockLogger.info).toHaveBeenCalledWith('Info message', {});

      logError(mockLogger, LogLevel.DEBUG, 'Debug message');
      expect(mockLogger.debug).toHaveBeenCalledWith('Debug message', {});
    });

    it('should handle missing context', () => {
      const mockLogger = {
        error: vi.fn(),
      };

      logError(mockLogger, LogLevel.ERROR, 'Test error');
      expect(mockLogger.error).toHaveBeenCalledWith('Test error', {});
    });

    it('should handle invalid logger gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logError(null as any, LogLevel.ERROR, 'Test error');
      expect(consoleSpy).toHaveBeenCalledWith('Invalid logger provided');

      consoleSpy.mockRestore();
    });
  });

  describe('mapWeComError', () => {
    it('should map known error codes to user-friendly messages', () => {
      expect(mapWeComError(40001, 'invalid credential')).toBe(
        'Invalid credentials. Please check your Corp ID and Secret.',
      );
      expect(mapWeComError(40029, 'invalid code')).toBe('Invalid authorization code');
      expect(mapWeComError(42001, 'access_token expired')).toBe('Access token has expired');
      expect(mapWeComError(60011, 'no privilege to access')).toBe('User is not a member of the enterprise');
    });

    it('should return generic message for unknown error codes', () => {
      const result = mapWeComError(99999, 'unknown error');
      expect(result).toBe('WeCom API error: unknown error (code: 99999)');
    });

    it('should handle authorization code errors', () => {
      expect(mapWeComError(40054, 'invalid code')).toContain('Invalid authorization code');
      expect(mapWeComError(42007, 'code expired')).toBe('Authorization code has expired');
      expect(mapWeComError(42009, 'code used')).toBe('Authorization code has been used');
    });

    it('should handle rate limiting errors', () => {
      expect(mapWeComError(45009, 'api freq out of limit')).toContain('API call limit exceeded');
    });
  });

  describe('isRetryableError', () => {
    it('should identify network timeout errors', () => {
      const error = new Error('Network timeout');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify network errors', () => {
      const error = new Error('Network error');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify connection errors', () => {
      expect(isRetryableError(new Error('ECONNABORTED'))).toBe(true);
      expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
      expect(isRetryableError(new Error('ENOTFOUND'))).toBe(true);
      expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true);
    });

    it('should not identify API errors as retryable', () => {
      const error = new Error('Invalid credentials');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should not identify validation errors as retryable', () => {
      const error = new Error('Invalid authorization code');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isRetryableError(new Error('NETWORK TIMEOUT'))).toBe(true);
      expect(isRetryableError(new Error('network error'))).toBe(true);
    });
  });

  describe('withErrorHandling', () => {
    it('should execute function successfully', async () => {
      const mockLogger = {
        error: vi.fn(),
      };

      const fn = async () => 'success';
      const wrapped = withErrorHandling(fn, mockLogger, { method: 'test' });

      const result = await wrapped();
      expect(result).toBe('success');
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should log error and rethrow', async () => {
      const mockLogger = {
        error: vi.fn(),
      };

      const testError = new Error('Test error');
      const fn = async () => {
        throw testError;
      };
      const wrapped = withErrorHandling(fn, mockLogger, { method: 'test' });

      await expect(wrapped()).rejects.toThrow('Test error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Operation failed: Test error',
        expect.objectContaining({
          method: 'test',
          error: 'Test error',
        }),
      );
    });

    it('should mask sensitive data in error logs', async () => {
      const mockLogger = {
        error: vi.fn(),
      };

      const fn = async () => {
        throw new Error('Failed');
      };
      const wrapped = withErrorHandling(fn, mockLogger, {
        method: 'test',
        secret: 'my-secret',
        corpId: 'wx1234567890',
      });

      await expect(wrapped()).rejects.toThrow('Failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Operation failed: Failed',
        expect.objectContaining({
          method: 'test',
          secret: '********',
          corpId: 'wx12****',
        }),
      );
    });
  });
});
