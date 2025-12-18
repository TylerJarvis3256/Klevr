import { prisma } from './prisma'
import { ActivityType } from '@prisma/client'

export interface LogActivityParams {
  user_id: string
  application_id?: string
  type: ActivityType
  metadata?: Record<string, any>
}

/**
 * Non-blocking activity logger for job application timeline
 *
 * Logs an activity to the ActivityLog table. This function is designed to be
 * non-blocking - it will not throw errors on failure, only log them to console.
 *
 * @param params - Activity log parameters
 * @returns Promise<boolean> - true if logged successfully, false if failed
 *
 * @example
 * ```typescript
 * // Log a status change
 * await logActivity({
 *   user_id: user.id,
 *   application_id: application.id,
 *   type: 'STATUS_CHANGED',
 *   metadata: { from: 'APPLIED', to: 'INTERVIEW' }
 * })
 *
 * // Log a job creation
 * await logActivity({
 *   user_id: user.id,
 *   application_id: application.id,
 *   type: 'JOB_CREATED'
 * })
 * ```
 */
export async function logActivity(params: LogActivityParams): Promise<boolean> {
  try {
    await prisma.activityLog.create({
      data: {
        user_id: params.user_id,
        application_id: params.application_id ?? undefined,
        type: params.type,
        metadata: params.metadata ?? undefined,
      },
    })
    return true
  } catch (error) {
    // Non-blocking: log the error but don't throw
    console.error('[ActivityLog] Failed to log activity:', {
      type: params.type,
      application_id: params.application_id ?? 'none',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}

/**
 * Convenience wrapper for logging status changes
 *
 * @param user_id - User ID
 * @param application_id - Application ID
 * @param fromStatus - Previous status
 * @param toStatus - New status
 */
export async function logStatusChange(
  user_id: string,
  application_id: string,
  fromStatus: string,
  toStatus: string
): Promise<boolean> {
  return logActivity({
    user_id,
    application_id,
    type: ActivityType.STATUS_CHANGED,
    metadata: {
      from: fromStatus,
      to: toStatus,
    },
  })
}

/**
 * Convenience wrapper for logging AI task completion
 *
 * @param user_id - User ID
 * @param application_id - Application ID
 * @param taskType - Type of AI task (JOB_SCORING_COMPLETED, RESUME_GENERATED, etc.)
 * @param metadata - Optional metadata about the task
 */
export async function logAiTaskComplete(
  user_id: string,
  application_id: string,
  taskType: Extract<
    ActivityType,
    | 'JOB_SCORING_COMPLETED'
    | 'RESUME_GENERATED'
    | 'COVER_LETTER_GENERATED'
    | 'COMPANY_RESEARCH_COMPLETED'
  >,
  metadata?: Record<string, any>
): Promise<boolean> {
  return logActivity({
    user_id,
    application_id,
    type: taskType,
    metadata,
  })
}
