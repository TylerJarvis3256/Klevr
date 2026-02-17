import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSemanticAnalysis, createJob } from '@/__tests__/helpers'

// Use vi.hoisted so the mock variable is available during vi.mock hoisting
const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}))

// Mock OpenAI module (prevents initialization error from resume-generator import chain)
vi.mock('@/lib/openai', () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
  MODELS: { GPT4O: 'gpt-4o-2024-05-13', GPT4O_MINI: 'gpt-4o-mini-2024-07-18' },
  callOpenAI: vi.fn(),
  parseOpenAIJson: vi.fn(),
}))

// Mock Anthropic module
vi.mock('@/lib/anthropic', () => ({
  anthropic: {
    messages: { create: mockCreate },
  },
  ANTHROPIC_MODELS: { SONNET: 'claude-sonnet-4-5-20250929' },
  callAnthropic: vi.fn((_userId: string, fn: () => Promise<unknown>) => fn()),
  parseAnthropicJson: vi.fn((message: any) => {
    const text = message.content[0].text
    return JSON.parse('{' + text)
  }),
}))

// Mock prompts
vi.mock('@/lib/prompts', () => ({
  loadPrompt: vi.fn().mockResolvedValue({
    content: 'System prompt for V3 generation',
    metadata: {
      version: '3.0.0',
      description: 'V3 resume generation',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4000,
      temperature: 0.5,
    },
  }),
}))

import { generateResumeV3 } from '@/lib/resume-engine-v3'
import type {
  StructuredProfileData,
  GeneratedResumeContent,
  SkillsV2,
} from '@/lib/resume-generator'
import { isSkillsV2 } from '@/lib/resume-generator'
import type { SemanticJDAnalysis } from '@/lib/semantic-analyzer'

function createTestProfile(): StructuredProfileData {
  return {
    personal: { name: 'Jane Doe', email: 'jane@test.com' },
    education: [
      {
        school: 'MIT',
        degree: 'BS Computer Science',
        graduation_date: 'May 2024',
        gpa: '3.9',
      },
    ],
    experiences: [
      {
        title: 'Software Engineer Intern',
        company: 'Big Tech',
        start_date: 'Jun 2023',
        end_date: 'Aug 2023',
        is_current: false,
        bullets: [
          'Built REST APIs serving 10K+ requests/day',
          'Optimized database queries reducing latency by 40%',
          'Led migration from monolith to microservices',
        ],
      },
    ],
    projects: [
      {
        name: 'Task Manager App',
        description: 'Full-stack task management application',
        technologies: ['React', 'Node.js', 'PostgreSQL'],
        bullets: ['Developed responsive dashboard with React and TypeScript'],
      },
    ],
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
  }
}

function createMockV3Content(): GeneratedResumeContent & {
  lead?: string
  section_order?: string[]
} {
  return {
    lead: 'Software Engineer with hands-on experience building scalable web applications.',
    summary: '',
    experience: [
      {
        title: 'Software Engineer Intern',
        company: 'Big Tech',
        location: 'San Francisco, CA',
        dates: 'Jun 2023 - Aug 2023',
        bullets: [
          'Built API services processing 10K+ requests/day using Node.js and Express',
          'Optimized database queries reducing latency by 40% through index tuning',
        ],
      },
    ],
    education: [
      {
        degree: 'BS Computer Science',
        school: 'MIT',
        graduation: 'May 2024',
        gpa: '3.9',
      },
    ],
    skills: {
      languages: ['TypeScript'],
      frameworks: ['React', 'Node.js'],
      tools: ['PostgreSQL', 'AWS'],
      other: ['Team Leadership'],
    },
    projects: [
      {
        name: 'Task Manager App',
        description: 'Full-stack task management application with real-time updates',
        technologies: ['React', 'Node.js', 'PostgreSQL'],
      },
    ],
    section_order: ['education', 'skills', 'experience', 'projects'],
  }
}

