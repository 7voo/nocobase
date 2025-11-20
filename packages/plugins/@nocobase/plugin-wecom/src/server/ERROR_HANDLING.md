# Error Handling Utilities

This document describes the error handling utilities provided by the WeCom plugin.

## Overview

The error handling utilities provide consistent error handling, logging, and sensitive data masking across the WeCom authentication plugin. These utilities ensure that:

1. Sensitive data (Corp ID, Secret, Access Tokens, Authorization Codes) is masked in logs
2. Errors are formatted consistently following NocoBase standards
3. WeCom API errors are mapped to user-friendly messages
4. Logging is structured and includes appropriate context

## Utilities

### maskSensitiveValue(value, fieldName)

Masks sensitive data in strings based on the field name.

**Masking Rules:**
- **Corp ID**: Shows only first 4 characters (e.g., `wx12****`)
- **Secret, Tokens, Codes**: Completely masked (e.g., `********`)

**Example:**
```typescript
import { maskSensitiveValue } from './error-handler';

const corpId = 'wx1234567890abcdef';
const masked = maskSensitiveValue(corpId, 'corpId');
// Result: 'wx12****'

const secret = 'my-super-secret-key';
const maskedSecret = maskSensitiveValue(secret, 'secret');
// Result: '********'
```

### maskSensitiveData(data)

Recursively masks sensitive fields in objects and arrays.

**Sensitive Fields:**
- `corpId`, `corp_id`
- `secret`
- `access_token`, `accessToken`
- `code`, `authorization_code`

**Example:**
```typescript
import { maskSensitiveData } from './error-handler';

const data = {
  corpId: 'wx1234567890',
  secret: 'my-secret',
  agentId: 'agent123',
  user: {
    name: 'Test User',
    access_token: 'token-abc-123',
  },
};

const masked = maskSensitiveData(data);
// Result:
// {
//   corpId: 'wx12****',
//   secret: '********',
//   agentId: 'agent123',
//   user: {
//     name: 'Test User',
//     access_token: '********',
//   },
// }
```

### formatErrorResponse(error, code?, includeDetails?)

Formats errors for API responses following NocoBase standards.

**Parameters:**
- `error`: Error object or string
- `code`: Optional error code for client handling
- `includeDetails`: Whether to include error details (for dev mode)

**Example:**
```typescript
import { formatErrorResponse } from './error-handler';

const error = new Error('Invalid authorization code');
const response = formatErrorResponse(error, 'INVALID_CODE');
// Result:
// {
//   errors: [
//     {
//       message: 'Invalid authorization code',
//       code: 'INVALID_CODE',
//     },
//   ],
// }
```

### logError(logger, level, message, context?)

Logs errors with automatic sensitive data masking.

**Log Levels:**
- `LogLevel.DEBUG`: Detailed debugging information
- `LogLevel.INFO`: Informational messages
- `LogLevel.WARN`: Warning messages
- `LogLevel.ERROR`: Error messages

**Example:**
```typescript
import { logError, LogLevel } from './error-handler';

logError(
  ctx.logger,
  LogLevel.ERROR,
  'WeCom authentication failed',
  {
    method: 'validate',
    corpId: 'wx1234567890',
    secret: 'my-secret',
    error: 'Invalid code',
  }
);
// Logs with masked sensitive data:
// {
//   method: 'validate',
//   corpId: 'wx12****',
//   secret: '********',
//   error: 'Invalid code',
// }
```

### mapWeComError(errcode, errmsg)

Maps WeCom API error codes to user-friendly messages.

**Common Error Codes:**
- `40001`: Invalid credentials
- `40029`: Invalid authorization code
- `42001`: Access token expired
- `42007`: Authorization code expired
- `45009`: API call limit exceeded
- `60011`: User not a member of enterprise

**Example:**
```typescript
import { mapWeComError } from './error-handler';

const message = mapWeComError(40001, 'invalid credential');
// Result: 'Invalid credentials. Please check your Corp ID and Secret.'

const unknownMessage = mapWeComError(99999, 'unknown error');
// Result: 'WeCom API error: unknown error (code: 99999)'
```

