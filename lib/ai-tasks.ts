import { prisma } from './prisma'
import { AiTaskType } from '@prisma/client'
import { inngest } from './inngest'

interface CreateTaskOptions {
  userId: string
  type: AiTaskType
  applicationId?: string
  data: Record<string, any>
}

/**
 * Create an AI task and trigger Inngest event
 */
export async function createAiTask({
  userId,
  type,
  applicationId,
  data,
}: CreateTaskOptions): Promise<string> {
  // Create task record
  const task = await prisma.aiTask.create({
    data: {
      user_id: userId,
      type,
      application_id: applicationId,
      status: 'PENDING',
    },
  })

  // Map task type to event name
  const eventMap = {
    JOB_SCORING: 'job/assess-fit',
    RESUME_GENERATION: 'resume/generate',
    COVER_LETTER_GENERATION: 'cover-letter/generate',
    COMPANY_RESEARCH: 'company/research',
  }

  const eventName = eventMap[type]
  if (!eventName) {
    throw new Error(`Unknown task type: ${type}`)
  }

  // Trigger Inngest event
  await inngest.send({
    name: eventName,
    data: {
      taskId: task.id,
      userId,
      applicationId,
      ...data,
    },
  })

  return task.id
}