describe('generateResumeV3', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates resume with content and markdown', async () => {
    const v3Content = createMockV3Content()
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    const job = createJob({ title: 'Software Engineer', company: 'Startup' }) as any
    const analysis = createSemanticAnalysis() as unknown as SemanticJDAnalysis

    const result = await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    expect(result.content).toBeDefined()
    expect(result.markdown).toContain('# Jane Doe')
    expect(result.markdown).toContain('## EXPERIENCE')
    expect(result.metadata.model_used).toBe('claude-sonnet-4-5-20250929')
    expect(result.metadata.prompt_version).toBe('resume-generate-v3.0.0')
  })

  it('uses dynamic section ordering from analysis', async () => {
    const v3Content = createMockV3Content()
    v3Content.section_order = ['education', 'skills', 'projects', 'experience']
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    const job = createJob() as any
    const analysis = createSemanticAnalysis({
      recommended_section_order: ['projects', 'experience'],
      project_section_total: 90,
      experience_section_total: 70,
    }) as unknown as SemanticJDAnalysis

    const result = await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    expect(result.metadata.section_order).toEqual(['education', 'skills', 'projects', 'experience'])
  })

  it('strips hallucinated skills from V2 output', async () => {
    const v3Content = createMockV3Content()
    v3Content.skills = {
      languages: ['TypeScript', 'Rust'], // Rust not in profile
      frameworks: ['React', 'Django'], // Django not in profile
      tools: ['AWS', 'Kubernetes'], // K8s not in profile
      other: ['Team Leadership', 'Machine Learning'], // ML not in profile
    }
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    const job = createJob() as any
    const analysis = createSemanticAnalysis() as unknown as SemanticJDAnalysis

    const result = await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    const skills = result.content.skills as SkillsV2
    expect(isSkillsV2(skills)).toBe(true)
    expect(skills.languages).toContain('TypeScript')
    expect(skills.languages).not.toContain('Rust')
    expect(skills.frameworks).toContain('React')
    expect(skills.frameworks).not.toContain('Django')
    expect(skills.tools).not.toContain('Kubernetes')
    expect(skills.other).not.toContain('Machine Learning')
  })

  it('tracks pruned entries in metadata', async () => {
    const v3Content = createMockV3Content()
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    profile.experiences.push({
      title: 'Retail Associate',
      company: 'Store',
      start_date: 'Jan 2020',
      end_date: 'May 2020',
      is_current: false,
      bullets: ['Handled customer service'],
    })

    const job = createJob() as any
    const analysis = createSemanticAnalysis({
      entries_to_include: { experiences: [0], projects: [0] },
      entries_to_exclude: {
        experiences: [{ index: 1, reason: 'Unrelated retail role' }],
        projects: [],
      },
    }) as unknown as SemanticJDAnalysis

    const result = await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    expect(result.metadata.pruned_entries).toHaveLength(1)
    expect(result.metadata.pruned_entries[0]).toContain('Retail Associate')
    expect(result.metadata.pruned_entries[0]).toContain('Unrelated retail role')
  })

  it('includes professional title in markdown', async () => {
    const v3Content = createMockV3Content()
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    const job = createJob() as any
    const analysis = createSemanticAnalysis({
      professional_title: 'Full-Stack Engineer',
    }) as unknown as SemanticJDAnalysis

    const result = await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    expect(result.markdown).toContain('*Full-Stack Engineer*')
  })

  it('renders professional lead without heading', async () => {
    const v3Content = createMockV3Content()
    v3Content.lead = 'Software Engineer with deep expertise in distributed systems.'
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    const job = createJob() as any
    const analysis = createSemanticAnalysis() as unknown as SemanticJDAnalysis

    const result = await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    expect(result.markdown).toContain('Software Engineer with deep expertise')
    expect(result.markdown).not.toContain('## PROFESSIONAL SUMMARY')
  })

  it('defaults section order to education, skills, experience, projects', async () => {
    const v3Content = createMockV3Content()
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    const job = createJob() as any
    // experience_section_total > project_section_total (no 20% override)
    const analysis = createSemanticAnalysis({
      experience_section_total: 85,
      project_section_total: 70,
    }) as unknown as SemanticJDAnalysis

    const result = await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    // The AI output section_order is used; but the engine passes 'education', 'skills', 'experience', 'projects'
    // to the AI. Verify it appears in the markdown in the right order.
    const md = result.markdown
    const eduIdx = md.indexOf('## EDUCATION')
    const skillsIdx = md.indexOf('## SKILLS')
    const expIdx = md.indexOf('## EXPERIENCE')
    expect(eduIdx).toBeLessThan(skillsIdx)
    expect(skillsIdx).toBeLessThan(expIdx)
  })

  it('swaps projects before experience when projects score 20%+ higher', async () => {
    const v3Content = createMockV3Content()
    v3Content.section_order = ['education', 'skills', 'projects', 'experience']
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    const job = createJob() as any
    // project_section_total >= experience_section_total * 1.2
    const analysis = createSemanticAnalysis({
      experience_section_total: 60,
      project_section_total: 80,
    }) as unknown as SemanticJDAnalysis

    const result = await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    const md = result.markdown
    const projectsIdx = md.indexOf('## PROJECTS')
    const expIdx = md.indexOf('## EXPERIENCE')
    expect(projectsIdx).toBeLessThan(expIdx)
  })

  it('passes key_metrics to AI input when present', async () => {
    const v3Content = createMockV3Content()
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    profile.experiences[0].key_metrics = '40% latency reduction, 10K daily users'
    profile.projects[0].key_metrics = '500+ GitHub stars'

    const job = createJob() as any
    const analysis = createSemanticAnalysis() as unknown as SemanticJDAnalysis

    await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    const callArgs = mockCreate.mock.calls[0][0]
    const userMessage = JSON.parse(callArgs.messages[0].content)
    expect(userMessage.profile.experiences[0].key_metrics).toBe(
      '40% latency reduction, 10K daily users'
    )
    expect(userMessage.profile.projects[0].key_metrics).toBe('500+ GitHub stars')
  })

  it('strips hallucinated skills from V1 output', async () => {
    const v3Content = createMockV3Content()
    // Override with V1 format skills
    v3Content.skills = {
      technical: ['TypeScript', 'React', 'Rust'],
      other: ['Team Leadership'],
    } as any
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    const job = createJob() as any
    const analysis = createSemanticAnalysis() as unknown as SemanticJDAnalysis

    const result = await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    const skills = result.content.skills as any
    expect(skills.technical).toContain('TypeScript')
    expect(skills.technical).not.toContain('Rust')
  })

  it('counts bullets used in metadata', async () => {
    const v3Content = createMockV3Content()
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    const job = createJob() as any
    const analysis = createSemanticAnalysis() as unknown as SemanticJDAnalysis

    const result = await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    // 2 experience bullets from mock content
    expect(result.metadata.bullets_used).toBe(2)
    expect(result.metadata.bullets_available).toBeGreaterThan(0)
  })

  it('force-includes highest-scored experience when analysis excludes all', async () => {
    const v3Content = createMockV3Content()
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    // Add a second experience so we have > 2 (to avoid the ≤ 2 guardrail)
    profile.experiences.push(
      {
        title: 'Backend Developer',
        company: 'Startup A',
        start_date: 'Jan 2022',
        end_date: 'Dec 2022',
        is_current: false,
        bullets: ['Built microservices'],
      },
      {
        title: 'Retail Associate',
        company: 'Store',
        start_date: 'Jan 2020',
        end_date: 'May 2020',
        is_current: false,
        bullets: ['Handled customer service'],
      }
    )

    const job = createJob() as any
    // Analysis excludes ALL experiences
    const analysis = createSemanticAnalysis({
      entries_to_include: { experiences: [], projects: [0] },
      entries_to_exclude: {
        experiences: [
          { index: 0, reason: 'Not relevant' },
          { index: 1, reason: 'Not relevant' },
          { index: 2, reason: 'Unrelated retail role' },
        ],
        projects: [],
      },
      experience_scores: [
        { index: 0, score: 60, reason: 'Some relevance' },
        { index: 1, score: 45, reason: 'Low relevance' },
        { index: 2, score: 20, reason: 'Unrelated' },
      ],
    }) as unknown as SemanticJDAnalysis

    await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    // Verify the AI was called with at least one experience (the highest-scored one)
    const callArgs = mockCreate.mock.calls[0][0]
    const userMessage = JSON.parse(callArgs.messages[0].content)
    expect(userMessage.profile.experiences.length).toBeGreaterThanOrEqual(1)
    // The highest-scored experience (index 0, score 60) should be included
    expect(userMessage.profile.experiences[0].title).toBe('Software Engineer Intern')
  })

  it('includes all experiences when user has 2 or fewer regardless of analysis', async () => {
    const v3Content = createMockV3Content()
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    // Profile has 1 experience, analysis excludes it
    const job = createJob() as any
    const analysis = createSemanticAnalysis({
      entries_to_include: { experiences: [], projects: [0] },
      entries_to_exclude: {
        experiences: [{ index: 0, reason: 'Different industry' }],
        projects: [],
      },
    }) as unknown as SemanticJDAnalysis

    await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    // With ≤ 2 experiences, ALL should be included regardless of analysis
    const callArgs = mockCreate.mock.calls[0][0]
    const userMessage = JSON.parse(callArgs.messages[0].content)
    expect(userMessage.profile.experiences).toHaveLength(1)
    expect(userMessage.profile.experiences[0].title).toBe('Software Engineer Intern')
  })

  it('includes fact_grounding_note in AI input analysis', async () => {
    const v3Content = createMockV3Content()
    const jsonStr = JSON.stringify(v3Content)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    const job = createJob() as any
    const analysis = createSemanticAnalysis() as unknown as SemanticJDAnalysis

    await generateResumeV3('user-1', profile, job, {}, analysis, {
      name: 'Jane Doe',
      email: 'jane@test.com',
    })

    const callArgs = mockCreate.mock.calls[0][0]
    const userMessage = JSON.parse(callArgs.messages[0].content)
    expect(userMessage.analysis.fact_grounding_note).toContain('FRAMING only')
    expect(userMessage.analysis.fact_grounding_note).toContain('not technical actions')
  })
})
