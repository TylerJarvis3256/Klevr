import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'

const saveAdzunaJobSchema = z.object({
  adzuna_id: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  job_url: z.string().url(),
  job_description_raw: z.string().min(1),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  contract_type: z.string().optional(),
  contract_time: z.string().optional(),
})

/**
 * POST /api/jobs/from-adzuna
 *
 * Save a job from Adzuna to the user's pipeline
 * Creates Job + Application records and triggers AI tasks
 *
 * Follows same pattern as POST /api/jobs but with Adzuna-specific fields
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = saveAdzunaJobSchema.parse(body)

    // Check if user has confirmed resume (required for AI features)
    const profile = await prisma.profile.findUnique({
      where: { user_id: user.id },
      select: { parsed_resume_confirmed_at: true },
    })

    if (!profile?.parsed_resume_confirmed_at) {
      return NextResponse.json(
        {
          error: 'Please complete your profile and confirm your resume before saving jobs',
          requiresResumeConfirmation: true,
        },
        { status: 400 }
      )
    }

    // Check if job already saved by adzuna_id
    const existingJob = await prisma.job.findUnique({
      where: {
        adzuna_id: data.adzuna_id,
      },
      include: {
        Application: {
          where: {
            user_id: user.id,
          },
          take: 1,
        },
      },
    })

    if (existingJob && existingJob.Application.length > 0) {
      return NextResponse.json(
        {
          error: 'This job is already in your pipeline',
          jobId: existingJob.id,
          applicationId: existingJob.Application[0].id,
        },
        { status: 409 }
      )
    }

    // Create job and application in transaction
    const result = await prisma.$transaction(async tx => {
      const job = await tx.job.create({
        data: {
          user_id: user.id,
          title: data.title,
          company: data.company,
          location: data.location || null,
          job_source: 'ADZUNA',
          adzuna_id: data.adzuna_id,
          job_url: data.job_url,
          job_description_raw: data.job_description_raw,
          // Store additional metadata in job_description_parsed
          job_description_parsed: {
            salary_min: data.salary_min,
            salary_max: data.salary_max,
            contract_type: data.contract_type,
            contract_time: data.contract_time,
          },
        },
      })

      const application = await tx.application.create({
        data: {
          user_id: user.id,
          job_id: job.id,
          status: 'PLANNED',
        },
      })

      return { job, application }
    })

    // Log job discovery activity
    await logActivity({
      user_id: user.id,
      application_id: result.application.id,
      type: 'JOB_DISCOVERED',
      metadata: {
        source: 'adzuna',
        adzuna_id: data.adzuna_id,
      },
    })

    // Trigger AI tasks asynchronously (JOB_SCORING + COMPANY_RESEARCH)
    try {
      const { createAiTask } = await import('@/lib/ai-tasks')

      // Job scoring
      await createAiTask({
        userId: user.id,
        type: 'JOB_SCORING',
        applicationId: result.application.id,
        data: {},
      })

      // Company research (optional - can be triggered manually)
      // Uncomment if you want automatic company research on save
      // await createAiTask({
      //   userId: user.id,
      //   type: 'COMPANY_RESEARCH',
      //   applicationId: result.application.id,
      //   data: {},
      // })
    } catch (error) {
      // Don't fail job creation if task creation fails
      console.error('Failed to create AI task:', error)
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.format() }, { status: 400 })
    }
    console.error('Error saving Adzuna job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
