import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { generateCoverLetterV2 } from '@/lib/cover-letter-engine'
import { buildStructuredProfile } from '@/lib/resume-generator'
import { renderCoverLetterPDFv2 } from '@/lib/pdf/renderer'
import { uploadBuffer, generateDocumentKey } from '@/lib/s3'
import { incrementUsage, checkUsageLimit } from '@/lib/usage'
import { logAiTaskComplete } from '@/lib/activity-log'
import { DocumentType, AiTaskStatus } from '@prisma/client'
import { ParsedResume } from '@/lib/resume-parser'
import type { CoverLetterVoice } from '@/lib/cover-letter-types'

export const coverLetterGenerationFunction = inngest.createFunction(
  {
    id: 'cover-letter-generation',
    name: 'Generate Tailored Cover Letter',
    retries: 2,
  },
  { event: 'cover-letter/generate' },
  async ({ event, step }) => {
    const { userId, taskId, applicationId, voice: rawVoice } = event.data
    const voice = rawVoice ? (rawVoice as CoverLetterVoice) : undefined

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
                Project: {
                  orderBy: { display_order: 'asc' },
                },
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

      // Step 4: Build structured profile
      const profileData = await step.run('build-profile', async () => {
        return buildStructuredProfile(
          application.User.Profile!.parsed_resume as unknown as ParsedResume,
          {
            full_name: application.User.Profile!.full_name,
            skills: application.User.Profile!.skills || [],
          },
          application.User.email,
          application.User.Project || []
        )
      })

      // Step 5 + 6: Run semantic analysis + generate content via V2 engine
      const engineOutput = await step.run('generate-cover-letter-v2', async () => {
        return generateCoverLetterV2(userId, profileData, application.Job as any, voice)
      })

      // Step 7: Render PDF via Markdown -> HTML -> Puppeteer
      const pdfBuffer = await step.run('render-pdf', async () => {
        return renderCoverLetterPDFv2(engineOutput.markdown)
      })

      // Step 8: Upload to S3
      const key = await step.run('upload-to-s3', async () => {
        const documentKey = generateDocumentKey(applicationId, 'cover-letter')
        const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer as any)
        await uploadBuffer(documentKey, buffer, 'application/pdf')
        return documentKey
      })

      // Step 9: Save document record with rich structured_data
      const document = await step.run('save-document', async () => {
        const now = new Date()
        const month = now.toLocaleString('en-US', { month: 'short' })
        const year = now.getFullYear()
        const userName = application.User.Profile!.full_name || 'Cover Letter'
        const displayName = `${userName} ${application.Job.title} ${application.Job.company} Cover Letter ${month} ${year}`

        return prisma.generatedDocument.create({
          data: {
            application_id: applicationId,
            type: DocumentType.COVER_LETTER,
            storage_url: key,
            display_name: displayName,
            structured_data: {
              content: engineOutput.content,
              markdown: engineOutput.markdown,
              metadata: engineOutput.metadata,
            } as any,
            prompt_version: 'cover-letter-generate-v2.0.0',
            model_used: 'claude-sonnet-4-5-20250929',
          },
        })
      })

      // Step 10: Increment usage
      await step.run('increment-usage', async () => {
        await incrementUsage(userId, 'COVER_LETTER_GENERATION')
      })

      // Step 11: Mark success and log activity
      await step.run('mark-success', async () => {
        await prisma.aiTask.update({
          where: { id: taskId },
          data: {
            status: AiTaskStatus.SUCCEEDED,
            completed_at: new Date(),
            result_ref: applicationId,
          },
        })

        await logAiTaskComplete(userId, applicationId, 'COVER_LETTER_GENERATED', {
          document_id: document.id,
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