### isRetryableError(error)

Checks if an error is a network error that should be retried.

**Retryable Errors:**
- Network timeout
- Connection errors (ECONNABORTED, ETIMEDOUT, ENOTFOUND, ECONNREFUSED)

**Example:**
```typescript
import { isRetryableError } from './error-handler';

const networkError = new Error('Network timeout');
if (isRetryableError(networkError)) {
  // Retry the request
}

const apiError = new Error('Invalid credentials');
if (!isRetryableError(apiError)) {
  // Don't retry, it's an API error
}
```

### withErrorHandling(fn, logger, context)

Wraps async functions with error handling and logging.

**Example:**
```typescript
import { withErrorHandling } from './error-handler';

const fetchData = async () => {
  // Some async operation
  return await api.getData();
};

const wrappedFetch = withErrorHandling(
  fetchData,
  ctx.logger,
  {
    method: 'fetchData',
    userId: user.id,
  }
);

try {
  const result = await wrappedFetch();
} catch (error) {
  // Error is logged with masked sensitive data
  // and then rethrown
}
```

## Usage in WeCom Plugin

### WeComAuthService

The `WeComAuthService` uses error handling utilities to:
- Map WeCom API errors to user-friendly messages
- Determine if errors are retryable
- Implement retry logic with exponential backoff

```typescript
// In wecom-auth-service.ts
if (response.data.errcode !== 0) {
  const errorMessage = mapWeComError(response.data.errcode, response.data.errmsg);
  throw new Error(errorMessage);
}

// Retry logic
if (!isRetryableError(lastError) || attempt === maxRetries - 1) {
  throw lastError;
}
```

### WeComAuth

The `WeComAuth` class uses error handling utilities to:
- Log authentication failures with masked sensitive data
- Log warnings for non-critical errors

```typescript
// In wecom-auth.ts
catch (error) {
  logError(
    ctx.logger,
    LogLevel.ERROR,
    'WeCom authentication failed',
    {
      method: 'validate',
      error: error.message,
      code: code, // Will be masked
    }
  );
  throw error;
}
```

## Security Considerations

### Sensitive Data Masking

The error handling utilities automatically mask the following sensitive data:

1. **Corp ID**: Shows only first 4 characters
2. **Secret**: Completely masked
3. **Access Token**: Completely masked
4. **Authorization Code**: Completely masked

This ensures that sensitive credentials are never exposed in logs, even during error conditions.

### Logging Strategy

The plugin follows this logging strategy:

- **INFO**: Successful authentication, user creation
- **WARN**: Retry attempts, non-critical failures (e.g., role assignment)
- **ERROR**: Authentication failures, API errors, configuration errors
- **DEBUG**: Detailed request/response data (with sensitive data masked)

## Requirements Validation

The error handling utilities satisfy the following requirements:

### Requirement 6.1: Invalid Authorization Code Handling
- `logError()` logs errors with appropriate levels
- `formatErrorResponse()` creates user-friendly error responses

### Requirement 6.2: Graceful API Error Handling
- `mapWeComError()` maps WeCom API errors to user-friendly messages
- `formatErrorResponse()` formats errors consistently

### Requirement 6.5: Sensitive Data Masking
- `maskSensitiveValue()` masks individual values
- `maskSensitiveData()` recursively masks objects and arrays
- `logError()` automatically masks sensitive data before logging

## Testing

The error handling utilities are thoroughly tested in `__tests__/error-handler.test.ts`:

- 35 test cases covering all utilities
- Tests for masking Corp ID, Secret, Tokens, and Codes
- Tests for nested objects and arrays
- Tests for error formatting and logging
- Tests for WeCom error mapping
- Tests for retry logic

Run tests with:
```bash
yarn test packages/plugins/@nocobase/plugin-wecom/src/server/__tests__/error-handler.test.ts --run
```
