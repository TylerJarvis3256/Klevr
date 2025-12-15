import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { createAiTask } from '@/lib/ai-tasks'
import { prisma } from '@/lib/prisma'
import { checkUsageLimit } from '@/lib/usage'

const schema = z.object({
  applicationId: z.string(),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { applicationId } = schema.parse(body)

    // Validate application belongs to user
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        user_id: true,
        score_count: true,
      },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if this is beyond the first free re-score
    // score_count = 1 means initial assessment
    // score_count = 2 means first re-score (free)
    // score_count > 2 means additional re-scores (count toward usage)
    if (application.score_count >= 2) {
      const canProceed = await checkUsageLimit(user.id, 'JOB_SCORING')
      if (!canProceed) {
        return NextResponse.json(
          { error: 'Monthly job scoring limit exceeded. Upgrade or wait until next month.' },
          { status: 429 }
        )
      }
    }

    // Check if profile exists and resume is confirmed
    const profile = await prisma.profile.findUnique({
      where: { user_id: user.id },
      select: { parsed_resume_confirmed_at: true },
    })

    if (!profile?.parsed_resume_confirmed_at) {
      return NextResponse.json(
        { error: 'Please confirm your resume before scoring jobs' },
        { status: 400 }
      )
    }

    // Create AI task for re-scoring
    const taskId = await createAiTask({
      userId: user.id,
      type: 'JOB_SCORING',
      applicationId,
      data: {},
    })

    return NextResponse.json({ taskId })
  } catch (error: any) {
    console.error('Job scoring error:', error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
