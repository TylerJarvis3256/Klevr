import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { createAiTask } from '@/lib/ai-tasks'

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

    const taskId = await createAiTask({
      userId: user.id,
      type: 'RESUME_GENERATION',
      applicationId,
      data: {},
    })

    return NextResponse.json({ taskId })
  } catch (error: unknown) {
    console.error('Resume generation error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
