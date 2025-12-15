import OpenAI from 'openai'

// Initialize OpenAI client with retry and timeout settings
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  maxRetries: 2,
  timeout: 30000, // 30 seconds
})

// Pinned model IDs (never use unpinned models like "gpt-4o")
export const MODELS = {
  GPT4O: 'gpt-4o-2024-05-13',
  GPT4O_MINI: 'gpt-4o-mini-2024-07-18',
} as const

// Simple in-memory rate limiter
class RateLimiter {
  private tokens: number
  private lastRefill: number
  private readonly maxTokens: number
  private readonly refillRate: number // tokens per second

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens
    this.tokens = maxTokens
    this.refillRate = refillRate
    this.lastRefill = Date.now()
  }

  async removeTokens(count: number): Promise<boolean> {
    this.refill()

    if (this.tokens >= count) {
      this.tokens -= count
      return true
    }

    return false
  }

  private refill(): void {
    const now = Date.now()
    const timePassed = (now - this.lastRefill) / 1000 // seconds
    const tokensToAdd = timePassed * this.refillRate

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefill = now
  }
}

// Rate limiter: 60 requests per minute per user
const userLimiters = new Map<string, RateLimiter>()

export function getUserRateLimiter(userId: string): RateLimiter {
  if (!userLimiters.has(userId)) {
    // 60 tokens max, refills at 1 token per second (60/minute)
    userLimiters.set(userId, new RateLimiter(60, 1))
  }
  return userLimiters.get(userId)!
}

/**
 * Call OpenAI with rate limiting and error handling
 */
export async function callOpenAI<T>(
  userId: string,
  fn: () => Promise<T>,
  options: {
    timeout?: number
    onRateLimit?: () => void
  } = {}
): Promise<T> {
  const limiter = getUserRateLimiter(userId)

  // Wait for rate limit
  const allowed = await limiter.removeTokens(1)
  if (!allowed) {
    options.onRateLimit?.()
    throw new Error('Rate limit exceeded')
  }

  // Execute with timeout
  const timeout = options.timeout || 30000
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('OpenAI call timed out')), timeout)
  })

  try {
    return await Promise.race([fn(), timeoutPromise])
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded')
      }
      throw new Error(`OpenAI API error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Count tokens (approximate)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4)
}

/**
 * Validate JSON response from OpenAI
 */
export function parseOpenAIJson<T>(content: string | null): T {
  if (!content) {
    throw new Error('No content in OpenAI response')
  }

  try {
    return JSON.parse(content) as T
  } catch (error) {
    console.error('Failed to parse OpenAI JSON:', content)
    throw new Error('Invalid JSON from OpenAI')
  }
}
