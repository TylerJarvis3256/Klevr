import { describe, it, expect, vi } from 'vitest'

// Mock OpenAI module (prevents initialization error from resume-generator import chain)
vi.mock('@/lib/openai', () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
  MODELS: { GPT4O: 'gpt-4o-2024-05-13', GPT4O_MINI: 'gpt-4o-mini-2024-07-18' },
  callOpenAI: vi.fn(),
  parseOpenAIJson: vi.fn(),
}))

// Mock Anthropic and prompts
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { create: mockCreate } },
  ANTHROPIC_MODELS: { SONNET: 'claude-sonnet-4-5-20250929' },
  callAnthropic: vi.fn((_userId: string, fn: () => Promise<unknown>) => fn()),
  parseAnthropicJson: vi.fn((_msg: unknown) => ({})),
}))

vi.mock('@/lib/prompts', () => ({
  loadPrompt: vi.fn().mockResolvedValue({
    content: 'test prompt',
    metadata: { maxTokens: 2000, temperature: 0.3 },
  }),
}))

import { buildSkillGroundTruth } from '@/lib/cover-letter-engine'
import type { StructuredProfileData } from '@/lib/resume-types'

function createTestProfile(): StructuredProfileData {
  return {
    personal: {
      name: 'Test User',
      email: 'test@example.com',
    },
    education: [],
    experiences: [
      {
        title: 'Software Engineer',
        company: 'Acme Corp',
        start_date: '2023-01',
        is_current: true,
        bullets: [
          'Built REST APIs using Flask and Python',
          'Developed React dashboard for real-time analytics',
          'Managed PostgreSQL database with 10M+ records',
        ],
      },
      {
        title: 'Intern',
        company: 'StartupCo',
        start_date: '2022-06',
        end_date: '2022-08',
        is_current: false,
        bullets: [
          'Created Node.js microservices for payment processing',
          'Wrote unit tests with Jest achieving 90% coverage',
        ],
      },
    ],
    projects: [
      {
        name: 'Klevr',
        technologies: ['React', 'TypeScript', 'Next.js', 'PostgreSQL'],
        bullets: [
          'Built AI-powered job application tracker using TypeScript and React',
          'Implemented PDF generation with Puppeteer',
        ],
      },
      {
        name: 'CLI Tool',
        technologies: ['Python', 'Click'],
        bullets: ['Developed command-line tool for data processing'],
      },
    ],
    skills: ['React', 'TypeScript', 'Python', 'Flask', 'Node.js', 'PostgreSQL', 'Next.js'],
  }
}

describe('buildSkillGroundTruth', () => {
  it('finds skills in project technologies', () => {
    const profile = createTestProfile()
    const result = buildSkillGroundTruth(profile, ['React', 'TypeScript'], [], [])

    const reactEvidence = result.verified_skills.find(v => v.skill === 'React')
    expect(reactEvidence).toBeDefined()
    expect(reactEvidence!.found_in.length).toBeGreaterThan(0)

    // React should be found in Klevr project technologies
    const projectEvidence = reactEvidence!.found_in.find(
      f => f.type === 'project' && f.name === 'Klevr'
    )
    expect(projectEvidence).toBeDefined()
    expect(projectEvidence!.context).toContain('React')
  })

  it('finds skills in experience bullet text', () => {
    const profile = createTestProfile()
    const result = buildSkillGroundTruth(profile, ['Flask'], [], [])

    const flaskEvidence = result.verified_skills.find(v => v.skill === 'Flask')
    expect(flaskEvidence).toBeDefined()
    expect(flaskEvidence!.found_in.length).toBeGreaterThan(0)

    const expEvidence = flaskEvidence!.found_in.find(f => f.type === 'experience')
    expect(expEvidence).toBeDefined()
    expect(expEvidence!.context).toContain('Flask')
  })

  it('returns empty evidence for skills not found in profile content', () => {
    const profile = createTestProfile()
    const result = buildSkillGroundTruth(profile, ['Kubernetes'], [], [])

    const k8sEvidence = result.verified_skills.find(v => v.skill === 'Kubernetes')
    expect(k8sEvidence).toBeDefined()
    expect(k8sEvidence!.found_in).toHaveLength(0)
  })

  it('returns empty verified_skills when matching_skills is empty', () => {
    const profile = createTestProfile()
    const result = buildSkillGroundTruth(profile, [], ['FastAPI'], ['GraphQL'])

    expect(result.verified_skills).toHaveLength(0)
    expect(result.missing_required).toEqual(['FastAPI'])
    expect(result.missing_preferred).toEqual(['GraphQL'])
  })

  it('includes all_user_skills from profile', () => {
    const profile = createTestProfile()
    const result = buildSkillGroundTruth(profile, ['React'], [], [])

    expect(result.all_user_skills).toEqual(profile.skills)
  })

  it('passes through missing_required and missing_preferred unchanged', () => {
    const profile = createTestProfile()
    const result = buildSkillGroundTruth(
      profile,
      ['React'],
      ['FastAPI', 'React Native'],
      ['GraphQL', 'Redis']
    )

    expect(result.missing_required).toEqual(['FastAPI', 'React Native'])
    expect(result.missing_preferred).toEqual(['GraphQL', 'Redis'])
  })

  it('matches skills case-insensitively in project technologies', () => {
    const profile = createTestProfile()
    // Profile has "PostgreSQL" in technologies, matching with different casing
    const result = buildSkillGroundTruth(profile, ['postgresql'], [], [])

    const pgEvidence = result.verified_skills.find(v => v.skill === 'postgresql')
    expect(pgEvidence).toBeDefined()
    expect(pgEvidence!.found_in.length).toBeGreaterThan(0)
  })

  it('finds evidence across both experiences and projects', () => {
    const profile = createTestProfile()
    // "React" appears in both experience bullets and project technologies
    const result = buildSkillGroundTruth(profile, ['React'], [], [])

    const reactEvidence = result.verified_skills.find(v => v.skill === 'React')
    expect(reactEvidence).toBeDefined()

    const projectHits = reactEvidence!.found_in.filter(f => f.type === 'project')
    const expHits = reactEvidence!.found_in.filter(f => f.type === 'experience')

    expect(projectHits.length).toBeGreaterThan(0)
    expect(expHits.length).toBeGreaterThan(0)
  })
})
