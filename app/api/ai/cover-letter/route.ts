import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { createAiTask } from '@/lib/ai-tasks'

const schema = z.object({
  applicationId: z.string(),
  voice: z
    .enum(['professional', 'casual', 'friendly', 'research'])
    .optional()
    .default('professional'),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { applicationId, voice } = schema.parse(body)

    const taskId = await createAiTask({
      userId: user.id,
      type: 'COVER_LETTER_GENERATION',
      applicationId,
      data: { voice },
    })

    return NextResponse.json({ taskId })
  } catch (error: unknown) {
    console.error('Cover letter generation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
