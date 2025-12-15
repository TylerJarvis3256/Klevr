import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApplicationStatus } from '@prisma/client'

const bulkUpdateSchema = z.object({
  applicationIds: z.array(z.string()).min(1),
  action: z.enum(['update_status', 'delete']),
  data: z
    .object({
      status: z.nativeEnum(ApplicationStatus).optional(),
    })
    .optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = bulkUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { applicationIds, action, data } = parsed.data

    // Verify all applications belong to user
    const applications = await prisma.application.findMany({
      where: {
        id: { in: applicationIds },
        Job: {
          user_id: user.id,
        },
      },
    })

    if (applications.length !== applicationIds.length) {
      return NextResponse.json(
        { error: 'Some applications not found or do not belong to you' },
        { status: 404 }
      )
    }

    // Perform bulk operation
    let result

    if (action === 'update_status') {
      if (!data?.status) {
        return NextResponse.json({ error: 'Status is required for update_status action' }, { status: 400 })
      }

      result = await prisma.application.updateMany({
        where: {
          id: { in: applicationIds },
        },
        data: {
          status: data.status,
          // If changing to APPLIED and applied_at is null, set it
          ...(data.status === 'APPLIED' && {
            applied_at: {
              set: new Date(),
            },
          }),
        },
      })

      return NextResponse.json({
        success: true,
        action: 'update_status',
        count: result.count,
        status: data.status,
      })
    } else if (action === 'delete') {
      // Delete applications (cascade will delete related notes, documents, AI tasks)
      result = await prisma.application.deleteMany({
        where: {
          id: { in: applicationIds },
        },
      })

      return NextResponse.json({
        success: true,
        action: 'delete',
        count: result.count,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('POST /api/applications/bulk-update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
