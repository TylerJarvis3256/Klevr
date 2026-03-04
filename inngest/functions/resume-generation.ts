import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { buildStructuredProfile } from '@/lib/resume-generator'
import { generateResumeV3 } from '@/lib/resume-engine-v3'
import { analyzeJobDescription } from '@/lib/semantic-analyzer'
import { markdownToHtml } from '@/lib/pdf/markdown-to-html'
import { htmlToPdf } from '@/lib/pdf/html-to-pdf'
import { uploadBuffer, generateDocumentKey } from '@/lib/s3'
import { sanitizeFileName } from '@/lib/utils'
import { incrementUsage, checkUsageLimit } from '@/lib/usage'
import { logAiTaskComplete } from '@/lib/activity-log'
import { DocumentType, AiTaskStatus } from '@prisma/client'
import type { ParsedResume } from '@/lib/resume-parser'
import type { MarkdownUserInfo } from '@/lib/markdown/resume-to-markdown'

export const resumeGenerationFunction = inngest.createFunction(
  {
    id: 'resume-generation',
    name: 'Generate Tailored Resume',
    retries: 2,
  },
  { event: 'resume/generate' },
  async ({ event, step }) => {
    const { userId, taskId, applicationId } = event.data

    // Step 1: Check usage limit
    const canProceed = await step.run('check-usage-limit', async () => {
      return checkUsageLimit(userId, 'RESUME_GENERATION')
    })

    if (!canProceed) {
      await step.run('mark-failure-limit', async () => {
        await prisma.aiTask.update({
          where: { id: taskId },
          data: {
            status: AiTaskStatus.FAILED,
            completed_at: new Date(),
            error_message: 'Resume generation limit exceeded for this month',
          },
        })
      })
      throw new Error('Resume generation limit exceeded for this month')
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
                  orderBy: {
                    display_order: 'asc',
                  },
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

      const parsedResume = application.User.Profile.parsed_resume as unknown as ParsedResume
      const profile = application.User.Profile
      const job = application.Job

      // Step 4: Build structured profile data
      const { profileData, userInfo } = await step.run('build-profile', async () => {
        const data = buildStructuredProfile(
          parsedResume,
          { full_name: profile.full_name, skills: profile.skills || [] },
          application.User.email,
          application.User.Project || []
        )

        const info: MarkdownUserInfo = {
          name: data.personal.name,
          email: data.personal.email,
          ...(data.personal.phone && { phone: data.personal.phone }),
          ...(data.personal.location && { location: data.personal.location }),
          ...(data.personal.linkedin && { linkedin: data.personal.linkedin }),
          ...(data.personal.github && { github: data.personal.github }),
        }

        return { profileData: data, userInfo: info }
      })

      // Step 5: Semantic analysis of job description
      const analysis = await step.run('semantic-analysis', async () => {
        return analyzeJobDescription(
          userId,
          profileData,
          job as unknown as Parameters<typeof analyzeJobDescription>[2],
          (job.job_description_parsed as Record<string, unknown>) || {}
        )
      })

      // Step 6: Generate V3 content
      const v3Result = await step.run('generate-content', async () => {
        return generateResumeV3(
          userId,
          profileData,
          job as unknown as Parameters<typeof generateResumeV3>[2],
          (job.job_description_parsed as Record<string, unknown>) || {},
          analysis,
          userInfo
        )
      })

      // Step 7: Render PDF via markdown → HTML → PDF
      const pdfBuffer = await step.run('render-pdf', async () => {
        const html = markdownToHtml(v3Result.markdown)
        return htmlToPdf(html)
      })

      // Step 8: Upload to S3
      const key = await step.run('upload-to-s3', async () => {
        const documentKey = generateDocumentKey(applicationId, 'resume')
        const buffer = Buffer.isBuffer(pdfBuffer)
          ? pdfBuffer
          : Buffer.from(pdfBuffer as unknown as ArrayBuffer)
        await uploadBuffer(documentKey, buffer, 'application/pdf')
        return documentKey
      })

      // Step 9: Save document record
      const document = await step.run('save-document', async () => {
        const userName = profile.full_name || 'Resume'
        const displayName = sanitizeFileName(`${userName} ${job.title} ${job.company}`)

        return prisma.generatedDocument.create({
          data: {
            application_id: applicationId,
            type: DocumentType.RESUME,
            storage_url: key,
            display_name: displayName,
            structured_data: {
              content: v3Result.content,
              markdown: v3Result.markdown,
              metadata: v3Result.metadata,
            } as any,
            prompt_version: v3Result.metadata.prompt_version,
            model_used: v3Result.metadata.model_used,
          },
        })
      })

      // Step 10: Increment usage
      await step.run('increment-usage', async () => {
        await incrementUsage(userId, 'RESUME_GENERATION')
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

        await logAiTaskComplete(userId, applicationId, 'RESUME_GENERATED', {
          document_id: document.id,
        })
      })

      return { documentId: document.id }
    } catch (error) {
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
