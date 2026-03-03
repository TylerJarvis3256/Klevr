import Anthropic from '@anthropic-ai/sdk'
import { getUserRateLimiter } from './rate-limiter'

// Initialize Anthropic client
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Pinned model IDs (never use unpinned models)
export const ANTHROPIC_MODELS = {
  SONNET: 'claude-sonnet-4-5-20250929',
} as const

/**
 * Call Anthropic with rate limiting and error handling.
 * Mirrors the callOpenAI pattern for consistency.
 */
export async function callAnthropic<T>(
  userId: string,
  fn: () => Promise<T>,
  options: {
    timeout?: number
    onRateLimit?: () => void
  } = {}
): Promise<T> {
  const limiter = getUserRateLimiter(userId)

  const allowed = await limiter.removeTokens(1)
  if (!allowed) {
    options.onRateLimit?.()
    throw new Error('Rate limit exceeded')
  }

  const timeout = options.timeout || 30000
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Anthropic call timed out')), timeout)
  })

  try {
    return await Promise.race([fn(), timeoutPromise])
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        throw new Error('Anthropic rate limit exceeded')
      }
      throw new Error(`Anthropic API error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Extract and parse JSON from an Anthropic Message response.
 * Uses prefilled assistant message technique: the request sends
 * `{ role: 'assistant', content: '{' }` so the response text
 * starts mid-object. We prepend `{` before parsing.
 */
export function parseAnthropicJson<T>(message: Anthropic.Message): T {
  const textBlock = message.content.find(block => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in Anthropic response')
  }

  const raw = '{' + textBlock.text

  try {
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Expected JSON object')
    }
    return parsed as T
  } catch {
    console.error('Failed to parse Anthropic JSON:', raw.slice(0, 200))
    throw new Error('Invalid JSON from Anthropic')
  }
}
