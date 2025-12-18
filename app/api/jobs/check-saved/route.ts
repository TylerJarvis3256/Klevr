import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const checkSavedSchema = z.object({
  adzunaIds: z.array(z.string()).min(1).max(50), // Limit to 50 for performance
})

/**
 * POST /api/jobs/check-saved
 *
 * Check which Adzuna job IDs are already saved in the user's pipeline
 * Returns array of saved adzuna_ids
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { adzunaIds } = checkSavedSchema.parse(body)

    // Query jobs by adzuna_id for this user
    const savedJobs = await prisma.job.findMany({
      where: {
        user_id: user.id,
        adzuna_id: {
          in: adzunaIds,
        },
      },
      select: {
        adzuna_id: true,
      },
    })

    // Return array of saved IDs
    const savedIds = savedJobs
      .map(job => job.adzuna_id)
      .filter((id): id is string => id !== null)

    return NextResponse.json({ savedIds })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.format() }, { status: 400 })
    }
    console.error('Error checking saved jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
