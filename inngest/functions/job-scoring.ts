import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { parseJobDescription } from '@/lib/job-parser'
import { calculateFitScore } from '@/lib/fit-scorer'
import { generateFitExplanation } from '@/lib/fit-explainer'
import { incrementUsage, checkUsageLimit } from '@/lib/usage'
import { AiTaskStatus } from '@prisma/client'
import { ParsedResume } from '@/lib/resume-parser'

export const jobScoringFunction = inngest.createFunction(
  {
    id: 'job-scoring',
    name: 'Job Fit Assessment',
    retries: 2,
  },
  { event: 'job/assess-fit' },
  async ({ event, step }) => {
    const { userId, taskId, applicationId } = event.data

    // Step 1: Check usage limit
    const canProceed = await step.run('check-usage-limit', async () => {
      return checkUsageLimit(userId, 'JOB_SCORING')
    })

    if (!canProceed) {
      await step.run('mark-failure-limit', async () => {
        await prisma.aiTask.update({
          where: { id: taskId },
          data: {
            status: AiTaskStatus.FAILED,
            completed_at: new Date(),
            error_message: 'Job scoring limit exceeded for this month',
          },
        })
      })
      throw new Error('Job scoring limit exceeded for this month')
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
      // Step 3: Fetch application, job, and profile
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

      if (!application) {
        throw new Error('Application not found')
      }

      const profile = application.User.Profile
      if (!profile?.parsed_resume_confirmed_at) {
        throw new Error('User has not confirmed resume')
      }

      // Step 4: Parse job description
      const parsedJob = await step.run('parse-job', async () => {
        return parseJobDescription(userId, application.Job.job_description_raw)
      })

      // Step 5: Store parsed job
      await step.run('save-parsed-job', async () => {
        await prisma.job.update({
          where: { id: application.Job.id },
          data: {
            job_description_parsed: parsedJob as any,
          },
        })
      })

      // Step 6: Calculate fit score
      const fitScore = await step.run('calculate-fit', async () => {
        return calculateFitScore(
          profile.parsed_resume as unknown as ParsedResume,
          parsedJob,
          {
            job_types: profile.job_types || [],
            preferred_locations: profile.preferred_locations || [],
          },
          application.Job.location || undefined,
          profile.skills || []
        )
      })

      // Step 7: Generate explanation
      const explanation = await step.run('generate-explanation', async () => {
        return generateFitExplanation(userId, {
          fit_bucket: fitScore.fit_bucket,
          fit_score: fitScore.fit_score,
          matching_skills: fitScore.skills_match.matching_skills,
          missing_required_skills: fitScore.skills_match.missing_required_skills,
          missing_preferred_skills: fitScore.skills_match.missing_preferred_skills,
          job_title: application.Job.title,
          user_major: profile.major || undefined,
        })
      })

      // Step 8: Save results to application
      await step.run('save-results', async () => {
        await prisma.application.update({
          where: { id: applicationId },
          data: {
            fit_bucket: fitScore.fit_bucket,
            fit_score: fitScore.fit_score,
            score_explanation: explanation,
            matching_skills: fitScore.skills_match.matching_skills,
            missing_skills: fitScore.skills_match.missing_required_skills, // Keep for backwards compatibility
            missing_required_skills: fitScore.skills_match.missing_required_skills,
            missing_preferred_skills: fitScore.skills_match.missing_preferred_skills,
            score_count: {
              increment: 1,
            },
          },
        })
      })

      // Step 9: Increment usage
      await step.run('increment-usage', async () => {
        await incrementUsage(userId, 'JOB_SCORING')
      })

      // Step 10: Mark success
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

      return {
        applicationId,
        fit_bucket: fitScore.fit_bucket,
        fit_score: fitScore.fit_score,
      }
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
