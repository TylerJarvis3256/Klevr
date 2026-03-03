import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildSemanticScorerInput, analyzeSemanticFit } from '@/lib/semantic-scorer'
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
