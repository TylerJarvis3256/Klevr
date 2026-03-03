import { NextResponse } from 'next/server'
import { z } from 'zod'
import { JobSource } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const updateJobSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  company: z.string().min(1).max(200).optional(),
  location: z.string().max(200).nullable().optional(),
  job_source: z.nativeEnum(JobSource).nullable().optional(),
  job_url: z.string().url().or(z.literal('')).nullable().optional(),
  job_description_raw: z.string().min(1).max(50000).optional(),
})

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const job = await prisma.job.findFirst({
      where: {
        id,
        user_id: user.id,
      },
      include: {
        Application: {
          include: {
            GeneratedDocument: {
              where: { deleted_at: null },
              orderBy: { created_at: 'desc' },
            },
            Note: {
              orderBy: { created_at: 'desc' },
            },
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateJobSchema.parse(body)

    const job = await prisma.job.updateMany({
      where: {
        id,
        user_id: user.id,
      },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.company && { company: data.company }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.job_source !== undefined && { job_source: data.job_source }),
        ...(data.job_url !== undefined && { job_url: data.job_url }),
        ...(data.job_description_raw && { job_description_raw: data.job_description_raw }),
      },
    })

    if (job.count === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Error updating job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const deleted = await prisma.job.deleteMany({
      where: {
        id,
        user_id: user.id,
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
