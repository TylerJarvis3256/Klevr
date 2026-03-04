import { describe, it, expect } from 'vitest'
import {
  calculateFitScore,
  calculateExperienceScore,
  calculatePreferenceScore,
} from '@/lib/fit-scorer'
import { createSemanticFitAnalysis } from '@/__tests__/helpers'

describe('calculateFitScore', () => {
  const defaultExperienceInput = {
    education: [{ degree: 'Bachelor of Science', major: 'Computer Science' }],
    experience: [{ title: 'Software Engineer Intern' }],
    projects: [{ name: 'Web App' }],
  }

  const defaultParsedJob = {
    required_skills: ['React', 'TypeScript'],
    preferred_skills: ['Node.js'],
    education_required: 'Computer Science',
    experience_required: '0-2 years',
    responsibilities: [],
    qualifications: [],
    job_type: 'FULL_TIME',
    level: 'ENTRY_LEVEL' as const,
    domain: 'software',
  }

  const defaultPreferences = {
    job_types: ['FULL_TIME'],
    preferred_locations: ['Remote'],
  }

  it('applies correct weights (40/25/20/15)', () => {
    const analysis = createSemanticFitAnalysis({
      semantic_skill_score: 1.0,
      persona_fit_score: 1.0,
    })

    const result = calculateFitScore(
      defaultExperienceInput,
      defaultParsedJob,
      analysis,
      defaultPreferences,
      'Remote'
    )

    // Semantic skills: 1.0 * 0.40 = 0.40
    expect(result.components.semantic_skills).toBeCloseTo(0.4)
    // Persona: 1.0 * 0.20 = 0.20
    expect(result.components.persona).toBeCloseTo(0.2)
    // Preferences: check it's weighted at 0.15
    expect(result.components.preferences).toBeCloseTo(result.preference_score * 0.15)
    // Experience: check it's weighted at 0.25
    expect(result.components.experience).toBeCloseTo(result.experience_score * 0.25)
  })

  it('maps scores to correct fit buckets', () => {
    // EXCELLENT >= 0.8
    const excellent = calculateFitScore(
      defaultExperienceInput,
      defaultParsedJob,
      createSemanticFitAnalysis({ semantic_skill_score: 1.0, persona_fit_score: 1.0 }),
      defaultPreferences,
      'Remote'
    )
    expect(excellent.fit_bucket).toBe('EXCELLENT')

    // POOR < 0.4
    const poor = calculateFitScore(
      { education: [], experience: [], projects: [] },
      { ...defaultParsedJob, job_type: undefined },
      createSemanticFitAnalysis({ semantic_skill_score: 0.1, persona_fit_score: 0.1 }),
      { job_types: [], preferred_locations: [] }
    )
    expect(poor.fit_bucket).toBe('POOR')
  })

  it('returns score between 0 and 1', () => {
    const result = calculateFitScore(
      defaultExperienceInput,
      defaultParsedJob,
      createSemanticFitAnalysis(),
      defaultPreferences,
      'Remote'
    )

    expect(result.fit_score).toBeGreaterThanOrEqual(0)
    expect(result.fit_score).toBeLessThanOrEqual(1)
  })
})

