import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { createAiTask } from '@/lib/ai-tasks'
import { prisma } from '@/lib/prisma'
import { checkApiRateLimit } from '@/lib/api-rate-limiter'

const schema = z.object({
  applicationId: z.string(),
  voice: z
    .enum(['auto', 'professional', 'casual', 'friendly', 'research'])
    .optional()
    .default('auto'),
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
    const { applicationId, voice } = schema.parse(body)

    // Verify job fit assessment was completed before generating cover letter
    const application = await prisma.application.findUnique({
      where: { id: applicationId, user_id: user.id },
      select: { fit_score: true },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.fit_score === null) {
      return NextResponse.json(
        {
          error:
            'Job fit assessment must be completed before generating a cover letter. Please run the fit assessment first.',
        },
        { status: 400 }
      )
    }

    // Map 'auto' to undefined so the engine uses AI-recommended voice
    const effectiveVoice = voice === 'auto' ? undefined : voice

    const taskId = await createAiTask({
      userId: user.id,
      type: 'COVER_LETTER_GENERATION',
      applicationId,
      data: { voice: effectiveVoice },
    })

    return NextResponse.json({ taskId })
  } catch (error: unknown) {
    console.error('Cover letter generation error:', error)
    return NextResponse.json({ error: 'Failed to start cover letter generation' }, { status: 400 })
  }
}
