import { describe, it, expect } from 'vitest'
import { matchSkills } from '@/lib/skills-matcher'

describe('matchSkills', () => {
  it('returns perfect score when all required skills match', () => {
    const result = matchSkills(
      ['React', 'TypeScript', 'Node.js'],
      ['React', 'TypeScript', 'Node.js']
    )

    expect(result.match_score).toBe(1.0)
    expect(result.matching_skills).toEqual(['React', 'TypeScript', 'Node.js'])
    expect(result.missing_required_skills).toEqual([])
    expect(result.missing_preferred_skills).toEqual([])
  })

  it('returns partial score for partial matches', () => {
    const result = matchSkills(
      ['React', 'TypeScript'],
      ['React', 'TypeScript', 'Node.js', 'Python']
    )

    expect(result.matching_skills).toEqual(['React', 'TypeScript'])
    expect(result.missing_required_skills).toEqual(['Node.js', 'Python'])
    // 2/4 required = 0.5 * 0.8 = 0.4, no preferred = 1.0 * 0.2 = 0.2 → 0.6
    expect(result.match_score).toBeCloseTo(0.6)
  })

  it('matches skills case-insensitively', () => {
    const result = matchSkills(
      ['react', 'TYPESCRIPT', 'Node.JS'],
      ['React', 'TypeScript', 'Node.js']
    )

    expect(result.match_score).toBe(1.0)
    expect(result.matching_skills).toEqual(['React', 'TypeScript', 'Node.js'])
  })

  it('trims whitespace from skills', () => {
    const result = matchSkills(['  React  ', 'TypeScript'], ['React', ' TypeScript '])

    expect(result.matching_skills).toEqual(['React', ' TypeScript '])
    expect(result.missing_required_skills).toEqual([])
  })

  it('handles empty user skills', () => {
    const result = matchSkills([], ['React', 'TypeScript'])

    expect(result.match_score).toBeCloseTo(0.2) // 0/2 required * 0.8 + 1.0 * 0.2
    expect(result.matching_skills).toEqual([])
    expect(result.missing_required_skills).toEqual(['React', 'TypeScript'])
  })

  it('handles empty required skills', () => {
    const result = matchSkills(['React', 'TypeScript'], [])

    // totalRequired = 0 || 1 = 1, requiredMatches = 0, so requiredScore = 0
    // preferredScore = 1 (no preferred), match_score = 0 * 0.8 + 1 * 0.2 = 0.2
    expect(result.match_score).toBeCloseTo(0.2)
    expect(result.missing_required_skills).toEqual([])
  })

  it('weights required at 80% and preferred at 20%', () => {
    const result = matchSkills(
      ['React'],
      ['React', 'TypeScript'], // 1/2 required = 0.5
      ['Node.js', 'Python'] // 0/2 preferred = 0.0
    )

    // 0.5 * 0.8 + 0.0 * 0.2 = 0.4
    expect(result.match_score).toBeCloseTo(0.4)
  })

  it('includes preferred skills in matching_skills', () => {
    const result = matchSkills(['React', 'Docker'], ['React'], ['Docker', 'Kubernetes'])

    expect(result.matching_skills).toContain('React')
    expect(result.matching_skills).toContain('Docker')
    expect(result.missing_preferred_skills).toEqual(['Kubernetes'])
  })

  it('does not duplicate skills in matching_skills', () => {
    const result = matchSkills(
      ['React'],
      ['React'],
      ['React'] // Same skill in both lists
    )

    const reactCount = result.matching_skills.filter(s => s === 'React').length
    expect(reactCount).toBe(1)
  })

  it('handles empty preferred skills', () => {
    const result = matchSkills(['React'], ['React', 'TypeScript'])

    // 1/2 required = 0.5 * 0.8 = 0.4, no preferred = 1.0 * 0.2 = 0.2 → 0.6
    expect(result.match_score).toBeCloseTo(0.6)
  })

  it('handles all arrays empty', () => {
    const result = matchSkills([], [], [])

    // Same guard: totalRequired = 0 || 1 = 1, requiredScore = 0/1 = 0
    // preferredScore = 1, match_score = 0 * 0.8 + 1 * 0.2 = 0.2
    expect(result.match_score).toBeCloseTo(0.2)
    expect(result.matching_skills).toEqual([])
    expect(result.missing_required_skills).toEqual([])
    expect(result.missing_preferred_skills).toEqual([])
  })
})
