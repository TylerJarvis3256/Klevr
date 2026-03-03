import { getUserRateLimiter } from './rate-limiter'
import { NextResponse } from 'next/server'

/**
 * Check API rate limit for a user. Returns a 429 response if rate limit
 * is exceeded, or null if the request is allowed.
 */
export async function checkApiRateLimit(userId: string): Promise<NextResponse | null> {
  const limiter = getUserRateLimiter(userId)
  const allowed = await limiter.removeTokens(1)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  return null
}
