import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSemanticAnalysis, createJob } from '@/__tests__/helpers'
import type { Job } from '@prisma/client'

// Use vi.hoisted so the mock variable is available during vi.mock hoisting
const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}))

// Mock Anthropic module
vi.mock('@/lib/anthropic', () => ({
  anthropic: {
    messages: { create: mockCreate },
  },
  ANTHROPIC_MODELS: { SONNET: 'claude-sonnet-4-5-20250929' },
  callAnthropic: vi.fn((_userId: string, fn: () => Promise<unknown>) => fn()),
  parseAnthropicJson: vi.fn((message: { content: Array<{ text: string }> }) => {
    const text = message.content[0].text
    return JSON.parse('{' + text)
  }),
}))

// Mock prompts
vi.mock('@/lib/prompts', () => ({
  loadPrompt: vi.fn().mockResolvedValue({
    content: 'System prompt for semantic analysis',
    metadata: {
      version: '1.0.0',
      description: 'Semantic analysis',
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 2000,
      temperature: 0.3,
    },
  }),
}))

import { analyzeJobDescription } from '@/lib/semantic-analyzer'
import { loadPrompt } from '@/lib/prompts'
import type { StructuredProfileData } from '@/lib/resume-generator'

function createTestProfile(): StructuredProfileData {
  return {
    personal: { name: 'Test User', email: 'test@test.com' },
    education: [{ school: 'MIT', degree: 'BS CS', graduation_date: 'May 2024' }],
    experiences: [
      {
        title: 'Software Engineer Intern',
        company: 'Tech Corp',
        start_date: 'Jun 2023',
        end_date: 'Aug 2023',
        is_current: false,
        bullets: ['Built REST APIs serving 10K+ requests/day', 'Led migration to microservices'],
      },
    ],
    projects: [
      {
        name: 'Portfolio App',
        technologies: ['React', 'TypeScript'],
        bullets: ['Developed responsive dashboard with React'],
      },
    ],
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
  }
}

describe('analyzeJobDescription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls Anthropic with correct prompt and input', async () => {
    const analysis = createSemanticAnalysis()
    const jsonStr = JSON.stringify(analysis)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const job = createJob({ title: 'Backend Engineer', company: 'Startup Inc' }) as unknown as Job
    await analyzeJobDescription('user-1', createTestProfile(), job, { requirements: ['Node.js'] })

    expect(loadPrompt).toHaveBeenCalledWith('resume', 'semantic-analysis-v1')
    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-5-20250929',
        system: 'System prompt for semantic analysis',
      })
    )
  })

  it('returns parsed semantic analysis', async () => {
    const analysis = createSemanticAnalysis()
    const jsonStr = JSON.stringify(analysis)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const job = createJob() as unknown as Job
    const result = await analyzeJobDescription('user-1', createTestProfile(), job, {})

    expect(result.role_intent).toBe(analysis.role_intent)
    expect(result.core_competencies).toEqual(analysis.core_competencies)
    expect(result.professional_title).toBe('Software Engineer')
    expect(result.recommended_section_order).toContain('experience')
  })

  it('filters out skills not in user profile', async () => {
    const analysis = createSemanticAnalysis({
      skills_to_emphasize: ['TypeScript', 'React', 'Rust', 'Go'],
    })
    const jsonStr = JSON.stringify(analysis)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const job = createJob() as unknown as Job
    const result = await analyzeJobDescription('user-1', createTestProfile(), job, {})

    expect(result.skills_to_emphasize).toContain('TypeScript')
    expect(result.skills_to_emphasize).toContain('React')
    expect(result.skills_to_emphasize).not.toContain('Rust')
    expect(result.skills_to_emphasize).not.toContain('Go')
  })

  it('handles empty skills_to_emphasize gracefully', async () => {
    const analysis = createSemanticAnalysis({ skills_to_emphasize: [] })
    const jsonStr = JSON.stringify(analysis)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const job = createJob() as unknown as Job
    const result = await analyzeJobDescription('user-1', createTestProfile(), job, {})

    expect(result.skills_to_emphasize).toEqual([])
  })

  it('propagates Anthropic errors', async () => {
    mockCreate.mockRejectedValue(new Error('Anthropic API error: rate limited'))

    const job = createJob() as unknown as Job
    await expect(analyzeJobDescription('user-1', createTestProfile(), job, {})).rejects.toThrow(
      'Anthropic API error'
    )
  })

  it('includes key_metrics in AI input when present', async () => {
    const analysis = createSemanticAnalysis()
    const jsonStr = JSON.stringify(analysis)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const profile = createTestProfile()
    profile.experiences[0].key_metrics = '40% latency reduction, 10K daily users'
    profile.projects[0].key_metrics = '500+ GitHub stars'

    const job = createJob() as unknown as Job
    await analyzeJobDescription('user-1', profile, job, {})

    const callArgs = mockCreate.mock.calls[0][0]
    const userMessage = JSON.parse(callArgs.messages[0].content)
    expect(userMessage.profile.experiences[0].key_metrics).toBe(
      '40% latency reduction, 10K daily users'
    )
    expect(userMessage.profile.projects[0].key_metrics).toBe('500+ GitHub stars')
  })

  it('omits key_metrics from AI input when not set', async () => {
    const analysis = createSemanticAnalysis()
    const jsonStr = JSON.stringify(analysis)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const job = createJob() as unknown as Job
    await analyzeJobDescription('user-1', createTestProfile(), job, {})

    const callArgs = mockCreate.mock.calls[0][0]
    const userMessage = JSON.parse(callArgs.messages[0].content)
    expect(userMessage.profile.experiences[0]).not.toHaveProperty('key_metrics')
    expect(userMessage.profile.projects[0]).not.toHaveProperty('key_metrics')
  })

  it('includes experience and project indices in input', async () => {
    const analysis = createSemanticAnalysis()
    const jsonStr = JSON.stringify(analysis)
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: jsonStr.slice(1) }],
    })

    const job = createJob() as unknown as Job
    await analyzeJobDescription('user-1', createTestProfile(), job, {})

    const callArgs = mockCreate.mock.calls[0][0]
    const userMessage = JSON.parse(callArgs.messages[0].content)
    expect(userMessage.profile.experiences[0].index).toBe(0)
    expect(userMessage.profile.projects[0].index).toBe(0)
  })
})
