import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'

const createJobSchema = z.object({
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company name is required'),
  location: z.string().optional(),
  job_source: z.enum([
    'LINKEDIN',
    'INDEED',
    'GLASSDOOR',
    'HANDSHAKE',
    'COMPANY_WEBSITE',
    'REFERRAL',
    'OTHER',
  ]),
  job_url: z.string().url().optional().or(z.literal('')),
  job_description_raw: z.string().min(1, 'Job description is required'),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createJobSchema.parse(body)

    // Validate at least description OR URL is provided
    if (!data.job_description_raw && !data.job_url) {
      return NextResponse.json(
        { error: 'Either job description or job URL is required' },
        { status: 400 }
      )
    }

    // Check if user has confirmed resume
    const profile = await prisma.profile.findUnique({
      where: { user_id: user.id },
      select: { parsed_resume_confirmed_at: true },
    })

    if (!profile?.parsed_resume_confirmed_at) {
      return NextResponse.json(
        { error: 'Please complete your profile and confirm your resume first' },
        { status: 400 }
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
          job_source: data.job_source,
          job_url: data.job_url || null,
          job_description_raw: data.job_description_raw,
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

    // Log job creation activity
    await logActivity({
      user_id: user.id,
      application_id: result.application.id,
      type: 'JOB_CREATED',
    })

    // Trigger fit assessment asynchronously
    try {
      const { createAiTask } = await import('@/lib/ai-tasks')
      await createAiTask({
        userId: user.id,
        type: 'JOB_SCORING',
        applicationId: result.application.id,
        data: {},
      })
    } catch (error) {
      // Don't fail job creation if task creation fails
      console.error('Failed to create AI task:', error)
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.format() }, { status: 400 })
    }
    console.error('Error creating job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const fitBucket = searchParams.get('fit_bucket')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {
      user_id: user.id,
    }

    if (status) {
      where.status = status
    }

    if (fitBucket) {
      where.fit_bucket = fitBucket
    }

    if (search) {
      where.OR = [
        { Job: { title: { contains: search, mode: 'insensitive' } } },
        { Job: { company: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          Job: true,
        },
        orderBy: { updated_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.application.count({ where }),
    ])

    return NextResponse.json({
      applications,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
