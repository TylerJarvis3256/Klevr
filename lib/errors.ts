export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'AIError'
  }
}

export class RateLimitError extends AIError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT', true)
  }
}

export class TimeoutError extends AIError {
  constructor(message = 'Request timed out') {
    super(message, 'TIMEOUT', true)
  }
}

export class ValidationError extends AIError {
  constructor(message = 'Validation failed') {
    super(message, 'VALIDATION', false)
  }
}

export class UsageLimitError extends AIError {
  constructor(message = 'Usage limit exceeded') {
    super(message, 'USAGE_LIMIT', false)
  }
}

/**
 * Determine if error should be retried
 */
export function shouldRetry(error: Error): boolean {
  if (error instanceof AIError) {
    return error.retryable
  }

  // Retry on network errors
  if (error.message.includes('network') || error.message.includes('timeout')) {
    return true
  }

  return false
}
