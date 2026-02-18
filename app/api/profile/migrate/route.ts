import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { migrateUserProfile } from '@/lib/migrate-user-profile'

/**
 * POST /api/profile/migrate - Trigger migration of parsed_resume to structured tables
 * This endpoint allows existing users to manually migrate their data
 */
export async function POST(_req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Trigger migration
    const result = await migrateUserProfile(user.id)

    if (result.alreadyMigrated) {
      return NextResponse.json({
        success: true,
        message: 'Profile already migrated',
        alreadyMigrated: true,
      })
    }

    if (result.noParsedResume) {
      return NextResponse.json({
        success: true,
        message: 'No parsed resume data to migrate',
        noParsedResume: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile migrated successfully',
      ...result,
    })
  } catch (error) {
    console.error('POST /api/profile/migrate error:', error)
    return NextResponse.json({ error: 'Failed to migrate profile' }, { status: 500 })
  }
}
