import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Fetch document with application to verify ownership
    const document = await prisma.generatedDocument.findFirst({
      where: {
        id,
        Application: {
          Job: {
            user_id: user.id,
          },
        },
      },
      select: {
        id: true,
        type: true,
        storage_url: true,
        prompt_version: true,
        model_used: true,
        created_at: true,
        application_id: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error: any) {
    console.error('Document metadata error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
