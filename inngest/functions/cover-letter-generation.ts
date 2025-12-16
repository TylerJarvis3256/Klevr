import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { generateCoverLetterContent } from '@/lib/cover-letter-generator'
import { renderCoverLetterPDF } from '@/lib/pdf/renderer'
import { uploadBuffer, generateDocumentKey } from '@/lib/s3'
import { incrementUsage, checkUsageLimit } from '@/lib/usage'
import { DocumentType, AiTaskStatus } from '@prisma/client'
import { ParsedResume } from '@/lib/resume-parser'

export const coverLetterGenerationFunction = inngest.createFunction(
  {
    id: 'cover-letter-generation',
    name: 'Generate Tailored Cover Letter',
    retries: 2,
  },
  { event: 'cover-letter/generate' },
  async ({ event, step }) => {
    const { userId, taskId, applicationId } = event.data

    // Step 1: Check usage limit
    const canProceed = await step.run('check-usage-limit', async () => {
      return checkUsageLimit(userId, 'COVER_LETTER_GENERATION')
    })

    if (!canProceed) {
      await step.run('mark-failure-limit', async () => {
        await prisma.aiTask.update({
          where: { id: taskId },
          data: {
            status: AiTaskStatus.FAILED,
            completed_at: new Date(),
            error_message: 'Cover letter generation limit exceeded for this month',
          },
        })
      })
      throw new Error('Cover letter generation limit exceeded for this month')
    }

    // Step 2: Mark running
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
      // Step 3: Fetch data
      const application = await step.run('fetch-data', async () => {
        return prisma.application.findUnique({
          where: { id: applicationId },
          include: {
            Job: true,
            User: {
              include: {
                Profile: true,
              },
            },
          },
        })
      })

      if (!application?.User.Profile?.parsed_resume) {
        throw new Error('User profile or resume not found')
      }

      if (!application.User.Profile.parsed_resume_confirmed_at) {
        throw new Error('User has not confirmed resume')
      }

      // Step 4: Generate content
      const content = await step.run('generate-content', async () => {
        return generateCoverLetterContent(
          userId,
          application.User.Profile!.full_name || 'Your Name',
          application.User.Profile!.parsed_resume as unknown as ParsedResume,
          application.Job as any,
          application.User.Profile!.skills || []
        )
      })

      // Step 5: Render PDF
      const pdfBuffer = await step.run('render-pdf', async () => {
        return renderCoverLetterPDF(
          content,
          {
            name: application.User.Profile!.full_name || 'Your Name',
            email: application.User.email,
            phone: (application.User.Profile!.parsed_resume as any)?.personal?.phone,
          },
          {
            title: application.Job.title,
            company: application.Job.company,
          }
        )
      })

      // Step 6: Upload to S3
      const key = await step.run('upload-to-s3', async () => {
        const documentKey = generateDocumentKey(applicationId, 'cover-letter')
        // Ensure pdfBuffer is a proper Buffer
        const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer as any)
        await uploadBuffer(documentKey, buffer, 'application/pdf')
        return documentKey
      })

      // Step 7: Save document record
      const document = await step.run('save-document', async () => {
        return prisma.generatedDocument.create({
          data: {
            application_id: applicationId,
            type: DocumentType.COVER_LETTER,
            storage_url: key,
            structured_data: { content } as any,
            prompt_version: 'cover-letter-generate-v1.0.0',
            model_used: 'gpt-4o-2024-05-13',
          },
        })
      })

      // Step 8: Increment usage
      await step.run('increment-usage', async () => {
        await incrementUsage(userId, 'COVER_LETTER_GENERATION')
      })

      // Step 9: Mark success
      await step.run('mark-success', async () => {
        await prisma.aiTask.update({
          where: { id: taskId },
          data: {
            status: AiTaskStatus.SUCCEEDED,
            completed_at: new Date(),
            result_ref: applicationId,
          },
        })
      })

      return { documentId: document.id }
    } catch (error) {
      // Mark failure
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
