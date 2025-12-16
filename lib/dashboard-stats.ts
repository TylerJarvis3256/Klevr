import { prisma } from './prisma'
import { ApplicationStatus } from '@prisma/client'

export interface DashboardStats {
  applicationsThisMonth: number
  responseRate: number
  activeInterviews: number
  totalApplications: number
  byStatus: {
    PLANNED: number
    APPLIED: number
    INTERVIEW: number
    OFFER: number
    REJECTED: number
  }
}

/**
 * Calculate dashboard statistics for a user
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const applications = await prisma.application.findMany({
    where: { user_id: userId },
    select: {
      created_at: true,
      status: true,
    },
  })

  // Current month (YYYY-MM format)
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Applications created this month that have been applied to (excludes PLANNED)
  const thisMonthApps = applications.filter(app => {
    const appMonth = `${app.created_at.getFullYear()}-${String(app.created_at.getMonth() + 1).padStart(2, '0')}`
    const isAppliedOrFurther = app.status !== ApplicationStatus.PLANNED
    return appMonth === currentMonth && isAppliedOrFurther
  })

  // Applications that have been applied to (not just planned)
  const appliedApps = applications.filter(a => a.status !== ApplicationStatus.PLANNED)

  // Applications with responses (interview or offer)
  const responseApps = applications.filter(
    a => a.status === ApplicationStatus.INTERVIEW || a.status === ApplicationStatus.OFFER
  )

  // Calculate response rate (percentage)
  const responseRate = appliedApps.length > 0 ? (responseApps.length / appliedApps.length) * 100 : 0

  // Active interviews
  const activeInterviews = applications.filter(a => a.status === ApplicationStatus.INTERVIEW).length

  // Count by status
  const byStatus = {
    PLANNED: applications.filter(a => a.status === ApplicationStatus.PLANNED).length,
    APPLIED: applications.filter(a => a.status === ApplicationStatus.APPLIED).length,
    INTERVIEW: applications.filter(a => a.status === ApplicationStatus.INTERVIEW).length,
    OFFER: applications.filter(a => a.status === ApplicationStatus.OFFER).length,
    REJECTED: applications.filter(a => a.status === ApplicationStatus.REJECTED).length,
  }

  return {
    applicationsThisMonth: thisMonthApps.length,
    responseRate: Math.round(responseRate),
    activeInterviews,
    totalApplications: applications.length,
    byStatus,
  }
}