describe('calculateExperienceScore', () => {
  it('returns 0 with no education, experience, or projects', () => {
    const score = calculateExperienceScore(
      { education: [], experience: [], projects: [] },
      {
        required_skills: [],
        preferred_skills: [],
        responsibilities: [],
        qualifications: [],
      }
    )

    expect(score).toBe(0)
  })

  it('awards 0.15 for having any education', () => {
    const score = calculateExperienceScore(
      {
        education: [{ degree: 'Associate', major: null }],
        experience: [],
        projects: [],
      },
      {
        required_skills: [],
        preferred_skills: [],
        responsibilities: [],
        qualifications: [],
      }
    )

    // 0.15 for having education, no relevant major, no bachelor match
    expect(score).toBeCloseTo(0.15)
  })

  it('awards 0.15 + 0.15 for relevant major in CS', () => {
    const score = calculateExperienceScore(
      {
        education: [{ degree: 'B.S.', major: 'Computer Science' }],
        experience: [],
        projects: [],
      },
      {
        required_skills: [],
        preferred_skills: [],
        responsibilities: [],
        qualifications: [],
        education_required: 'Computer Science or related',
      }
    )

    // 0.15 (has edu) + 0.15 (relevant major) + 0.10 (B.S. degree) = 0.40
    expect(score).toBeCloseTo(0.4)
  })

  it('awards experience count bonus up to 0.15', () => {
    const score = calculateExperienceScore(
      {
        education: [],
        experience: [
          { title: 'Analyst 1' },
          { title: 'Analyst 2' },
          { title: 'Analyst 3' },
          { title: 'Analyst 4' },
        ],
        projects: [],
      },
      {
        required_skills: [],
        preferred_skills: [],
        responsibilities: [],
        qualifications: [],
      }
    )

    // 0.10 (has exp) + 0.15 (3+ capped at 3/3 * 0.15) = 0.25
    // No relevant title bonus since "Analyst" doesn't match engineer/developer/intern
    expect(score).toBeCloseTo(0.25)
  })

  it('awards project count bonus', () => {
    const score = calculateExperienceScore(
      {
        education: [],
        experience: [],
        projects: [{ name: 'P1' }, { name: 'P2' }],
      },
      {
        required_skills: [],
        preferred_skills: [],
        responsibilities: [],
        qualifications: [],
      }
    )

    // 0.10 (has projects) + (2/3) * 0.15 = 0.10 + 0.10 = 0.20
    expect(score).toBeCloseTo(0.2)
  })

  it('caps at 1.0', () => {
    const score = calculateExperienceScore(
      {
        education: [{ degree: 'Master of Science', major: 'Computer Science' }],
        experience: [{ title: 'Software Engineer' }, { title: 'Developer' }, { title: 'Intern' }],
        projects: [{ name: 'P1' }, { name: 'P2' }, { name: 'P3' }],
      },
      {
        required_skills: [],
        preferred_skills: [],
        responsibilities: [],
        qualifications: [],
        education_required: 'Computer Science',
        domain: 'software',
      }
    )

    expect(score).toBeLessThanOrEqual(1.0)
  })
})

describe('calculatePreferenceScore', () => {
  it('returns 0.5 (neutral) when no data available', () => {
    const score = calculatePreferenceScore(
      { job_types: [], preferred_locations: [] },
      {
        required_skills: [],
        preferred_skills: [],
        responsibilities: [],
        qualifications: [],
      }
    )

    expect(score).toBeCloseTo(0.5)
  })

  it('returns 1.0 when both job type and location match', () => {
    const score = calculatePreferenceScore(
      { job_types: ['FULL_TIME'], preferred_locations: ['Remote'] },
      {
        required_skills: [],
        preferred_skills: [],
        responsibilities: [],
        qualifications: [],
        job_type: 'FULL_TIME',
      },
      'Remote'
    )

    expect(score).toBeCloseTo(1.0)
  })

  it('returns 0.5 when job type matches but location does not', () => {
    const score = calculatePreferenceScore(
      { job_types: ['FULL_TIME'], preferred_locations: ['New York'] },
      {
        required_skills: [],
        preferred_skills: [],
        responsibilities: [],
        qualifications: [],
        job_type: 'FULL_TIME',
      },
      'San Francisco, CA'
    )

    expect(score).toBeCloseTo(0.5)
  })

  it('returns 0.25 when job type does not match and no location', () => {
    const score = calculatePreferenceScore(
      { job_types: ['FULL_TIME'], preferred_locations: [] },
      {
        required_skills: [],
        preferred_skills: [],
        responsibilities: [],
        qualifications: [],
        job_type: 'INTERNSHIP',
      }
    )

    // job_type mismatch = 0, location neutral = 0.25 => 0.25
    expect(score).toBeCloseTo(0.25)
  })

  it('matches Remote as a universal location', () => {
    const score = calculatePreferenceScore(
      { job_types: [], preferred_locations: ['Remote'] },
      {
        required_skills: [],
        preferred_skills: [],
        responsibilities: [],
        qualifications: [],
      },
      'San Francisco, CA'
    )

    // job_type neutral = 0.25, location matches "remote" = 0.5 => 0.75
    expect(score).toBeCloseTo(0.75)
  })
})
