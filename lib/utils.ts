import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get current month string (YYYY-MM)
 */
export function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Replace em dashes (—) and en dashes (–) with spaced hyphens ( - )
 */
export function sanitizeEmDashes(text: string): string {
  return text.replace(/[\u2014\u2013]/g, ' - ').replace(/  +/g, ' ')
}

/**
 * Recursively sanitize em/en dashes in all string values of a nested structure
 */
export function deepSanitizeEmDashes<T>(value: T): T {
  if (typeof value === 'string') return sanitizeEmDashes(value) as unknown as T
  if (Array.isArray(value)) return value.map(deepSanitizeEmDashes) as unknown as T
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = deepSanitizeEmDashes(val)
    }
    return result as T
  }
  return value
}
