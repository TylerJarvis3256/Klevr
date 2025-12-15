import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserUsage, USAGE_LIMITS, getUsagePercentage } from '@/lib/usage'
import { getCurrentMonth } from '@/lib/utils'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usage = await getUserUsage(user.id)
    const currentMonth = getCurrentMonth()

    // Calculate reset date (first day of next month)
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    return NextResponse.json({
      usage: {
        fitAssessments: {
          current: usage.fit_count,
          limit: USAGE_LIMITS.JOB_SCORING,
          percentage: getUsagePercentage(usage.fit_count, USAGE_LIMITS.JOB_SCORING),
        },
        resumes: {
          current: usage.resume_count,
          limit: USAGE_LIMITS.RESUME_GENERATION,
          percentage: getUsagePercentage(usage.resume_count, USAGE_LIMITS.RESUME_GENERATION),
        },
        coverLetters: {
          current: usage.cover_letter_count,
          limit: USAGE_LIMITS.COVER_LETTER_GENERATION,
          percentage: getUsagePercentage(usage.cover_letter_count, USAGE_LIMITS.COVER_LETTER_GENERATION),
        },
      },
      month: currentMonth,
      resetDate: nextMonth.toISOString(),
    })
  } catch (error: any) {
    console.error('GET /api/settings/usage error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
