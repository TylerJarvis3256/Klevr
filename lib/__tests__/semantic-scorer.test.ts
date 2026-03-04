import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildSemanticScorerInput,
  analyzeSemanticFit,
  validateSemanticFitResults,
} from '@/lib/semantic-scorer'
import {
  createProfile,
  createEducation,
  createJobExperience,
  createProject,
  createBullet,
  createSemanticFitAnalysis,
} from '@/__tests__/helpers'

// Mock OpenAI - use vi.hoisted so mockCreate is available before vi.mock hoisting
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))
vi.mock('@/lib/openai', () => ({
  openai: { chat: { completions: { create: mockCreate } } },
  MODELS: { GPT4O: 'gpt-4o-2024-05-13', GPT4O_MINI: 'gpt-4o-mini-2024-07-18' },
  callOpenAI: vi.fn((_userId: string, fn: () => Promise<unknown>) => fn()),
  parseOpenAIJson: vi.fn((content: string | null) => {
    if (!content) throw new Error('No content')
    return JSON.parse(content)
  }),
}))

// Mock prompts
vi.mock('@/lib/prompts', () => ({
  loadPrompt: vi.fn().mockResolvedValue({ content: 'mock prompt', metadata: {} }),
}))

describe('buildSemanticScorerInput', () => {
  it('uses profile skills when available', () => {
    const profile = createProfile({ skills: ['React', 'TypeScript', 'Node.js'] })
    const job = { title: 'Dev', company: 'Co', job_description_raw: 'desc' }
    const parsedJob = {
      required_skills: ['React'],
      preferred_skills: ['Node.js'],
      responsibilities: [],
      qualifications: [],
    }

    const result = buildSemanticScorerInput(null, profile, job, parsedJob)

    expect(result.candidate_skills).toEqual(['React', 'TypeScript', 'Node.js'])
  })

  it('falls back to resume skills when profile skills are empty', () => {
    const profile = createProfile({ skills: [] })
    const parsedResume = {
      personal: {},
      education: [],
      experience: [],
      projects: [],
      skills: {
        languages: ['Python', 'JavaScript'],
        frameworks: ['React'],
        tools: ['Git'],
        other: ['REST APIs'],
      },
      certifications: [],
    }
    const job = { title: 'Dev', company: 'Co', job_description_raw: 'desc' }
    const parsedJob = {
      required_skills: [],
      preferred_skills: [],
      responsibilities: [],
      qualifications: [],
    }

    const result = buildSemanticScorerInput(parsedResume, profile, job, parsedJob)

    expect(result.candidate_skills).toEqual(['Python', 'JavaScript', 'React', 'Git', 'REST APIs'])
  })

  it('maps structured education data', () => {
    const edu = createEducation({
      degree: 'Bachelor of Science',
      major: 'Computer Science',
      school: 'MIT',
    })
    const profile = createProfile({ skills: ['React'], Education: [edu] })
    const job = { title: 'Dev', company: 'Co', job_description_raw: 'desc' }
    const parsedJob = {
      required_skills: [],
      preferred_skills: [],
      responsibilities: [],
      qualifications: [],
    }

    const result = buildSemanticScorerInput(null, profile, job, parsedJob)

    expect(result.candidate_education).toEqual([
      { degree: 'Bachelor of Science', major: 'Computer Science', school: 'MIT' },
    ])
  })

  it('maps structured experience with bullets', () => {
    const bullet = createBullet({ text: 'Built a REST API with Node.js' })
    const exp = createJobExperience({
      title: 'Software Intern',
      company: 'Tech Co',
      Bullets: [bullet],
    })
    const profile = createProfile({ skills: ['React'], JobExperience: [exp] })
    const job = { title: 'Dev', company: 'Co', job_description_raw: 'desc' }
    const parsedJob = {
      required_skills: [],
      preferred_skills: [],
      responsibilities: [],
      qualifications: [],
    }

    const result = buildSemanticScorerInput(null, profile, job, parsedJob)

    expect(result.candidate_experience).toEqual([
      {
        title: 'Software Intern',
        company: 'Tech Co',
        bullets: ['Built a REST API with Node.js'],
      },
    ])
  })

  it('maps structured project data', () => {
    const proj = createProject({
      name: 'My App',
      technologies: ['React', 'TypeScript'],
      description: 'A web app',
    })
    const profile = createProfile({ skills: ['React'], Project: [proj] })
    const job = { title: 'Dev', company: 'Co', job_description_raw: 'desc' }
    const parsedJob = {
      required_skills: [],
      preferred_skills: [],
      responsibilities: [],
      qualifications: [],
    }

    const result = buildSemanticScorerInput(null, profile, job, parsedJob)

    expect(result.candidate_projects).toEqual([
      { name: 'My App', technologies: ['React', 'TypeScript'], description: 'A web app' },
    ])
  })
})

