import crypto from 'crypto'
import { prisma } from './prisma'
import { AdzunaSearchParams, AdzunaSearchResponse } from './adzuna'

/**
 * Adzuna Search Cache
 *
 * Database-based caching for Adzuna search results to:
 * - Reduce API calls and respect rate limits
 * - Improve response times for repeated searches
 * - Enable deduplication within saved search runs
 */

// Cache TTL configurations
const CACHE_TTL = {
  INTERACTIVE_SEARCH: 15 * 60 * 1000, // 15 minutes for user searches
  SAVED_SEARCH_RUN: 24 * 60 * 60 * 1000, // 24 hours for saved search deduplication
} as const

/**
 * Generate a stable cache key from search parameters
 */
export function generateCacheKey(params: AdzunaSearchParams): string {
  // Sort keys for stable stringification
  const sortedKeys = Object.keys(params).sort()
  const normalized: Record<string, any> = {}

  sortedKeys.forEach(key => {
    const value = params[key as keyof AdzunaSearchParams]
    if (value !== undefined && value !== null && value !== '') {
      normalized[key] = value
    }
  })

  // Create SHA256 hash
  const jsonString = JSON.stringify(normalized)
  return crypto.createHash('sha256').update(jsonString).digest('hex')
}

/**
 * Get cached search results if available and not expired
 */
export async function getCachedSearchResults(
  params: AdzunaSearchParams
): Promise<AdzunaSearchResponse | null> {
  const cacheKey = generateCacheKey(params)
  const now = new Date()

  try {
    const cached = await prisma.adzunaSearchCache.findUnique({
      where: { cache_key: cacheKey },
    })

    if (!cached) {
      return null
    }

    // Check if expired
    if (cached.expires_at < now) {
      // Clean up expired cache entry (non-blocking)
      prisma.adzunaSearchCache
        .delete({ where: { id: cached.id } })
        .catch(err => console.error('[Cache] Failed to delete expired entry:', err))

      return null
    }

    // Return cached results
    return cached.results as AdzunaSearchResponse
  } catch (error) {
    console.error('[Cache] Error retrieving cached results:', error)
    return null
  }
}

/**
 * Store search results in cache
 */
export async function setCachedSearchResults(
  params: AdzunaSearchParams,
  results: AdzunaSearchResponse,
  ttlMs: number = CACHE_TTL.INTERACTIVE_SEARCH
): Promise<void> {
  const cacheKey = generateCacheKey(params)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlMs)

  try {
    await prisma.adzunaSearchCache.upsert({
      where: { cache_key: cacheKey },
      create: {
        cache_key: cacheKey,
        results: results as any, // Prisma Json type
        expires_at: expiresAt,
      },
      update: {
        results: results as any,
        expires_at: expiresAt,
      },
    })
  } catch (error) {
    console.error('[Cache] Error storing cached results:', error)
    // Non-blocking - don't throw
  }
}

/**
 * Invalidate cache for specific search parameters
 */
export async function invalidateCachedSearch(params: AdzunaSearchParams): Promise<void> {
  const cacheKey = generateCacheKey(params)

  try {
    await prisma.adzunaSearchCache.delete({
      where: { cache_key: cacheKey },
    })
  } catch (error) {
    // Ignore if not found
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return
    }
    console.error('[Cache] Error invalidating cache:', error)
  }
}

/**
 * Clean up all expired cache entries
 * Should be run periodically (e.g., daily cron job)
 */
export async function cleanupExpiredCache(): Promise<number> {
  const now = new Date()

  try {
    const result = await prisma.adzunaSearchCache.deleteMany({
      where: {
        expires_at: { lt: now },
      },
    })

    console.log(`[Cache] Cleaned up ${result.count} expired cache entries`)
    return result.count
  } catch (error) {
    console.error('[Cache] Error cleaning up expired cache:', error)
    return 0
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number
  expiredEntries: number
  activeEntries: number
}> {
  const now = new Date()

  const [total, expired] = await Promise.all([
    prisma.adzunaSearchCache.count(),
    prisma.adzunaSearchCache.count({
      where: { expires_at: { lt: now } },
    }),
  ])

  return {
    totalEntries: total,
    expiredEntries: expired,
    activeEntries: total - expired,
  }
}
