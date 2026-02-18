import { describe, it, expect } from 'vitest'
import {
  AIError,
  RateLimitError,
  TimeoutError,
  ValidationError,
  UsageLimitError,
  shouldRetry,
} from '@/lib/errors'

describe('AIError', () => {
  it('constructs with message, code, and retryable flag', () => {
    const error = new AIError('test error', 'TEST', true)

    expect(error.message).toBe('test error')
    expect(error.code).toBe('TEST')
    expect(error.retryable).toBe(true)
    expect(error.name).toBe('AIError')
    expect(error).toBeInstanceOf(Error)
  })

  it('defaults retryable to false', () => {
    const error = new AIError('test', 'TEST')

    expect(error.retryable).toBe(false)
  })
})

describe('RateLimitError', () => {
  it('sets correct defaults', () => {
    const error = new RateLimitError()

    expect(error.message).toBe('Rate limit exceeded')
    expect(error.code).toBe('RATE_LIMIT')
    expect(error.retryable).toBe(true)
    expect(error).toBeInstanceOf(AIError)
  })

  it('accepts custom message', () => {
    const error = new RateLimitError('custom message')

    expect(error.message).toBe('custom message')
    expect(error.retryable).toBe(true)
  })
})

describe('TimeoutError', () => {
  it('sets correct defaults', () => {
    const error = new TimeoutError()

    expect(error.message).toBe('Request timed out')
    expect(error.code).toBe('TIMEOUT')
    expect(error.retryable).toBe(true)
    expect(error).toBeInstanceOf(AIError)
  })
})

describe('ValidationError', () => {
  it('is not retryable', () => {
    const error = new ValidationError()

    expect(error.message).toBe('Validation failed')
    expect(error.code).toBe('VALIDATION')
    expect(error.retryable).toBe(false)
  })
})

describe('UsageLimitError', () => {
  it('is not retryable', () => {
    const error = new UsageLimitError()

    expect(error.message).toBe('Usage limit exceeded')
    expect(error.code).toBe('USAGE_LIMIT')
    expect(error.retryable).toBe(false)
  })
})

describe('shouldRetry', () => {
  it('returns true for retryable AIErrors', () => {
    expect(shouldRetry(new RateLimitError())).toBe(true)
    expect(shouldRetry(new TimeoutError())).toBe(true)
  })

  it('returns false for non-retryable AIErrors', () => {
    expect(shouldRetry(new ValidationError())).toBe(false)
    expect(shouldRetry(new UsageLimitError())).toBe(false)
  })

  it('returns true for network errors', () => {
    expect(shouldRetry(new Error('network error occurred'))).toBe(true)
  })

  it('returns true for timeout errors in message', () => {
    expect(shouldRetry(new Error('request timeout'))).toBe(true)
  })

  it('returns false for generic errors', () => {
    expect(shouldRetry(new Error('something went wrong'))).toBe(false)
  })
})
