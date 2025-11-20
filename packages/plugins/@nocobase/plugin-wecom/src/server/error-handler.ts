/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

/**
 * Error handling utilities for WeCom plugin
 * Provides functions for sensitive data masking, error formatting, and logging
 */

/**
 * Sensitive data fields that should be masked in logs
 */
const SENSITIVE_FIELDS = ['corpId', 'secret', 'access_token', 'accessToken', 'code', 'authorization_code'];

/**
 * Mask sensitive data in strings
 * - Corp ID: show only first 4 characters
 * - Secret, Access Token, Authorization Code: completely masked
 *
 * @param value - The value to mask
 * @param fieldName - The name of the field (used to determine masking strategy)
 * @returns Masked value
 */
export function maskSensitiveValue(value: string, fieldName: string): string {
  if (!value) {
    return value;
  }

  const lowerFieldName = fieldName.toLowerCase();

  // Corp ID: show first 4 characters
  if (lowerFieldName.includes('corpid') || lowerFieldName.includes('corp_id')) {
    return value.length > 4 ? `${value.substring(0, 4)}****` : '****';
  }

  // Secret, tokens, and codes: completely masked
  if (lowerFieldName.includes('secret') || lowerFieldName.includes('token') || lowerFieldName.includes('code')) {
    return '********';
  }

  return value;
}

/**
 * Mask sensitive data in objects
 * Recursively masks sensitive fields in objects and arrays
 *
 * @param data - The data object to mask
 * @returns A new object with sensitive data masked
 */
export function maskSensitiveData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitive types
  if (typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item));
  }

  // Handle objects
  const masked: any = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()));

    if (isSensitive && typeof value === 'string') {
      masked[key] = maskSensitiveValue(value, key);
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Error response format following NocoBase standards
 */
export interface ErrorResponse {
  errors: Array<{
    message: string;
    code?: string;
    details?: any;
  }>;
}

/**
 * Format error for API response
 * Creates a standardized error response following NocoBase conventions
 *
 * @param error - The error to format
 * @param code - Optional error code for client handling
 * @param includeDetails - Whether to include error details (dev mode)
 * @returns Formatted error response
 */
export function formatErrorResponse(error: Error | string, code?: string, includeDetails = false): ErrorResponse {
  const message = typeof error === 'string' ? error : error.message;

  const errorResponse: ErrorResponse = {
    errors: [
      {
        message,
        code,
      },
    ],
  };

  // Include details only in development mode
  if (includeDetails && typeof error === 'object') {
    errorResponse.errors[0].details = {
      stack: error.stack,
      name: error.name,
    };
  }

  return errorResponse;
}

/**
 * Log levels for error logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log context for structured logging
 */
export interface LogContext {
  method?: string;
  userId?: string | number;
  authenticatorId?: string | number;
  [key: string]: any;
}

/**
 * Log error with appropriate level and masked sensitive data
 * Provides structured logging with automatic sensitive data masking
 *
 * @param logger - The logger instance (ctx.logger)
 * @param level - Log level (error, warn, info, debug)
 * @param message - Log message
 * @param context - Additional context data (will be masked)
 */
export function logError(logger: any, level: LogLevel, message: string, context?: LogContext): void {
  if (!logger || typeof logger[level] !== 'function') {
    console.error('Invalid logger provided');
    return;
  }

  // Mask sensitive data in context
  const maskedContext = context ? maskSensitiveData(context) : {};

  // Log with appropriate level
  logger[level](message, maskedContext);
}

/**
 * Map WeCom API error codes to user-friendly messages
 *
 * @param errcode - WeCom API error code
 * @param errmsg - WeCom API error message
 * @returns User-friendly error message
 */
export function mapWeComError(errcode: number, errmsg: string): string {
  // Common WeCom error codes
  const errorMap: Record<number, string> = {
    40001: 'Invalid credentials. Please check your Corp ID and Secret.',
    40003: 'Invalid OpenID',
    40013: 'Invalid App ID',
    40014: 'Invalid access token',
    40029: 'Invalid authorization code',
    40054: 'Invalid authorization code (expired or already used)',
    40055: 'Invalid authorization code',
    40056: 'Invalid authorization code',
    40057: 'Invalid authorization code',
    40084: 'Invalid user',
    40163: 'Invalid authorization code',
    41001: 'Access token is missing',
    41002: 'Corp ID is missing',
    41004: 'Secret is missing',
    42001: 'Access token has expired',
    42007: 'Authorization code has expired',
    42009: 'Authorization code has been used',
    43004: 'Invalid authorization code',
    45009: 'API call limit exceeded. Please try again later.',
    50001: 'Redirect URI is not authorized',
    60011: 'User is not a member of the enterprise',
    60020: 'IP address is not in whitelist',
  };

  return errorMap[errcode] || `WeCom API error: ${errmsg} (code: ${errcode})`;
}

/**
 * Check if error is a network error that should be retried
 *
 * @param error - The error to check
 * @returns True if error is retryable
 */
export function isRetryableError(error: Error): boolean {
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

/**
 * Wrap async function with error handling and logging
 * Provides consistent error handling across async operations
 *
 * @param fn - The async function to wrap
 * @param logger - Logger instance
 * @param context - Log context
 * @returns Wrapped function with error handling
 */
export function withErrorHandling<T>(fn: () => Promise<T>, logger: any, context: LogContext): () => Promise<T> {
  return async () => {
    try {
      return await fn();
    } catch (error) {
      logError(logger, LogLevel.ERROR, `Operation failed: ${error.message}`, {
        ...context,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  };
}
