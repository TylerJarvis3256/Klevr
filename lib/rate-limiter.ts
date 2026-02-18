/**
 * Shared rate limiter for AI API clients (OpenAI, Anthropic).
 * Token-bucket algorithm with configurable capacity and refill rate.
 */
export class RateLimiter {
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
