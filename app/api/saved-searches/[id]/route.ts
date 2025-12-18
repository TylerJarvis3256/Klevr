import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateNextRunAt } from '@/lib/saved-searches'

const updateSavedSearchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  query_config: z
    .object({
      what: z.string().optional(),
      what_exclude: z.string().optional(),
      where: z.string().optional(),
      salary_min: z.number().optional(),
      full_time: z.union([z.literal(0), z.literal(1)]).optional(),
      permanent: z.union([z.literal(0), z.literal(1)]).optional(),
      results_per_page: z.number().optional(),
      sort_by: z.enum(['date', 'salary']).optional(),
    })
    .optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  schedule_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  day_of_week: z.number().min(1).max(7).optional(),
  day_of_month: z.number().min(1).max(31).optional(),
  user_timezone: z.string().optional(),
  notify_in_app: z.boolean().optional(),
  notify_email: z.boolean().optional(),
})

/**
 * GET /api/saved-searches/[id]
 *
 * Get single saved search with latest run info
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const savedSearch = await prisma.savedSearch.findUnique({
      where: {
        id,
        user_id: user.id,
      },
      include: {
        SavedSearchRun: {
          orderBy: { ran_at: 'desc' },
          take: 5, // Last 5 runs
        },
      },
    })

    if (!savedSearch) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 })
    }

    return NextResponse.json(savedSearch)
  } catch (error) {
    console.error('Error fetching saved search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/saved-searches/[id]
 *
 * Update saved search
 * - Recalculates next_run_at if frequency or schedule changed
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateSavedSearchSchema.parse(body)

    // Verify ownership
    const existing = await prisma.savedSearch.findUnique({
      where: {
        id,
        user_id: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 })
    }

    // Recalculate next_run_at if schedule changed
    let nextRunAt = existing.next_run_at
    if (
      data.frequency ||
      data.schedule_time ||
      data.day_of_week !== undefined ||
      data.day_of_month !== undefined ||
      data.user_timezone
    ) {
      nextRunAt = calculateNextRunAt({
        frequency: data.frequency || existing.frequency,
        scheduleTime: data.schedule_time || '08:00', // Default if not provided
        dayOfWeek: data.day_of_week !== undefined ? data.day_of_week : undefined,
        dayOfMonth: data.day_of_month !== undefined ? data.day_of_month : undefined,
        timezone: data.user_timezone || existing.user_timezone || 'America/New_York',
      })
    }

    // Update saved search
    const updated = await prisma.savedSearch.update({
      where: {
        id,
      },
      data: {
        ...data,
        next_run_at: nextRunAt,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.format() }, { status: 400 })
    }
    console.error('Error updating saved search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/saved-searches/[id]
 *
 * Delete (soft delete) saved search by setting active = false
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const existing = await prisma.savedSearch.findUnique({
      where: {
        id,
        user_id: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 })
    }

    // Soft delete
    await prisma.savedSearch.update({
      where: {
        id,
      },
      data: {
        active: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting saved search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
