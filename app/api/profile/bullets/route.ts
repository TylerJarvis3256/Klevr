import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/profile/bullets - List bullets (filterable by experience/project/profile-level)
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const experienceId = searchParams.get('experience_id')
    const projectId = searchParams.get('project_id')
    const profileLevel = searchParams.get('profile_level') === 'true'

    const where: any = { user_id: user.id }

    if (experienceId) {
      where.experience_id = experienceId
    } else if (projectId) {
      where.project_id = projectId
    } else if (profileLevel) {
      // Profile-level bullets (not attached to experience or project)
      where.experience_id = null
      where.project_id = null
    }

    const bullets = await prisma.bullet.findMany({
      where,
      include: {
        JobExperience: {
          select: {
            id: true,
            title: true,
            company: true,
          },
        },
        Project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ is_favorite: 'desc' }, { priority: 'desc' }, { created_at: 'asc' }],
    })

    return NextResponse.json({ bullets })
  } catch (error) {
    console.error('GET /api/profile/bullets error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
