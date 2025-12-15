import { prisma } from './prisma'
import { getCurrentMonth } from './utils'
import { AiTaskType } from '@prisma/client'

export const USAGE_LIMITS = {
  JOB_SCORING: 200,
  RESUME_GENERATION: 30,
  COVER_LETTER_GENERATION: 30,
  COMPANY_RESEARCH: 100, // No hard limit mentioned, but track it
} as const

/**
 * Get current month's usage for a user
 */
export async function getUserUsage(userId: string) {
  const month = getCurrentMonth()

  const usage = await prisma.usageTracking.findUnique({
    where: {
      user_id_month: {
        user_id: userId,
        month,
      },
    },
  })

  return (
    usage || {
      fit_count: 0,
      resume_count: 0,
      cover_letter_count: 0,
    }
  )
}

/**
 * Increment usage counter
 */
export async function incrementUsage(userId: string, type: AiTaskType) {
  const month = getCurrentMonth()

  const fieldMap = {
    JOB_SCORING: 'fit_count',
    RESUME_GENERATION: 'resume_count',
    COVER_LETTER_GENERATION: 'cover_letter_count',
    COMPANY_RESEARCH: 'fit_count', // Track with fit for now
  }

  const field = fieldMap[type]
  if (!field) return

  await prisma.usageTracking.upsert({
    where: {
      user_id_month: {
        user_id: userId,
        month,
      },
    },
    create: {
      user_id: userId,
      month,
      [field]: 1,
    },
    update: {
      [field]: { increment: 1 },
    },
  })
}

/**
 * Check if user has exceeded limit
 */
export async function checkUsageLimit(userId: string, type: AiTaskType): Promise<boolean> {
  const usage = await getUserUsage(userId)

  const limits = {
    JOB_SCORING: { current: usage.fit_count, max: USAGE_LIMITS.JOB_SCORING },
    RESUME_GENERATION: { current: usage.resume_count, max: USAGE_LIMITS.RESUME_GENERATION },
    COVER_LETTER_GENERATION: {
      current: usage.cover_letter_count,
      max: USAGE_LIMITS.COVER_LETTER_GENERATION,
    },
    COMPANY_RESEARCH: { current: usage.fit_count, max: USAGE_LIMITS.COMPANY_RESEARCH },
  }

  const limit = limits[type]
  return limit.current < limit.max
}

/**
 * Get usage percentage
 */
export function getUsagePercentage(current: number, max: number): number {
  return Math.round((current / max) * 100)
}
