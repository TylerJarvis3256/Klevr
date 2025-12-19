import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { parseJobDescription } from '@/lib/job-parser'
import { calculateFitScore } from '@/lib/fit-scorer'
import { generateFitExplanation } from '@/lib/fit-explainer'
import { incrementUsage, checkUsageLimit } from '@/lib/usage'
import { logActivity } from '@/lib/activity-log'
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

    // If no taskId (triggered by scraping), create one
    const effectiveTaskId =
      taskId ||
      (await step.run('create-task', async () => {
        const task = await prisma.aiTask.create({
          data: {
            user_id: userId,
            type: 'JOB_SCORING',
            application_id: applicationId,
            status: 'PENDING',
          },
        })
        return task.id
      }))

    // Step 1: Check usage limit
    const canProceed = await step.run('check-usage-limit', async () => {
      return checkUsageLimit(userId, 'JOB_SCORING')
    })

    if (!canProceed) {
      await step.run('mark-failure-limit', async () => {
        await prisma.aiTask.update({
          where: { id: effectiveTaskId },
          data: {
            status: AiTaskStatus.FAILED,
            completed_at: new Date(),
            error_message: 'Job scoring limit exceeded for this month',
          },
        })
      })
      throw new Error('Job scoring limit exceeded for this month')
    }

    // Step 2: Mark running and log activity
    await step.run('mark-running', async () => {
      await prisma.aiTask.update({
        where: { id: effectiveTaskId },
        data: {
          status: AiTaskStatus.RUNNING,
          started_at: new Date(),
        },
      })

      // Log scoring started
      await logActivity({
        user_id: userId,
        application_id: applicationId,
        type: 'JOB_SCORING_STARTED',
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

      // Validate job description length (minimum 300 characters)
      const MIN_DESCRIPTION_LENGTH = 300
      if (application.Job.job_description_raw.length < MIN_DESCRIPTION_LENGTH) {
        throw new Error(
          `Job description too short for meaningful fit assessment (${application.Job.job_description_raw.length} characters, minimum ${MIN_DESCRIPTION_LENGTH} required)`
        )
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

      // Step 10: Mark success and log activity
      await step.run('mark-success', async () => {
        await prisma.aiTask.update({
          where: { id: effectiveTaskId },
          data: {
            status: AiTaskStatus.SUCCEEDED,
            completed_at: new Date(),
            result_ref: applicationId,
          },
        })

        // Log scoring completed
        await logActivity({
          user_id: userId,
          application_id: applicationId,
          type: 'JOB_SCORING_COMPLETED',
          metadata: {
            fit_bucket: fitScore.fit_bucket,
            fit_score: fitScore.fit_score,
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
          where: { id: effectiveTaskId },
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
