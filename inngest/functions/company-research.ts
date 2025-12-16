import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { generateCompanyResearch } from '@/lib/company-researcher'
import { logAiTaskComplete } from '@/lib/activity-log'
import { AiTaskStatus } from '@prisma/client'

export const companyResearchFunction = inngest.createFunction(
  {
    id: 'company-research',
    name: 'Company Research Summary',
    retries: 2,
  },
  { event: 'company/research' },
  async ({ event, step }) => {
    const { userId, taskId, applicationId } = event.data

    // Step 1: Mark running
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
      // Step 2: Fetch application and job
      const application = await step.run('fetch-application', async () => {
        return prisma.application.findUnique({
          where: { id: applicationId },
          include: {
            Job: true,
          },
        })
      })

      if (!application) {
        throw new Error('Application not found')
      }

      // Step 3: Generate research
      const research = await step.run('generate-research', async () => {
        return generateCompanyResearch(
          userId,
          application.Job.company,
          application.Job.title,
          application.Job.job_description_raw
        )
      })

      // Step 4: Save to application
      await step.run('save-research', async () => {
        await prisma.application.update({
          where: { id: applicationId },
          data: {
            company_research: research as any,
          },
        })
      })

      // Step 5: Mark success and log activity
      await step.run('mark-success', async () => {
        await prisma.aiTask.update({
          where: { id: taskId },
          data: {
            status: AiTaskStatus.SUCCEEDED,
            completed_at: new Date(),
            result_ref: applicationId, // Reference to the application with updated research
          },
        })

        // Log company research completed
        await logAiTaskComplete(
          userId,
          applicationId,
          'COMPANY_RESEARCH_COMPLETED'
        )
      })

      return { success: true }
    } catch (error: any) {
      // Mark as failed
      await step.run('mark-failure', async () => {
        await prisma.aiTask.update({
          where: { id: taskId },
          data: {
            status: AiTaskStatus.FAILED,
            completed_at: new Date(),
            error_message: error.message || 'Unknown error',
          },
        })
      })
      throw error
    }
  }
)