describe('analyzeSemanticFit', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  it('parses valid LLM response', async () => {
    const mockAnalysis = createSemanticFitAnalysis()
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
    })

    const input = buildSemanticScorerInput(
      null,
      createProfile({ skills: ['React'] }),
      { title: 'Dev', company: 'Co', job_description_raw: 'desc' },
      { required_skills: ['React'], preferred_skills: [], responsibilities: [], qualifications: [] }
    )

    const result = await analyzeSemanticFit('user-1', input)

    expect(result.semantic_skill_score).toBe(0.75)
    expect(result.persona_fit_score).toBe(0.65)
    expect(result.matched_skills).toHaveLength(3)
    expect(result.missing_skills).toHaveLength(2)
  })

  it('clamps scores above 1.0', async () => {
    const mockAnalysis = createSemanticFitAnalysis({
      semantic_skill_score: 1.5,
      persona_fit_score: 2.0,
    })
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
    })

    const input = buildSemanticScorerInput(
      null,
      createProfile({ skills: ['React'] }),
      { title: 'Dev', company: 'Co', job_description_raw: 'desc' },
      { required_skills: [], preferred_skills: [], responsibilities: [], qualifications: [] }
    )

    const result = await analyzeSemanticFit('user-1', input)

    expect(result.semantic_skill_score).toBe(1.0)
    expect(result.persona_fit_score).toBe(1.0)
  })

  it('clamps scores below 0.0', async () => {
    const mockAnalysis = createSemanticFitAnalysis({
      semantic_skill_score: -0.5,
      persona_fit_score: -1.0,
    })
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
    })

    const input = buildSemanticScorerInput(
      null,
      createProfile({ skills: ['React'] }),
      { title: 'Dev', company: 'Co', job_description_raw: 'desc' },
      { required_skills: [], preferred_skills: [], responsibilities: [], qualifications: [] }
    )

    const result = await analyzeSemanticFit('user-1', input)

    expect(result.semantic_skill_score).toBe(0.0)
    expect(result.persona_fit_score).toBe(0.0)
  })

  it('sanitizes em dashes from LLM output', async () => {
    const mockAnalysis = createSemanticFitAnalysis({
      skill_reasoning: 'The candidate has strong skills \u2014 especially in React',
      persona_reasoning: 'The candidate\u2019s background \u2013 working at startups',
    })
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
    })

    const input = buildSemanticScorerInput(
      null,
      createProfile({ skills: ['React'] }),
      { title: 'Dev', company: 'Co', job_description_raw: 'desc' },
      { required_skills: [], preferred_skills: [], responsibilities: [], qualifications: [] }
    )

    const result = await analyzeSemanticFit('user-1', input)

    expect(result.skill_reasoning).not.toContain('\u2014')
    expect(result.persona_reasoning).not.toContain('\u2013')
  })

  it('defaults NaN scores to 0.5', async () => {
    const mockAnalysis = createSemanticFitAnalysis({
      semantic_skill_score: NaN,
      persona_fit_score: NaN,
    })
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
    })

    const input = buildSemanticScorerInput(
      null,
      createProfile({ skills: ['React'] }),
      { title: 'Dev', company: 'Co', job_description_raw: 'desc' },
      { required_skills: [], preferred_skills: [], responsibilities: [], qualifications: [] }
    )

    const result = await analyzeSemanticFit('user-1', input)

    expect(result.semantic_skill_score).toBe(0.5)
    expect(result.persona_fit_score).toBe(0.5)
  })
})

