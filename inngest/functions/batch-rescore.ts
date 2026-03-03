import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/prisma'
import { parseJobDescription } from '@/lib/job-parser'
import { calculateFitScore } from '@/lib/fit-scorer'
import { generateFitExplanation, buildExplanationInput } from '@/lib/fit-explainer'
import { analyzeSemanticFit, buildSemanticScorerInput } from '@/lib/semantic-scorer'
import { ParsedResume } from '@/lib/resume-parser'

const BATCH_SIZE = 10

export const batchRescoreFunction = inngest.createFunction(
  {
    id: 'batch-rescore',
    name: 'Batch Re-score Applications',
    retries: 1,
    throttle: {
      limit: 5,
      period: '60s',
    },
  },
  { event: 'admin/batch-rescore' },
  async ({ event, step }) => {
    const cursor = (event.data.cursor as string) || undefined

    // Fetch a batch of applications that have existing fit scores
    const applications = await step.run('fetch-batch', async () => {
      return prisma.application.findMany({
        where: {
          fit_score: { not: null },
        },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: 'asc' },
        select: {
          id: true,
          user_id: true,
          Job: {
            select: {
              id: true,
              title: true,
              company: true,
              location: true,
              job_description_raw: true,
            },
          },
          User: {
            select: {
              id: true,
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

    if (applications.length === 0) {
      return { totalProcessed: 0, totalFailed: 0, done: true }
    }

    let processed = 0
    let failed = 0

    // Process each application in the batch
    for (const app of applications) {
      try {
        await step.run(`rescore-${app.id}`, async () => {
          const profile = app.User.Profile
          if (!profile?.parsed_resume_confirmed_at) {
            return // Skip users without confirmed resume
          }

          // Parse job description
          const parsedJob = await parseJobDescription(app.user_id, app.Job.job_description_raw)

          // Run semantic analysis
          const input = buildSemanticScorerInput(
            profile.parsed_resume as unknown as ParsedResume | null,
            {
              skills: profile.skills || [],
              Education: app.User.Education,
              JobExperience: app.User.JobExperience,
              Project: app.User.Project,
            },
            app.Job,
            parsedJob
          )
          const semanticAnalysis = await analyzeSemanticFit(app.user_id, input)

          // Calculate new composite score
          const experienceInput = {
            education: app.User.Education.map(e => ({
              degree: e.degree,
              major: e.major,
            })),
            experience: app.User.JobExperience.map(e => ({
              title: e.title,
            })),
            projects: app.User.Project.map(p => ({
              name: p.name,
            })),
          }

          const fitScore = calculateFitScore(
            experienceInput,
            parsedJob,
            semanticAnalysis,
            {
              job_types: profile.job_types || [],
              preferred_locations: profile.preferred_locations || [],
            },
            app.Job.location || undefined
          )

          // Generate new explanation
          const explanationInput = buildExplanationInput(
            fitScore.fit_bucket,
            fitScore.fit_score,
            semanticAnalysis,
            app.Job.title,
            profile.major || undefined
          )
          const explanation = await generateFitExplanation(app.user_id, explanationInput)

          // Extract skill names
          const matchingSkills = semanticAnalysis.matched_skills.map(s => s.skill)
          const missingRequired = semanticAnalysis.missing_skills
            .filter(s => s.severity === 'required')
            .map(s => s.skill)
          const missingPreferred = semanticAnalysis.missing_skills
            .filter(s => s.severity === 'preferred')
            .map(s => s.skill)

          // Save results - does NOT increment score_count or usage (system operation)
          await prisma.application.update({
            where: { id: app.id },
            data: {
              fit_bucket: fitScore.fit_bucket,
              fit_score: fitScore.fit_score,
              score_explanation: explanation,
              matching_skills: matchingSkills,
              missing_skills: missingRequired,
              missing_required_skills: missingRequired,
              missing_preferred_skills: missingPreferred,
              semantic_fit_analysis: semanticAnalysis as any,
            },
          })
        })
        processed++
      } catch {
        failed++
      }
    }

    // Self-continue if there are more applications to process
    if (applications.length === BATCH_SIZE) {
      const lastId = applications[applications.length - 1].id
      await step.run('send-next-batch', async () => {
        await inngest.send({
          name: 'admin/batch-rescore',
          data: { cursor: lastId },
        })
      })
    }

    return {
      totalProcessed: processed,
      totalFailed: failed,
      done: applications.length < BATCH_SIZE,
      lastCursor: applications[applications.length - 1]?.id,
    }
  }
)
