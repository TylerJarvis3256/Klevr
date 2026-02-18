import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatDate,
  getCurrentMonth,
  truncate,
  sanitizeEmDashes,
  deepSanitizeEmDashes,
} from '@/lib/utils'

describe('formatDate', () => {
  it('formats a Date object', () => {
    // Use midday UTC to avoid timezone boundary issues
    const date = new Date('2024-03-15T12:00:00Z')
    const result = formatDate(date)

    expect(result).toContain('Mar')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })

  it('formats a date string', () => {
    const result = formatDate('2024-01-15T12:00:00Z')

    expect(result).toContain('Jan')
    expect(result).toContain('2024')
  })

  it('formats ISO date strings', () => {
    const result = formatDate('2023-12-25')

    expect(result).toContain('Dec')
    expect(result).toContain('2023')
  })
})

describe('getCurrentMonth', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns YYYY-MM format', () => {
    const result = getCurrentMonth()

    expect(result).toMatch(/^\d{4}-\d{2}$/)
  })

  it('pads single-digit months', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))

    expect(getCurrentMonth()).toBe('2024-01')

    vi.useRealTimers()
  })

  it('handles December correctly', () => {
    vi.useFakeTimers()
    // Use midday to avoid timezone boundary pushing to previous month
    vi.setSystemTime(new Date('2024-12-15T12:00:00Z'))

    expect(getCurrentMonth()).toBe('2024-12')

    vi.useRealTimers()
  })
})

describe('truncate', () => {
  it('returns text unchanged if shorter than maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('returns text unchanged if exactly maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('truncates and adds ellipsis if longer than maxLength', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
  })

  it('handles maxLength of 3 (minimum for ellipsis)', () => {
    expect(truncate('hello', 3)).toBe('...')
  })

  it('handles empty string', () => {
    expect(truncate('', 10)).toBe('')
  })
})

describe('sanitizeEmDashes', () => {
  it('replaces em dashes with spaced hyphens', () => {
    expect(sanitizeEmDashes('word\u2014word')).toBe('word - word')
  })

  it('replaces en dashes with spaced hyphens', () => {
    expect(sanitizeEmDashes('word\u2013word')).toBe('word - word')
  })

  it('collapses double spaces from spaced em dashes', () => {
    expect(sanitizeEmDashes('word \u2014 word')).toBe('word - word')
  })

  it('handles multiple dashes in one string', () => {
    expect(sanitizeEmDashes('a\u2014b\u2013c')).toBe('a - b - c')
  })

  it('returns unchanged string when no dashes present', () => {
    expect(sanitizeEmDashes('hello world')).toBe('hello world')
  })

  it('handles empty string', () => {
    expect(sanitizeEmDashes('')).toBe('')
  })
})

describe('deepSanitizeEmDashes', () => {
  it('sanitizes nested object string values', () => {
    const input = {
      lead: 'Engineer \u2014 proven leader',
      experience: [{ title: 'Dev', bullets: ['Built APIs \u2013 fast'] }],
    }
    const result = deepSanitizeEmDashes(input)
    expect(result.lead).toBe('Engineer - proven leader')
    expect(result.experience[0].bullets[0]).toBe('Built APIs - fast')
  })

  it('preserves non-string values', () => {
    const input = { count: 42, active: true, score: 3.14 }
    const result = deepSanitizeEmDashes(input)
    expect(result).toEqual({ count: 42, active: true, score: 3.14 })
  })

  it('handles null and undefined', () => {
    expect(deepSanitizeEmDashes(null)).toBeNull()
    expect(deepSanitizeEmDashes(undefined)).toBeUndefined()
  })

  it('sanitizes string arrays', () => {
    const input = ['hello\u2014world', 'no dashes', 'a\u2013b']
    const result = deepSanitizeEmDashes(input)
    expect(result).toEqual(['hello - world', 'no dashes', 'a - b'])
  })
})
