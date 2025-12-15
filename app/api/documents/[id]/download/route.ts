import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateDownloadUrl } from '@/lib/s3'

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
        storage_url: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Generate presigned URL (expires in 15 minutes)
    const url = await generateDownloadUrl(document.storage_url, 900)

    return NextResponse.json({
      url,
      expires_in: 900, // 15 minutes
    })
  } catch (error: any) {
    console.error('Document download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
