import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateNextRunAt } from '@/lib/saved-searches'

const replaceSavedSearchSchema = z.object({
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
  day_of_week: z.number().min(1).max(7).optional(),
  day_of_month: z.number().min(1).max(31).optional(),
  user_timezone: z.string().default('America/New_York'),
  notify_in_app: z.boolean().default(true),
  notify_email: z.boolean().default(true),
})

/**
 * POST /api/saved-searches/[id]/replace
 *
 * Replace an existing saved search with a new one
 * Used when user is at max (3) saved searches and wants to save a 4th
 */
export async function POST(
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
    const data = replaceSavedSearchSchema.parse(body)

    // Verify the search to replace exists and belongs to user
    const existing = await prisma.savedSearch.findUnique({
      where: {
        id,
        user_id: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Saved search not found' }, { status: 404 })
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunAt({
      frequency: data.frequency,
      scheduleTime: data.schedule_time,
      dayOfWeek: data.day_of_week,
      dayOfMonth: data.day_of_month,
      timezone: data.user_timezone,
    })

    // Replace the saved search (update all fields)
    const replaced = await prisma.savedSearch.update({
      where: {
        id,
      },
      data: {
        name: data.name,
        query_config: data.query_config,
        frequency: data.frequency,
        user_timezone: data.user_timezone,
        notify_in_app: data.notify_in_app,
        notify_email: data.notify_email,
        next_run_at: nextRunAt,
        last_run_at: null, // Reset last run
        active: true,
      },
    })

    return NextResponse.json(replaced)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.format() }, { status: 400 })
    }
    console.error('Error replacing saved search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
