import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { s3Client, S3_BUCKET } from '@/lib/s3'
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { z } from 'zod'

const deleteAccountSchema = z.object({
  confirmation: z.literal('DELETE MY ACCOUNT'),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = deleteAccountSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid confirmation text', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Clean up S3 files for this user
    try {
      const prefix = `resumes/${user.id}/`
      const listCommand = new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        Prefix: prefix,
      })
      const listed = await s3Client.send(listCommand)
      if (listed.Contents && listed.Contents.length > 0) {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: S3_BUCKET,
          Delete: {
            Objects: listed.Contents.map(obj => ({ Key: obj.Key })),
          },
        })
        await s3Client.send(deleteCommand)
      }
    } catch (s3Error) {
      console.error('Failed to clean up S3 files during account deletion:', s3Error)
    }

    // Delete user (cascade will delete all related data)
    const auth0Id = user.auth0_id
    await prisma.user.delete({
      where: { id: user.id },
    })

    // Delete Auth0 user via Management API
    try {
      if (
        process.env.AUTH0_DOMAIN &&
        process.env.AUTH0_CLIENT_ID &&
        process.env.AUTH0_CLIENT_SECRET
      ) {
        const tokenResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: process.env.AUTH0_CLIENT_ID,
            client_secret: process.env.AUTH0_CLIENT_SECRET,
            audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
          }),
        })
        if (tokenResponse.ok) {
          const { access_token } = (await tokenResponse.json()) as { access_token: string }
          await fetch(
            `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(auth0Id)}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${access_token}` },
            }
          )
        }
      }
    } catch (auth0Error) {
      console.error('Failed to delete Auth0 user during account deletion:', auth0Error)
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    })
  } catch (error: unknown) {
    console.error('POST /api/settings/delete-account error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
