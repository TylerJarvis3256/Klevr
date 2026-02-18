import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the rate limiter
vi.mock('@/lib/rate-limiter', () => ({
  getUserRateLimiter: vi.fn().mockReturnValue({
    removeTokens: vi.fn().mockResolvedValue(true),
  }),
}))

// Mock the Anthropic SDK — default export must be a constructor
vi.mock('@anthropic-ai/sdk', () => {
  const Anthropic = function () {
    return { messages: { create: vi.fn() } }
  } as any
  Anthropic.APIError = class APIError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
      this.name = 'APIError'
    }
  }
  return { default: Anthropic }
})

import { callAnthropic, parseAnthropicJson, ANTHROPIC_MODELS } from '@/lib/anthropic'
import { getUserRateLimiter } from '@/lib/rate-limiter'
import { createMockAnthropicResponse } from '@/__tests__/helpers'

describe('ANTHROPIC_MODELS', () => {
  it('exports pinned Sonnet model ID', () => {
    expect(ANTHROPIC_MODELS.SONNET).toBe('claude-sonnet-4-5-20250929')
  })
})

describe('callAnthropic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to allow by default
    vi.mocked(getUserRateLimiter).mockReturnValue({
      removeTokens: vi.fn().mockResolvedValue(true),
    } as any)
  })

  it('executes the function when rate limit allows', async () => {
    const result = await callAnthropic('user-1', async () => 'success')
    expect(result).toBe('success')
  })

  it('throws when rate limit is exceeded', async () => {
    vi.mocked(getUserRateLimiter).mockReturnValue({
      removeTokens: vi.fn().mockResolvedValue(false),
    } as any)

    await expect(callAnthropic('user-1', async () => 'ok')).rejects.toThrow('Rate limit exceeded')
  })

  it('calls onRateLimit callback when rate limited', async () => {
    vi.mocked(getUserRateLimiter).mockReturnValue({
      removeTokens: vi.fn().mockResolvedValue(false),
    } as any)
    const onRateLimit = vi.fn()

    await expect(callAnthropic('user-1', async () => 'ok', { onRateLimit })).rejects.toThrow(
      'Rate limit exceeded'
    )

    expect(onRateLimit).toHaveBeenCalledOnce()
  })

  it('times out after specified duration', async () => {
    const slowFn = () => new Promise<string>(resolve => setTimeout(() => resolve('late'), 5000))

    await expect(callAnthropic('user-1', slowFn, { timeout: 50 })).rejects.toThrow(
      'Anthropic call timed out'
    )
  })

  it('re-throws non-API errors', async () => {
    await expect(
      callAnthropic('user-1', async () => {
        throw new Error('network failure')
      })
    ).rejects.toThrow('network failure')
  })
})

describe('parseAnthropicJson', () => {
  it('parses valid JSON from Anthropic response', () => {
    const response = createMockAnthropicResponse('{"name": "test", "score": 85}')
    const result = parseAnthropicJson<{ name: string; score: number }>(response as any)
    expect(result).toEqual({ name: 'test', score: 85 })
  })

  it('handles nested JSON objects', () => {
    const response = createMockAnthropicResponse('{"data": {"items": [1, 2, 3]}}')
    const result = parseAnthropicJson<{ data: { items: number[] } }>(response as any)
    expect(result.data.items).toEqual([1, 2, 3])
  })

  it('throws on empty response (no text blocks)', () => {
    const response = {
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-5-20250929',
      content: [],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 100, output_tokens: 0 },
    }

    expect(() => parseAnthropicJson(response as any)).toThrow(
      'No text content in Anthropic response'
    )
  })

  it('throws on malformed JSON', () => {
    const response = {
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-5-20250929',
      content: [{ type: 'text', text: 'not valid json at all' }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 100, output_tokens: 50 },
    }

    expect(() => parseAnthropicJson(response as any)).toThrow('Invalid JSON from Anthropic')
  })
})
