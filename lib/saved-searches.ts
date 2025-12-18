import {
  addDays,
  addMonths,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  startOfDay,
  getDay,
  getDaysInMonth,
  isBefore,
} from 'date-fns'
import { SavedSearchFrequency } from '@prisma/client'

/**
 * Saved Search Utilities
 *
 * Helpers for calculating next run times for saved searches with timezone support
 */

export interface ScheduleConfig {
  frequency: SavedSearchFrequency
  scheduleTime: string // "HH:mm" format (e.g., "08:00")
  dayOfWeek?: number // 1 = Monday, 7 = Sunday (for WEEKLY)
  dayOfMonth?: number // 1-31 (for MONTHLY)
  timezone?: string // IANA timezone (e.g., "America/New_York")
}

/**
 * Parse schedule time string to hours and minutes
 */
function parseScheduleTime(scheduleTime: string): { hours: number; minutes: number } {
  const parts = scheduleTime.split(':')
  if (parts.length !== 2) {
    throw new Error(`Invalid schedule time format: ${scheduleTime}. Expected HH:mm`)
  }

  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid schedule time: ${scheduleTime}`)
  }

  return { hours, minutes }
}

/**
 * Calculate the next run time for a saved search
 *
 * Note: This function returns UTC Date objects.
 * Timezone handling is simplified in v1 - we assume the user's local time is EST/EDT.
 * For full timezone support, integrate with a library like date-fns-tz.
 */
export function calculateNextRunAt(config: ScheduleConfig, fromDate: Date = new Date()): Date {
  const { hours, minutes } = parseScheduleTime(config.scheduleTime)

  // Start from the beginning of the current day
  let nextRun = startOfDay(fromDate)

  // Set the scheduled time
  nextRun = setHours(nextRun, hours)
  nextRun = setMinutes(nextRun, minutes)
  nextRun = setSeconds(nextRun, 0)
  nextRun = setMilliseconds(nextRun, 0)

  // If the scheduled time has already passed today, move to the next valid day
  if (isBefore(nextRun, fromDate) || nextRun.getTime() === fromDate.getTime()) {
    nextRun = addDays(nextRun, 1)
  }

  switch (config.frequency) {
    case 'DAILY':
      // Already set to next valid day
      break

    case 'WEEKLY': {
      const targetDayOfWeek = config.dayOfWeek ?? 1 // Default to Monday
      const currentDayOfWeek = getDay(nextRun) || 7 // getDay returns 0 for Sunday, we want 7

      // Calculate days until target day of week
      let daysUntilTarget = targetDayOfWeek - currentDayOfWeek
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7 // Move to next week
      }

      nextRun = addDays(nextRun, daysUntilTarget)
      break
    }

    case 'MONTHLY': {
      const targetDayOfMonth = config.dayOfMonth ?? 1 // Default to 1st of month
      const currentDayOfMonth = nextRun.getDate()

      // If target day hasn't occurred this month yet, schedule for this month
      if (targetDayOfMonth > currentDayOfMonth) {
        nextRun.setDate(targetDayOfMonth)
      } else {
        // Otherwise, schedule for next month
        nextRun = addMonths(nextRun, 1)
        nextRun.setDate(1) // Start of next month

        // Handle months with fewer days (e.g., Feb 30 -> Feb 28/29)
        const daysInMonth = getDaysInMonth(nextRun)
        nextRun.setDate(Math.min(targetDayOfMonth, daysInMonth))
      }
      break
    }

    default:
      throw new Error(`Unknown frequency: ${config.frequency}`)
  }

  return nextRun
}

/**
 * Validate saved search query configuration
 */
export function validateQueryConfig(config: any): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (typeof config !== 'object' || config === null) {
    return { valid: false, errors: ['Query config must be an object'] }
  }

  // Validate what (keywords) - optional but should be string if provided
  if (config.what !== undefined && typeof config.what !== 'string') {
    errors.push('what (keywords) must be a string')
  }

  // Validate where (location) - optional but should be string if provided
  if (config.where !== undefined && typeof config.where !== 'string') {
    errors.push('where (location) must be a string')
  }

  // Validate salary_min - optional but should be number if provided
  if (config.salary_min !== undefined && typeof config.salary_min !== 'number') {
    errors.push('salary_min must be a number')
  }

  // Validate full_time - optional but should be 0 or 1 if provided
  if (config.full_time !== undefined && config.full_time !== 0 && config.full_time !== 1) {
    errors.push('full_time must be 0 or 1')
  }

  // Validate permanent - optional but should be 0 or 1 if provided
  if (config.permanent !== undefined && config.permanent !== 0 && config.permanent !== 1) {
    errors.push('permanent must be 0 or 1')
  }

  // Validate sort_by - optional but should be 'date' or 'salary' if provided
  if (config.sort_by !== undefined && !['date', 'salary'].includes(config.sort_by)) {
    errors.push('sort_by must be "date" or "salary"')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get human-readable description of saved search schedule
 */
export function getScheduleDescription(config: ScheduleConfig): string {
  const { hours, minutes } = parseScheduleTime(config.scheduleTime)
  const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

  switch (config.frequency) {
    case 'DAILY':
      return `Daily at ${time}`

    case 'WEEKLY': {
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const dayName = dayNames[(config.dayOfWeek ?? 1) - 1]
      return `Weekly on ${dayName} at ${time}`
    }

    case 'MONTHLY': {
      const day = config.dayOfMonth ?? 1
      const suffix =
        day === 1 || day === 21 || day === 31
          ? 'st'
          : day === 2 || day === 22
            ? 'nd'
            : day === 3 || day === 23
              ? 'rd'
              : 'th'
      return `Monthly on the ${day}${suffix} at ${time}`
    }

    default:
      return 'Unknown schedule'
  }
}

/**
 * Check if a saved search should run now
 */
export function shouldRunNow(nextRunAt: Date | null, now: Date = new Date()): boolean {
  if (!nextRunAt) {
    return false
  }

  return isBefore(nextRunAt, now) || nextRunAt.getTime() === now.getTime()
}