describe('validateSemanticFitResults', () => {
  const baseAnalysis = createSemanticFitAnalysis({
    matched_skills: [],
    missing_skills: [],
  })

  it('rescues missing skills that exist in profile (exact case)', () => {
    const analysis = {
      ...baseAnalysis,
      missing_skills: [
        { skill: 'React', severity: 'required' as const, suggestion: 'Learn React' },
      ],
    }

    const result = validateSemanticFitResults(analysis, ['React', 'TypeScript'])

    expect(result.matched_skills).toHaveLength(1)
    expect(result.matched_skills[0]).toEqual({
      skill: 'React',
      match_type: 'exact',
      evidence: 'Found in candidate skills (deterministic match)',
    })
    expect(result.missing_skills).toHaveLength(0)
  })

  it('rescues with case-insensitive matching', () => {
    const analysis = {
      ...baseAnalysis,
      missing_skills: [
        { skill: 'react', severity: 'required' as const, suggestion: 'Learn React' },
      ],
    }

    const result = validateSemanticFitResults(analysis, ['React', 'TypeScript'])

    expect(result.matched_skills).toHaveLength(1)
    expect(result.matched_skills[0].skill).toBe('react')
    expect(result.missing_skills).toHaveLength(0)
  })

  it('rescues via compound skill segments ("Git/GitHub" -> "GitHub")', () => {
    const analysis = {
      ...baseAnalysis,
      missing_skills: [
        { skill: 'GitHub', severity: 'preferred' as const, suggestion: 'Use GitHub' },
      ],
    }

    const result = validateSemanticFitResults(analysis, ['Git/GitHub', 'React'])

    expect(result.matched_skills).toHaveLength(1)
    expect(result.matched_skills[0].skill).toBe('GitHub')
    expect(result.missing_skills).toHaveLength(0)
  })

  it('rescues via substring when profile skill is longer ("REST APIs" contains "REST")', () => {
    const analysis = {
      ...baseAnalysis,
      missing_skills: [{ skill: 'REST', severity: 'required' as const, suggestion: 'Learn REST' }],
    }

    const result = validateSemanticFitResults(analysis, ['REST APIs', 'TypeScript'])

    expect(result.matched_skills).toHaveLength(1)
    expect(result.matched_skills[0].skill).toBe('REST')
    expect(result.missing_skills).toHaveLength(0)
  })

  it('downgrades false "exact" matches not in profile to "inferred"', () => {
    const analysis = {
      ...baseAnalysis,
      matched_skills: [
        { skill: 'Azure', match_type: 'exact' as const, evidence: 'Cloud experience' },
      ],
    }

    const result = validateSemanticFitResults(analysis, ['AWS', 'React'])

    expect(result.matched_skills).toHaveLength(1)
    expect(result.matched_skills[0].match_type).toBe('inferred')
    expect(result.matched_skills[0].skill).toBe('Azure')
  })

  it('preserves legitimate inferred matches', () => {
    const analysis = {
      ...baseAnalysis,
      matched_skills: [
        {
          skill: 'JavaScript',
          match_type: 'inferred' as const,
          evidence: 'Implied by React experience',
        },
      ],
    }

    const result = validateSemanticFitResults(analysis, ['React', 'TypeScript'])

    expect(result.matched_skills).toHaveLength(1)
    expect(result.matched_skills[0].match_type).toBe('inferred')
  })

  it('avoids duplicates when rescued skill is already in matched', () => {
    const analysis = {
      ...baseAnalysis,
      matched_skills: [{ skill: 'React', match_type: 'exact' as const, evidence: 'In skills' }],
      missing_skills: [
        { skill: 'React', severity: 'required' as const, suggestion: 'Learn React' },
      ],
    }

    const result = validateSemanticFitResults(analysis, ['React'])

    expect(result.matched_skills).toHaveLength(1)
    expect(result.missing_skills).toHaveLength(0)
  })

  it('returns unchanged when candidate skills are empty', () => {
    const analysis = {
      ...baseAnalysis,
      matched_skills: [{ skill: 'React', match_type: 'exact' as const, evidence: 'In skills' }],
      missing_skills: [
        { skill: 'Docker', severity: 'required' as const, suggestion: 'Learn Docker' },
      ],
    }

    const result = validateSemanticFitResults(analysis, [])

    expect(result.matched_skills).toHaveLength(1)
    expect(result.missing_skills).toHaveLength(1)
  })

  it('does NOT match when profile skill is shorter substring of distinct longer skill', () => {
    const analysis = {
      ...baseAnalysis,
      missing_skills: [
        {
          skill: 'React Native',
          severity: 'required' as const,
          suggestion: 'Learn React Native',
        },
      ],
    }

    // "React" is shorter than "React Native" - should NOT match via substring
    const result = validateSemanticFitResults(analysis, ['React', 'TypeScript'])

    expect(result.missing_skills).toHaveLength(1)
    expect(result.missing_skills[0].skill).toBe('React Native')
    expect(result.matched_skills).toHaveLength(0)
  })
})
