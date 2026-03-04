import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { parseJobDescription } from '@/lib/job-parser'
import { calculateFitScore } from '@/lib/fit-scorer'
import { generateFitExplanation, buildExplanationInput } from '@/lib/fit-explainer'
import { analyzeSemanticFit, buildSemanticScorerInput } from '@/lib/semantic-scorer'
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

    // Step 2: Mark running and log activity
    await step.run('mark-running', async () => {
      await prisma.aiTask.update({
        where: { id: taskId },
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
      // Step 3: Fetch application, job, profile, and structured data
      const application = await step.run('fetch-data', async () => {
        return prisma.application.findUnique({
          where: { id: applicationId },
          include: {
            Job: true,
            User: {
              include: {
                Profile: true,
                Education: true,
                JobExperience: {
                  include: { Bullets: true },
                },
                Project: true,
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

      // Step 6: Semantic fit analysis (LLM)
      const semanticAnalysis = await step.run('semantic-fit-analysis', async () => {
        const input = buildSemanticScorerInput(
          profile.parsed_resume as unknown as ParsedResume | null,
          {
            skills: profile.skills || [],
            Education: application.User.Education,
            JobExperience: application.User.JobExperience,
            Project: application.User.Project,
          },
          application.Job,
          parsedJob
        )
        return analyzeSemanticFit(userId, input)
      })

      // Step 7: Calculate composite fit score
      const fitScore = await step.run('calculate-composite-fit', async () => {
        const experienceInput = {
          education: application.User.Education.map(e => ({
            degree: e.degree,
            major: e.major,
          })),
          experience: application.User.JobExperience.map(e => ({
            title: e.title,
          })),
          projects: application.User.Project.map(p => ({
            name: p.name,
          })),
        }

        return calculateFitScore(
          experienceInput,
          parsedJob,
          semanticAnalysis,
          {
            job_types: profile.job_types || [],
            preferred_locations: profile.preferred_locations || [],
          },
          application.Job.location || undefined
        )
      })

      // Step 8: Generate explanation
      const explanation = await step.run('generate-explanation', async () => {
        const explanationInput = buildExplanationInput(
          fitScore.fit_bucket,
          fitScore.fit_score,
          semanticAnalysis,
          application.Job.title,
          profile.major || undefined
        )
        return generateFitExplanation(userId, explanationInput)
      })

      // Step 9: Save results to application
      await step.run('save-results', async () => {
        // Extract skill names from semantic analysis for string[] fields
        const matchingSkills = semanticAnalysis.matched_skills.map(s => s.skill)
        const missingRequired = semanticAnalysis.missing_skills
          .filter(s => s.severity === 'required')
          .map(s => s.skill)
        const missingPreferred = semanticAnalysis.missing_skills
          .filter(s => s.severity === 'preferred')
          .map(s => s.skill)

        await prisma.application.update({
          where: { id: applicationId },
          data: {
            fit_bucket: fitScore.fit_bucket,
            fit_score: fitScore.fit_score,
            score_explanation: explanation,
            matching_skills: matchingSkills,
            missing_skills: missingRequired, // Keep for backwards compatibility
            missing_required_skills: missingRequired,
            missing_preferred_skills: missingPreferred,
            semantic_fit_analysis: semanticAnalysis as any,
            score_count: {
              increment: 1,
            },
          },
        })
      })

      // Step 10: Increment usage
      await step.run('increment-usage', async () => {
        await incrementUsage(userId, 'JOB_SCORING')
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
