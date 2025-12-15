import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const skillsSchema = z.object({
  skills: z
    .array(z.string().max(100, 'Skill name cannot exceed 100 characters'))
    .max(200, 'Cannot have more than 200 skills'),
})

export type SkillsInput = z.infer<typeof skillsSchema>

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate input
    const body = await req.json()
    const parsed = skillsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // 3. Normalize skills: trim whitespace, remove duplicates (case-insensitive)
    const normalizedSkills = parsed.data.skills
      .map((skill) => skill.trim())
      .filter((skill) => skill.length > 0) // Remove empty strings

    // Remove duplicates using case-insensitive comparison
    const uniqueSkills: string[] = []
    const seen = new Set<string>()

    for (const skill of normalizedSkills) {
      const lowerSkill = skill.toLowerCase()
      if (!seen.has(lowerSkill)) {
        seen.add(lowerSkill)
        uniqueSkills.push(skill) // Preserve original case
      }
    }

    // 4. Update profile
    const profile = await prisma.profile.update({
      where: { user_id: user.id },
      data: {
        skills: uniqueSkills,
      },
    })

    return NextResponse.json(profile, { status: 200 })
  } catch (error) {
    console.error('POST /api/profile/skills error:', error)

    // Check if profile doesn't exist
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Profile not found. Please complete the basics step first.' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
