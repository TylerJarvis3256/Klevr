import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { createAiTask } from '@/lib/ai-tasks'
import { prisma } from '@/lib/prisma'
import { checkApiRateLimit } from '@/lib/api-rate-limiter'

const schema = z.object({
  applicationId: z.string(),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimitResponse = await checkApiRateLimit(user.id)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const { applicationId } = schema.parse(body)

    // Verify application belongs to user
    const application = await prisma.application.findUnique({
      where: { id: applicationId, user_id: user.id },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Check if profile exists and resume is confirmed
    const profile = await prisma.profile.findUnique({
      where: { user_id: user.id },
      select: { parsed_resume_confirmed_at: true },
    })

    if (!profile?.parsed_resume_confirmed_at) {
      return NextResponse.json(
        { error: 'Please confirm your resume before generating documents' },
        { status: 400 }
      )
    }

    const taskId = await createAiTask({
      userId: user.id,
      type: 'RESUME_GENERATION',
      applicationId,
      data: {},
    })

    return NextResponse.json({ taskId })
  } catch (error: unknown) {
    console.error('Resume generation error:', error)
    return NextResponse.json({ error: 'Failed to start resume generation' }, { status: 400 })
  }
}
