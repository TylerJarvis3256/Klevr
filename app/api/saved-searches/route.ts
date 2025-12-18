import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateNextRunAt } from '@/lib/saved-searches'
import { logActivity } from '@/lib/activity-log'

const createSavedSearchSchema = z.object({
  name: z.string().min(1).max(100),
  query_config: z.object({
    what: z.string().optional(),
    what_exclude: z.string().optional(),
    where: z.string().optional(),
    salary_min: z.number().optional(),
    full_time: z.union([z.literal(0), z.literal(1)]).optional(),
    permanent: z.union([z.literal(0), z.literal(1)]).optional(),
    results_per_page: z.number().optional(),
    sort_by: z.enum(['date', 'salary']).optional(),
  }),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  schedule_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  day_of_week: z.number().min(1).max(7).optional(), // 1 = Monday, 7 = Sunday
  day_of_month: z.number().min(1).max(31).optional(),
  user_timezone: z.string().default('America/New_York'),
  notify_in_app: z.boolean().default(true),
  notify_email: z.boolean().default(true),
})

/**
 * GET /api/saved-searches
 *
 * List user's saved searches with latest run info
 */
export async function GET(_request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searches = await prisma.savedSearch.findMany({
      where: {
        user_id: user.id,
        active: true,
      },
      include: {
        SavedSearchRun: {
          orderBy: { ran_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ searches })
  } catch (error) {
    console.error('Error fetching saved searches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/saved-searches
 *
 * Create new saved search
 * - Validates user can have max 3 active saved searches
 * - Calculates next_run_at based on frequency and timezone
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createSavedSearchSchema.parse(body)

    // Check if user already has 3 active saved searches
    const activeSearchCount = await prisma.savedSearch.count({
      where: {
        user_id: user.id,
        active: true,
      },
    })

    if (activeSearchCount >= 3) {
      // Get existing searches for error response
      const existingSearches = await prisma.savedSearch.findMany({
        where: {
          user_id: user.id,
          active: true,
        },
        select: {
          id: true,
          name: true,
          frequency: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
      })

      return NextResponse.json(
        {
          error: 'Maximum 3 saved searches allowed',
          existingSearches,
        },
        { status: 400 }
      )
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunAt({
      frequency: data.frequency,
      scheduleTime: data.schedule_time,
      dayOfWeek: data.day_of_week,
      dayOfMonth: data.day_of_month,
      timezone: data.user_timezone,
    })

    // Create saved search
    const savedSearch = await prisma.savedSearch.create({
      data: {
        user_id: user.id,
        name: data.name,
        query_config: data.query_config,
        frequency: data.frequency,
        user_timezone: data.user_timezone,
        notify_in_app: data.notify_in_app,
        notify_email: data.notify_email,
        next_run_at: nextRunAt,
      },
    })

    // Log activity (non-blocking)
    logActivity({
      user_id: user.id,
      type: 'SEARCH_SAVED',
      metadata: {
        search_id: savedSearch.id,
        search_name: savedSearch.name,
        frequency: savedSearch.frequency,
      },
    }).catch(err => console.error('Failed to log search saved activity:', err))

    return NextResponse.json(savedSearch, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.format() }, { status: 400 })
    }
    console.error('Error creating saved search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
