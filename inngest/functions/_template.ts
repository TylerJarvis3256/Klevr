import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { AiTaskStatus } from '@prisma/client'

export const templateFunction = inngest.createFunction(
  {
    id: 'function-name',
    name: 'Human Readable Name',
    retries: 2,
  },
  { event: 'event/name' },
  async ({ event, step }) => {
    const { taskId } = event.data

    // Step 1: Update task to RUNNING
    await step.run('mark-running', async () => {
      await prisma.aiTask.update({
        where: { id: taskId },
        data: {
          status: AiTaskStatus.RUNNING,
          started_at: new Date(),
        },
      })
    })

    try {
      // Step 2: Do work
      await step.run('do-work', async () => {
        // Your work here
        return { success: true }
      })

      // Step 3: Mark success
      await step.run('mark-success', async () => {
        await prisma.aiTask.update({
          where: { id: taskId },
          data: {
            status: AiTaskStatus.SUCCEEDED,
            completed_at: new Date(),
            result_ref: 'result-ref',
          },
        })
      })

      return { success: true }
    } catch (error) {
      // Step 4: Mark failure
      await step.run('mark-failure', async () => {
        await prisma.aiTask.update({
          where: { id: taskId },
          data: {
            status: AiTaskStatus.FAILED,
            completed_at: new Date(),
            error_message: error instanceof Error ? error.message : 'Unknown error',
          },
        })
      })

      throw error
    }
  }
)
