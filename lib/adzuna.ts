import { z } from 'zod'
import { prisma } from './prisma'

/**
 * Adzuna API Client
 *
 * Provides type-safe access to Adzuna Job Search API with:
 * - Rate limiting (25/min, 250/day, 1000/week, 2500/month)
 * - Request logging
 * - Error handling
 *
 * API Documentation: https://developer.adzuna.com/docs/search
 */

// Environment variables
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY
const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs/us'

// Rate limits (from Adzuna TOS)
const RATE_LIMITS = {
  PER_MINUTE: 25,
  PER_DAY: 250,
  PER_WEEK: 1000,
  PER_MONTH: 2500,
} as const

// Zod schemas for type safety
export const AdzunaSearchParamsSchema = z.object({
  what: z.string().optional(),
  what_exclude: z.string().optional(),
  where: z.string().optional(),
  salary_min: z.number().optional(),
  full_time: z.union([z.literal(0), z.literal(1)]).optional(),
  permanent: z.union([z.literal(0), z.literal(1)]).optional(),
  results_per_page: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
  sort_by: z.enum(['date', 'salary']).default('date'),
})

export type AdzunaSearchParams = z.infer<typeof AdzunaSearchParamsSchema>

export const AdzunaCompanySchema = z.object({
  display_name: z.string(),
})

export const AdzunaLocationSchema = z.object({
  display_name: z.string(),
  area: z.array(z.string()).optional(),
})

export const AdzunaCategorySchema = z.object({
  label: z.string(),
  tag: z.string().optional(),
})

export const AdzunaJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: AdzunaCompanySchema,
  location: AdzunaLocationSchema,
  description: z.string(),
  created: z.string(), // ISO date string
  redirect_url: z.string().url(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  salary_is_predicted: z.union([z.literal(0), z.literal(1)]).optional(),
  contract_type: z.string().optional(),
  contract_time: z.string().optional(),
  category: AdzunaCategorySchema.optional(),
})

export type AdzunaJob = z.infer<typeof AdzunaJobSchema>

export const AdzunaSearchResponseSchema = z.object({
  results: z.array(AdzunaJobSchema),
  count: z.number(),
  mean: z.number().optional(), // Mean salary
  __CLASS__: z.string().optional(),
})

export type AdzunaSearchResponse = z.infer<typeof AdzunaSearchResponseSchema>

/**
 * Check if we can make an Adzuna API request without exceeding rate limits
 */
export async function canMakeAdzunaRequest(): Promise<{
  allowed: boolean
  reason?: string
  resetTime?: Date
}> {
  const now = new Date()

  // Time windows
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Count requests in each window
  const [perMinute, perDay, perWeek, perMonth] = await Promise.all([
    prisma.adzunaRequestLog.count({
      where: { created_at: { gte: oneMinuteAgo } },
    }),
    prisma.adzunaRequestLog.count({
      where: { created_at: { gte: oneDayAgo } },
    }),
    prisma.adzunaRequestLog.count({
      where: { created_at: { gte: oneWeekAgo } },
    }),
    prisma.adzunaRequestLog.count({
      where: { created_at: { gte: oneMonthAgo } },
    }),
  ])

  // Check limits
  if (perMinute >= RATE_LIMITS.PER_MINUTE) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${perMinute}/${RATE_LIMITS.PER_MINUTE} requests per minute`,
      resetTime: new Date(now.getTime() + 60 * 1000),
    }
  }

  if (perDay >= RATE_LIMITS.PER_DAY) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${perDay}/${RATE_LIMITS.PER_DAY} requests per day`,
      resetTime: new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000),
    }
  }

  if (perWeek >= RATE_LIMITS.PER_WEEK) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${perWeek}/${RATE_LIMITS.PER_WEEK} requests per week`,
      resetTime: new Date(oneWeekAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
    }
  }

  if (perMonth >= RATE_LIMITS.PER_MONTH) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${perMonth}/${RATE_LIMITS.PER_MONTH} requests per month`,
      resetTime: new Date(oneMonthAgo.getTime() + 30 * 24 * 60 * 60 * 1000),
    }
  }

  return { allowed: true }
}

/**
 * Log an Adzuna API request for rate limit tracking
 */
export async function logAdzunaRequest(
  requestType: 'SEARCH' | 'DETAILS',
  statusCode: number | null,
  rateLimited: boolean = false
): Promise<void> {
  try {
    await prisma.adzunaRequestLog.create({
      data: {
        request_type: requestType,
        status_code: statusCode,
        rate_limited: rateLimited,
      },
    })
  } catch (error) {
    console.error('[Adzuna] Failed to log request:', error)
    // Non-blocking - don't throw
  }
}

/**
 * Build Adzuna API URL with parameters
 */
function buildAdzunaUrl(endpoint: string, params: Record<string, any>): string {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error('Adzuna API credentials not configured')
  }

  const url = new URL(`${ADZUNA_BASE_URL}/${endpoint}`)

  // Add auth params
  url.searchParams.append('app_id', ADZUNA_APP_ID)
  url.searchParams.append('app_key', ADZUNA_APP_KEY)

  // Add other params
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value))
    }
  })

  return url.toString()
}

/**
 * Search for jobs using Adzuna API
 */
export async function searchAdzunaJobs(
  params: AdzunaSearchParams
): Promise<AdzunaSearchResponse> {
  // Validate params
  const validatedParams = AdzunaSearchParamsSchema.parse(params)

  // Check rate limits
  const rateLimitCheck = await canMakeAdzunaRequest()
  if (!rateLimitCheck.allowed) {
    throw new Error(rateLimitCheck.reason || 'Rate limit exceeded')
  }

  // Build URL
  const url = buildAdzunaUrl('search/1', validatedParams)

  try {
    // Make request
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Log request
    await logAdzunaRequest('SEARCH', response.status, response.status === 429)

    // Handle rate limit
    if (response.status === 429) {
      throw new Error('Adzuna API rate limit exceeded')
    }

    // Handle errors
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Adzuna] API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })
      throw new Error(`Adzuna API error: ${response.status} ${response.statusText}`)
    }

    // Parse response
    const data = await response.json()
    const validatedResponse = AdzunaSearchResponseSchema.parse(data)

    return validatedResponse
  } catch (error) {
    // Log failed request
    await logAdzunaRequest('SEARCH', null, false)

    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error calling Adzuna API')
  }
}

/**
 * Get current rate limit status
 */
export async function getAdzunaRateLimitStatus(): Promise<{
  perMinute: { used: number; limit: number }
  perDay: { used: number; limit: number }
  perWeek: { used: number; limit: number }
  perMonth: { used: number; limit: number }
}> {
  const now = new Date()

  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [perMinute, perDay, perWeek, perMonth] = await Promise.all([
    prisma.adzunaRequestLog.count({
      where: { created_at: { gte: oneMinuteAgo } },
    }),
    prisma.adzunaRequestLog.count({
      where: { created_at: { gte: oneDayAgo } },
    }),
    prisma.adzunaRequestLog.count({
      where: { created_at: { gte: oneWeekAgo } },
    }),
    prisma.adzunaRequestLog.count({
      where: { created_at: { gte: oneMonthAgo } },
    }),
  ])

  return {
    perMinute: { used: perMinute, limit: RATE_LIMITS.PER_MINUTE },
    perDay: { used: perDay, limit: RATE_LIMITS.PER_DAY },
    perWeek: { used: perWeek, limit: RATE_LIMITS.PER_WEEK },
    perMonth: { used: perMonth, limit: RATE_LIMITS.PER_MONTH },
  }
}
