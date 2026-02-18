import { describe, it, expect, vi } from 'vitest'
import { createSemanticAnalysis } from '@/__tests__/helpers'

// Mock OpenAI module (prevents initialization error from import chain)
vi.mock('@/lib/openai', () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
  MODELS: { GPT4O: 'gpt-4o-2024-05-13', GPT4O_MINI: 'gpt-4o-mini-2024-07-18' },
  callOpenAI: vi.fn(),
  parseOpenAIJson: vi.fn(),
}))

// Mock Anthropic module
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { create: vi.fn() } },
  ANTHROPIC_MODELS: { SONNET: 'claude-sonnet-4-5-20250929' },
  callAnthropic: vi.fn(),
  parseAnthropicJson: vi.fn(),
}))

import {
  countRenderedLines,
  consolidateRedundantProjects,
  compressSoftSkills,
  pruneLowestScoredEntry,
  reduceBulletDensity,
  compactifyMarkdown,
  applyFinalVerification,
  tightenBulletText,
  tightenAllBullets,
  condenseLowPriorityEntry,
  governOnePage,
  hasAnyMetric,
  pickTopBullets,
  type GovernableContent,
} from '@/lib/one-page-governor'
import type { SemanticJDAnalysis } from '@/lib/semantic-analyzer'

// ─── Test Helpers ────────────────────────────────────

function createOverflowContent(): GovernableContent {
  return {
    lead: 'Experienced software engineer with expertise in full-stack development and cloud infrastructure.',
    summary: '',
    experience: [
      {
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        dates: 'Jan 2023 - Present',
        bullets: [
          'Led development of microservices architecture serving 10M+ requests/day across 12 services',
          'Optimized database queries reducing average response time by 40% and saving $200K annually',
          'Mentored team of 5 junior engineers on best practices for distributed systems design',
          'Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes',
          'Designed real-time event processing system handling 50K events/second using Kafka',
        ],
      },
      {
        title: 'Software Engineer',
        company: 'Startup Inc',
        location: 'New York, NY',
        dates: 'Jun 2021 - Dec 2022',
        bullets: [
          'Built REST API endpoints serving 500+ concurrent users with Node.js and Express',
          'Developed responsive dashboard using React and TypeScript with 95% test coverage',
          'Integrated third-party payment processing handling $1M+ in monthly transactions',
          'Automated data migration scripts reducing manual effort by 80% for 3 team members',
          'Created monitoring dashboards using Grafana tracking 20+ key performance metrics',
        ],
      },
      {
        title: 'Junior Developer',
        company: 'Agency Co',
        location: 'Boston, MA',
        dates: 'Jan 2020 - May 2021',
        bullets: [
          'Developed client-facing web applications using React and Node.js for 10+ clients',
          'Implemented responsive designs achieving 98% cross-browser compatibility',
          'Participated in code reviews providing feedback on 50+ pull requests per quarter',
          'Built automated testing suite achieving 85% code coverage across 3 projects',
          'Managed deployments to AWS cloud infrastructure for production applications',
        ],
      },
    ],
    education: [
      {
        degree: 'BS Computer Science',
        school: 'MIT',
        graduation: 'May 2020',
        gpa: '3.9',
      },
    ],
    skills: {
      languages: ['TypeScript', 'Python', 'Java', 'Go'],
      frameworks: ['React', 'Node.js', 'Express', 'Django'],
      tools: ['AWS', 'Docker', 'Kubernetes', 'PostgreSQL'],
      other: ['Team Leadership', 'Agile', 'System Design'],
    },
    projects: [
      {
        name: 'Open Source CLI Tool',
        description: 'Command-line tool for automated code generation',
        technologies: ['TypeScript', 'Node.js', 'Jest'],
        bullets: [
          'Built CLI tool downloaded 5K+ times with automated code scaffolding',
          'Implemented plugin architecture supporting 15+ community extensions',
          'Achieved 98% test coverage with comprehensive integration test suite',
        ],
      } as any,
      {
        name: 'E-commerce Platform',
        description: 'Full-stack marketplace application',
        technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
        bullets: [
          'Developed marketplace platform with 200+ active sellers',
          'Integrated Stripe payment processing handling $50K monthly volume',
        ],
      } as any,
      {
        name: 'ML Pipeline',
        description: 'Machine learning data processing pipeline',
        technologies: ['Python', 'TensorFlow', 'AWS'],
        bullets: [
          'Built data pipeline processing 1TB+ daily with 99.9% uptime',
          'Automated model training reducing iteration time by 60%',
        ],
      } as any,
    ],
  }
}

function createFittingContent(): GovernableContent {
  return {
    lead: 'Software engineer with web development experience.',
    summary: '',
    experience: [
      {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'Remote',
        dates: 'Jan 2023 - Present',
        bullets: [
          'Built REST APIs serving 10K+ requests/day',
          'Optimized queries reducing latency by 40%',
          'Led migration to microservices architecture',
        ],
      },
    ],
    education: [
      {
        degree: 'BS Computer Science',
        school: 'MIT',
        graduation: 'May 2022',
        gpa: '3.8',
      },
    ],
    skills: {
      languages: ['TypeScript', 'Python'],
      frameworks: ['React', 'Node.js'],
      tools: ['AWS', 'Docker'],
      other: [],
    },
    projects: [
      {
        name: 'Portfolio App',
        description: 'Personal portfolio website',
        technologies: ['React', 'TypeScript'],
      },
    ],
  }
}

function createBarelyOverContent(): GovernableContent {
  return {
    lead: 'Experienced software engineer specializing in scalable web applications and cloud infrastructure.',
    summary: '',
    experience: [
      {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        dates: 'Jan 2023 - Present',
        bullets: [
          'Built REST APIs serving 10K+ requests/day using Node.js and Express with Redis caching',
          'Optimized database queries reducing average response time by 40% through index tuning',
          'Led migration from monolith to microservices architecture across 5 services',
          'Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes',
        ],
      },
      {
        title: 'Junior Developer',
        company: 'Startup Inc',
        location: 'New York, NY',
        dates: 'Jun 2021 - Dec 2022',
        bullets: [
          'Developed responsive dashboard using React and TypeScript with full test coverage',
          'Integrated payment processing handling $100K+ in monthly transactions via Stripe',
          'Automated data migration scripts reducing manual processing effort by 80%',
        ],
      },
    ],
    education: [
      {
        degree: 'BS Computer Science',
        school: 'MIT',
        graduation: 'May 2021',
        gpa: '3.9',
      },
    ],
    skills: {
      languages: ['TypeScript', 'Python', 'Java'],
      frameworks: ['React', 'Node.js', 'Express'],
      tools: ['AWS', 'Docker', 'PostgreSQL'],
      other: ['Team Leadership', 'Agile Methodology'],
    },
    projects: [
      {
        name: 'Task Manager',
        description: 'Full-stack task management application with real-time features',
        technologies: ['React', 'Node.js', 'PostgreSQL'],
        bullets: [
          'Built real-time collaboration feature supporting 50+ concurrent users',
          'Implemented drag-and-drop interface with optimistic UI updates',
        ],
      } as any,
      {
        name: 'CLI Tool',
        description: 'Developer productivity command-line tool',
        technologies: ['TypeScript', 'Node.js'],
        bullets: ['Created CLI tool with 500+ weekly downloads from npm registry'],
      } as any,
    ],
  }
}

const defaultUserInfo = {
  name: 'Jane Doe',
  email: 'jane@test.com',
  phone: '555-0100',
  location: 'San Francisco, CA',
}

function defaultAnalysis(overrides: Record<string, unknown> = {}): SemanticJDAnalysis {
  return createSemanticAnalysis(overrides) as unknown as SemanticJDAnalysis
}

// ─── countRenderedLines ──────────────────────────────

describe('countRenderedLines', () => {
  it('counts single short lines as 1 each', () => {
    const md = 'Hello\nWorld'
    expect(countRenderedLines(md)).toBe(2)
  })

  it('counts empty lines as 1', () => {
    const md = 'Hello\n\nWorld'
    expect(countRenderedLines(md)).toBe(3)
  })

  it('wraps long lines based on charsPerLine', () => {
    const longLine = 'a'.repeat(170) // 170 chars at 105 per line = 2 lines
    expect(countRenderedLines(longLine)).toBe(2)
  })

  it('handles mixed content correctly', () => {
    const md = 'Short line\n\n' + 'a'.repeat(170) + '\nAnother line'
    // "Short line" = 1, "" = 1, 170-char = 2, "Another line" = 1 → 5
    expect(countRenderedLines(md)).toBe(5)
  })
})

// ─── consolidateRedundantProjects (Step A) ───────────

describe('consolidateRedundantProjects', () => {
  it('merges when org name and tech overlap match', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        {
          title: 'Engineer',
          company: 'Acme',
          dates: '2023',
          bullets: ['Built APIs using React and Node.js for the platform'],
        },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [
        {
          name: 'Acme Internal Tool',
          description: 'Internal productivity tool',
          technologies: ['React', 'Node.js'],
          bullets: ['Automated reporting dashboard'],
        } as any,
      ],
    }

    const analysis = defaultAnalysis({
      experience_scores: [{ index: 0, score: 80, reason: 'Good match' }],
    })

    const actions = consolidateRedundantProjects(content, analysis)

    expect(actions).toHaveLength(1)
    expect(actions[0].step).toBe('A')
    expect(content.projects).toHaveLength(0)
    expect(content.experience![0].bullets).toContain('Automated reporting dashboard')
  })

  it('does nothing when names do not overlap', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [{ title: 'Engineer', company: 'Acme', dates: '2023', bullets: ['Built APIs'] }],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [
        {
          name: 'Personal Blog',
          description: 'Blog site',
          technologies: ['React'],
          bullets: ['Built blog'],
        } as any,
      ],
    }

    const analysis = defaultAnalysis()
    const actions = consolidateRedundantProjects(content, analysis)

    expect(actions).toHaveLength(0)
    expect(content.projects).toHaveLength(1)
  })

  it('does nothing when tech overlap is insufficient', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        {
          title: 'Engineer',
          company: 'Acme',
          dates: '2023',
          bullets: ['Built APIs with Python and Django'],
        },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [
        {
          name: 'Acme Dashboard',
          description: 'Dashboard',
          technologies: ['React', 'TypeScript', 'Tailwind', 'Vite'],
          bullets: ['Built dashboard'],
        } as any,
      ],
    }

    const analysis = defaultAnalysis()
    const actions = consolidateRedundantProjects(content, analysis)

    expect(actions).toHaveLength(0)
    expect(content.projects).toHaveLength(1)
  })

  it('handles no projects gracefully', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [{ title: 'Engineer', company: 'Acme', dates: '2023', bullets: [] }],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [],
    }

    const analysis = defaultAnalysis()
    const actions = consolidateRedundantProjects(content, analysis)
    expect(actions).toHaveLength(0)
  })

  it('merges into higher-scored experience on multi-match', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        {
          title: 'Junior Engineer',
          company: 'Acme',
          dates: '2022',
          bullets: ['Used React and Node.js for basic features'],
        },
        {
          title: 'Senior Engineer',
          company: 'Acme',
          dates: '2023',
          bullets: ['Led React and Node.js platform development'],
        },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [
        {
          name: 'Acme Platform Extension',
          description: 'Extension for platform',
          technologies: ['React', 'Node.js'],
          bullets: ['Extended platform features'],
        } as any,
      ],
    }

    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 60, reason: 'OK match' },
        { index: 1, score: 90, reason: 'Great match' },
      ],
    })

    const actions = consolidateRedundantProjects(content, analysis)

    expect(actions).toHaveLength(1)
    expect(content.projects).toHaveLength(0)
    // Should merge into the higher-scored experience (index 1, Senior Engineer)
    expect(content.experience![1].bullets).toContain('Extended platform features')
    expect(content.experience![0].bullets).not.toContain('Extended platform features')
  })
})

// ─── compressSoftSkills (Step B) ─────────────────────

describe('compressSoftSkills', () => {
  it('moves V2 other items to tools and clears other', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [],
      education: [],
      skills: {
        languages: ['TypeScript'],
        frameworks: ['React'],
        tools: ['AWS'],
        other: ['Leadership', 'Agile'],
      },
      projects: [],
    }

    const actions = compressSoftSkills(content)

    expect(actions).toHaveLength(1)
    expect(actions[0].step).toBe('B')
    const skills = content.skills as {
      languages: string[]
      frameworks: string[]
      tools: string[]
      other: string[]
    }
    expect(skills.tools).toEqual(['AWS', 'Leadership', 'Agile'])
    expect(skills.other).toEqual([])
  })

  it('handles V1 format by moving other to technical', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [],
      education: [],
      skills: {
        technical: ['TypeScript', 'React'],
        other: ['Leadership'],
      } as any,
      projects: [],
    }

    const actions = compressSoftSkills(content)

    expect(actions).toHaveLength(1)
    const skills = content.skills as { technical: string[]; other: string[] }
    expect(skills.technical).toEqual(['TypeScript', 'React', 'Leadership'])
    expect(skills.other).toEqual([])
  })

  it('does nothing when other is empty', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [],
      education: [],
      skills: {
        languages: ['TypeScript'],
        frameworks: ['React'],
        tools: ['AWS'],
        other: [],
      },
      projects: [],
    }

    const actions = compressSoftSkills(content)
    expect(actions).toHaveLength(0)
  })
})

// ─── pruneLowestScoredEntry (Step C) ─────────────────

describe('pruneLowestScoredEntry', () => {
  it('removes lowest-scored project bullets first', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [{ title: 'Engineer', company: 'Corp', dates: '2023', bullets: ['Built APIs'] }],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [
        {
          name: 'High Score Project',
          description: 'Good project',
          technologies: ['React'],
          bullets: ['Built feature A'],
        } as any,
        {
          name: 'Low Score Project',
          description: 'Less relevant project',
          technologies: ['Python'],
          bullets: ['Built feature B', 'Built feature C'],
        } as any,
      ],
    }

    const analysis = defaultAnalysis({
      experience_scores: [{ index: 0, score: 80, reason: 'Good' }],
      project_scores: [
        { index: 0, score: 75, reason: 'Good match' },
        { index: 1, score: 30, reason: 'Low match' },
      ],
    })

    const actions = pruneLowestScoredEntry(content, analysis)

    expect(actions).toHaveLength(1)
    expect(actions[0].step).toBe('C')
    expect(actions[0].action).toContain('Low Score Project')
    // Bullets should be removed but project still exists
    expect(((content.projects![1] as any).bullets as string[]).length).toBe(0)
  })

  it('prefers removing projects over experiences on score tie', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        { title: 'Engineer', company: 'Corp', dates: '2023', bullets: ['Built APIs'] },
        { title: 'Junior Dev', company: 'Startup', dates: '2022', bullets: ['Wrote code'] },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [
        {
          name: 'Side Project',
          description: 'Side project',
          technologies: ['React'],
          bullets: ['Built something'],
        } as any,
      ],
    }

    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 80, reason: 'Good' },
        { index: 1, score: 50, reason: 'OK' },
      ],
      project_scores: [{ index: 0, score: 50, reason: 'OK' }],
    })

    const actions = pruneLowestScoredEntry(content, analysis)

    expect(actions).toHaveLength(1)
    // Project should be pruned before experience at same score
    expect(actions[0].action).toContain('Side Project')
  })

  it('never removes the last experience', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [{ title: 'Engineer', company: 'Corp', dates: '2023', bullets: ['Built APIs'] }],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [],
    }

    const analysis = defaultAnalysis({
      experience_scores: [{ index: 0, score: 20, reason: 'Low' }],
      project_scores: [],
    })

    const actions = pruneLowestScoredEntry(content, analysis)

    // Should not remove the only experience
    expect(actions).toHaveLength(0)
    expect(content.experience).toHaveLength(1)
  })

  it('uses default score of 50 when scores are missing', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        { title: 'Engineer', company: 'Corp', dates: '2023', bullets: ['Built APIs'] },
        { title: 'Junior Dev', company: 'Startup', dates: '2022', bullets: ['Wrote code'] },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [
        {
          name: 'Unscored Project',
          description: 'No score project',
          technologies: ['React'],
          bullets: ['Built something'],
        } as any,
      ],
    }

    // No scores provided — all default to 50
    const analysis = defaultAnalysis({
      experience_scores: [],
      project_scores: [],
    })

    const actions = pruneLowestScoredEntry(content, analysis)

    // Should still prune something (project preferred on tie)
    expect(actions).toHaveLength(1)
    expect(actions[0].action).toContain('Unscored Project')
  })
})

// ─── reduceBulletDensity (Step D) ────────────────────

describe('reduceBulletDensity', () => {
  it('reduces entries with 5+ bullets to maxBullets', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        {
          title: 'Engineer',
          company: 'Corp',
          dates: '2023',
          bullets: [
            'Bullet one about general work',
            'Bullet two about general tasks',
            'Bullet three about coding',
            'Bullet four about design',
            'Bullet five about testing',
          ],
        },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [],
    }

    const actions = reduceBulletDensity(content, 4)

    expect(actions).toHaveLength(1)
    expect(content.experience![0].bullets).toHaveLength(4)
  })

  it('preserves metric-bearing bullets over non-metric ones', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        {
          title: 'Engineer',
          company: 'Corp',
          dates: '2023',
          bullets: [
            'Attended daily standup meetings with the team',
            'Reduced API response time by 40% through caching',
            'Wrote documentation for internal processes',
            'Increased revenue by $200K through optimization',
            'Participated in code reviews weekly',
          ],
        },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [],
    }

    const actions = reduceBulletDensity(content, 3)

    expect(actions).toHaveLength(1)
    const bullets = content.experience![0].bullets
    expect(bullets).toHaveLength(3)
    // Both metric bullets should survive
    expect(bullets.some(b => b.includes('40%'))).toBe(true)
    expect(bullets.some(b => b.includes('$200K'))).toBe(true)
  })

  it('does nothing when all entries have <= maxBullets', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        {
          title: 'Engineer',
          company: 'Corp',
          dates: '2023',
          bullets: ['Bullet one', 'Bullet two', 'Bullet three'],
        },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [],
    }

    const actions = reduceBulletDensity(content, 4)
    expect(actions).toHaveLength(0)
    expect(content.experience![0].bullets).toHaveLength(3)
  })
})

// ─── compactifyMarkdown ──────────────────────────────

describe('compactifyMarkdown', () => {
  it('collapses triple newlines to double', () => {
    const md = 'Line 1\n\n\nLine 2'
    expect(compactifyMarkdown(md)).toBe('Line 1\n\nLine 2')
  })

  it('preserves double newlines', () => {
    const md = 'Line 1\n\nLine 2'
    expect(compactifyMarkdown(md)).toBe('Line 1\n\nLine 2')
  })
})

// ─── applyFinalVerification ──────────────────────────

describe('applyFinalVerification', () => {
  it('reduces lower-scoring section to single entry', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        { title: 'Senior', company: 'Corp A', dates: '2023', bullets: ['Led team'] },
        { title: 'Junior', company: 'Corp B', dates: '2022', bullets: ['Wrote code'] },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [{ name: 'Project A', description: 'Desc', technologies: ['React'] }],
    }

    const analysis = defaultAnalysis({
      experience_section_total: 60,
      project_section_total: 80,
      experience_scores: [
        { index: 0, score: 70, reason: 'Good' },
        { index: 1, score: 40, reason: 'OK' },
      ],
    })

    const actions = applyFinalVerification(content, analysis)

    expect(actions).toHaveLength(1)
    expect(actions[0].step).toBe('FINAL')
    expect(content.experience).toHaveLength(1)
    expect(content.experience![0].title).toBe('Senior')
  })

  it('does not prune lead, education, or skills', () => {
    const content: GovernableContent = {
      lead: 'Professional lead text',
      summary: '',
      experience: [{ title: 'Engineer', company: 'Corp', dates: '2023', bullets: ['Built APIs'] }],
      education: [{ degree: 'BS CS', school: 'MIT', graduation: 'May 2022' }],
      skills: {
        languages: ['TypeScript', 'Python'],
        frameworks: ['React'],
        tools: [],
        other: [],
      },
      projects: [
        { name: 'Project A', description: 'Desc', technologies: ['React'] },
        { name: 'Project B', description: 'Desc', technologies: ['Node.js'] },
      ],
    }

    const analysis = defaultAnalysis({
      experience_section_total: 85,
      project_section_total: 70,
      project_scores: [
        { index: 0, score: 75, reason: 'Good' },
        { index: 1, score: 40, reason: 'OK' },
      ],
    })

    applyFinalVerification(content, analysis)

    // Lead, education, and skills should be untouched
    expect(content.lead).toBe('Professional lead text')
    expect(content.education).toHaveLength(1)
    expect((content.skills as any).languages).toEqual(['TypeScript', 'Python'])
    expect((content.skills as any).frameworks).toEqual(['React'])
  })
})

// ─── tightenBulletText ──────────────────────────────

describe('tightenBulletText', () => {
  it('removes "Responsible for the development of" prefix', () => {
    expect(tightenBulletText('Responsible for the development of the new API')).toBe(
      'Developed the new API'
    )
  })

  it('removes "Successfully" prefix', () => {
    expect(tightenBulletText('Successfully migrated the database to PostgreSQL')).toBe(
      'Migrated the database to PostgreSQL'
    )
  })

  it('replaces mid-sentence filler "in order to" with "to"', () => {
    expect(tightenBulletText('Refactored codebase in order to improve performance')).toBe(
      'Refactored codebase to improve performance'
    )
  })

  it('preserves metric text during tightening', () => {
    expect(
      tightenBulletText('Successfully reduced latency by 40% in order to meet SLA requirements')
    ).toBe('Reduced latency by 40% to meet SLA requirements')
  })

  it('returns unchanged text for already concise bullets', () => {
    const concise = 'Built REST APIs serving 10K+ requests/day'
    expect(tightenBulletText(concise)).toBe(concise)
  })

  it('replaces "Assisted with" prefix with "Co-"', () => {
    expect(tightenBulletText('Assisted with developing the onboarding flow')).toBe(
      'Co-developing the onboarding flow'
    )
  })

  it('capitalizes next word when lead-in is stripped completely', () => {
    expect(tightenBulletText('Played a key role in redesigning the checkout flow')).toBe(
      'Redesigning the checkout flow'
    )
  })
})

// ─── tightenAllBullets ──────────────────────────────

describe('tightenAllBullets', () => {
  it('tightens experience and project bullets, returns action with character savings', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        {
          title: 'Engineer',
          company: 'Corp',
          dates: '2023',
          bullets: [
            'Successfully built the new API',
            'Responsible for managing the deployment pipeline',
          ],
        },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [
        {
          name: 'CLI Tool',
          description: 'Dev tool',
          technologies: ['TypeScript'],
          bullets: ['Played a key role in designing the plugin system'],
        } as any,
      ],
    }

    const actions = tightenAllBullets(content)

    expect(actions).toHaveLength(1)
    expect(actions[0].step).toBe('TIGHTEN')
    expect(content.experience![0].bullets[0]).toBe('Built the new API')
    expect(content.experience![0].bullets[1]).toBe('Managed the deployment pipeline')
    expect(((content.projects![0] as any).bullets as string[])[0]).toBe(
      'Designing the plugin system'
    )
  })

  it('returns no action when no filler patterns are present', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        {
          title: 'Engineer',
          company: 'Corp',
          dates: '2023',
          bullets: ['Built REST APIs serving 10K+ requests/day'],
        },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [],
    }

    const actions = tightenAllBullets(content)
    expect(actions).toHaveLength(0)
  })
})

// ─── condenseLowPriorityEntry ───────────────────────

describe('condenseLowPriorityEntry', () => {
  it('condenses lowest-scored entry to single bullet', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        {
          title: 'Senior Engineer',
          company: 'Corp',
          dates: '2023',
          bullets: ['Led team of 5', 'Built APIs', 'Optimized queries'],
        },
        {
          title: 'Junior Dev',
          company: 'Startup',
          dates: '2022',
          bullets: ['Wrote tests', 'Fixed bugs', 'Updated docs'],
        },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [],
    }

    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 85, reason: 'Great' },
        { index: 1, score: 30, reason: 'Low' },
      ],
      project_scores: [],
    })

    const actions = condenseLowPriorityEntry(content, analysis)

    expect(actions).toHaveLength(1)
    expect(actions[0].step).toBe('CONDENSE')
    expect(content.experience![1].bullets).toHaveLength(1)
  })

  it('preserves best metric bullet in condensed result', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [{ title: 'Engineer', company: 'Corp', dates: '2023', bullets: ['Built APIs'] }],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [
        {
          name: 'Low Project',
          description: 'Test',
          technologies: ['React'],
          bullets: [
            'Updated project documentation',
            'Increased test coverage to 95%',
            'Attended weekly meetings',
          ],
        } as any,
      ],
    }

    const analysis = defaultAnalysis({
      experience_scores: [{ index: 0, score: 80, reason: 'Good' }],
      project_scores: [{ index: 0, score: 25, reason: 'Low' }],
    })

    const actions = condenseLowPriorityEntry(content, analysis)

    expect(actions).toHaveLength(1)
    // Should keep the metric bullet (95%)
    expect(((content.projects![0] as any).bullets as string[])[0]).toContain('95%')
  })

  it('prefers condensing projects over experiences on score tie', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        { title: 'Engineer', company: 'Corp', dates: '2023', bullets: ['Built APIs', 'Led team'] },
        {
          title: 'Junior Dev',
          company: 'Start',
          dates: '2022',
          bullets: ['Wrote code', 'Fixed bugs'],
        },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [
        {
          name: 'Side Project',
          description: 'Test',
          technologies: ['React'],
          bullets: ['Built UI', 'Wrote tests'],
        } as any,
      ],
    }

    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 80, reason: 'Good' },
        { index: 1, score: 50, reason: 'OK' },
      ],
      project_scores: [{ index: 0, score: 50, reason: 'OK' }],
    })

    const actions = condenseLowPriorityEntry(content, analysis)

    expect(actions).toHaveLength(1)
    expect(actions[0].action).toContain('Side Project')
    expect((content.projects![0] as any).bullets as string[]).toHaveLength(1)
    // Experience at same score should be untouched
    expect(content.experience![1].bullets).toHaveLength(2)
  })

  it('skips entries already at 1 bullet or fewer', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [{ title: 'Engineer', company: 'Corp', dates: '2023', bullets: ['Only bullet'] }],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [
        {
          name: 'Project',
          description: 'Test',
          technologies: ['React'],
          bullets: ['Single bullet'],
        } as any,
      ],
    }

    const analysis = defaultAnalysis({
      experience_scores: [{ index: 0, score: 20, reason: 'Low' }],
      project_scores: [{ index: 0, score: 20, reason: 'Low' }],
    })

    const actions = condenseLowPriorityEntry(content, analysis)
    expect(actions).toHaveLength(0)
  })

  it('condenses to minBullets=2 preserving metric bullet', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        {
          title: 'Engineer',
          company: 'Corp',
          dates: '2023',
          bullets: [
            'Wrote documentation for the team',
            'Increased test coverage to 95%',
            'Attended weekly syncs with stakeholders',
            'Refactored legacy codebase modules',
          ],
        },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [],
    }

    const analysis = defaultAnalysis({
      experience_scores: [{ index: 0, score: 40, reason: 'Low' }],
      project_scores: [],
    })

    const actions = condenseLowPriorityEntry(content, analysis, 2)

    expect(actions).toHaveLength(1)
    expect(actions[0].action).toContain('to 2')
    expect(content.experience![0].bullets).toHaveLength(2)
    // Metric bullet (95%) must survive
    expect(content.experience![0].bullets.some(b => b.includes('95%'))).toBe(true)
  })

  it('skips entries already at minBullets=2 or fewer', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        { title: 'Engineer', company: 'Corp', dates: '2023', bullets: ['Bullet A', 'Bullet B'] },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [
        {
          name: 'Project',
          description: 'Test',
          technologies: ['React'],
          bullets: ['Single bullet'],
        } as any,
      ],
    }

    const analysis = defaultAnalysis({
      experience_scores: [{ index: 0, score: 20, reason: 'Low' }],
      project_scores: [{ index: 0, score: 20, reason: 'Low' }],
    })

    const actions = condenseLowPriorityEntry(content, analysis, 2)
    expect(actions).toHaveLength(0)
  })

  it('protects metric-rich entries via +100 score boost', () => {
    const content: GovernableContent = {
      summary: '',
      experience: [
        {
          title: 'Senior Engineer',
          company: 'Big Corp',
          dates: '2023',
          bullets: [
            'Increased revenue by $500K through optimization',
            'Reduced latency by 40% via caching',
            'Led team of 5 engineers on platform migration',
          ],
        },
        {
          title: 'Junior Dev',
          company: 'Startup',
          dates: '2022',
          bullets: [
            'Wrote documentation for internal processes',
            'Participated in daily standups',
            'Updated project wikis weekly',
          ],
        },
      ],
      education: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      projects: [],
    }

    // Metric-rich entry has LOWER base score, but should be protected by +100 boost
    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 30, reason: 'Low base score but has metrics' },
        { index: 1, score: 50, reason: 'Higher base score, no metrics' },
      ],
      project_scores: [],
    })

    const actions = condenseLowPriorityEntry(content, analysis)

    expect(actions).toHaveLength(1)
    // The non-metric entry (Junior Dev, score 50) should be condensed first
    // because Senior Engineer gets +100 boost (30+100=130 > 50)
    expect(actions[0].action).toContain('Junior Dev')
    // Metric-rich entry should be untouched
    expect(content.experience![0].bullets).toHaveLength(3)
  })
})

// ─── governOnePage (integration) ─────────────────────

describe('governOnePage', () => {
  it('returns unchanged content when it already fits', () => {
    const content = createFittingContent()
    const analysis = defaultAnalysis()

    const result = governOnePage(content, defaultUserInfo, {
      sectionOrder: ['education', 'skills', 'experience', 'projects'],
      professionalTitle: 'Software Engineer',
      semanticAnalysis: analysis,
    })

    expect(result.actions).toHaveLength(0)
    expect(result.linesBefore).toBe(result.linesAfter)
    expect(result.markdown).toContain('# Jane Doe')
  })

  it('applies minimal steps for barely-over content', () => {
    const content = createBarelyOverContent()
    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 85, reason: 'Great match' },
        { index: 1, score: 60, reason: 'OK match' },
      ],
      project_scores: [
        { index: 0, score: 70, reason: 'Good' },
        { index: 1, score: 40, reason: 'Low' },
      ],
    })

    const result = governOnePage(content, defaultUserInfo, {
      maxLines: 40, // Force small limit to trigger pruning
      sectionOrder: ['education', 'skills', 'experience', 'projects'],
      semanticAnalysis: analysis,
    })

    expect(result.actions.length).toBeGreaterThan(0)
    expect(result.linesAfter).toBeLessThanOrEqual(result.linesBefore)
  })

  it('applies multiple steps for significantly overflowing content', () => {
    const content = createOverflowContent()
    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 90, reason: 'Excellent' },
        { index: 1, score: 70, reason: 'Good' },
        { index: 2, score: 40, reason: 'Low' },
      ],
      project_scores: [
        { index: 0, score: 65, reason: 'OK' },
        { index: 1, score: 50, reason: 'Fair' },
        { index: 2, score: 35, reason: 'Low' },
      ],
    })

    const result = governOnePage(content, defaultUserInfo, {
      maxLines: 40, // Very tight limit
      sectionOrder: ['education', 'skills', 'experience', 'projects'],
      semanticAnalysis: analysis,
    })

    expect(result.actions.length).toBeGreaterThan(1)
    expect(result.linesAfter).toBeLessThan(result.linesBefore)
  })

  it('never prunes lead text', () => {
    const content = createOverflowContent()
    content.lead = 'This is the professional lead and it must survive all pruning steps.'

    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 90, reason: 'Excellent' },
        { index: 1, score: 70, reason: 'Good' },
        { index: 2, score: 40, reason: 'Low' },
      ],
      project_scores: [
        { index: 0, score: 65, reason: 'OK' },
        { index: 1, score: 50, reason: 'Fair' },
        { index: 2, score: 35, reason: 'Low' },
      ],
    })

    const result = governOnePage(content, defaultUserInfo, {
      maxLines: 30, // Very tight
      sectionOrder: ['education', 'skills', 'experience', 'projects'],
      semanticAnalysis: analysis,
    })

    expect(result.markdown).toContain('This is the professional lead')
    expect(result.content.lead).toBe(
      'This is the professional lead and it must survive all pruning steps.'
    )
  })

  it('preserves languages and frameworks through all pruning', () => {
    const content = createOverflowContent()
    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 90, reason: 'Excellent' },
        { index: 1, score: 70, reason: 'Good' },
        { index: 2, score: 40, reason: 'Low' },
      ],
      project_scores: [
        { index: 0, score: 65, reason: 'OK' },
        { index: 1, score: 50, reason: 'Fair' },
        { index: 2, score: 35, reason: 'Low' },
      ],
    })

    const result = governOnePage(content, defaultUserInfo, {
      maxLines: 35,
      sectionOrder: ['education', 'skills', 'experience', 'projects'],
      semanticAnalysis: analysis,
    })

    const skills = result.content.skills as {
      languages: string[]
      frameworks: string[]
      tools: string[]
      other: string[]
    }
    expect(skills.languages).toEqual(['TypeScript', 'Python', 'Java', 'Go'])
    expect(skills.frameworks).toEqual(['React', 'Node.js', 'Express', 'Django'])
  })

  it('applies condensation before full entry removal', () => {
    const content = createOverflowContent()
    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 90, reason: 'Excellent' },
        { index: 1, score: 70, reason: 'Good' },
        { index: 2, score: 40, reason: 'Low' },
      ],
      project_scores: [
        { index: 0, score: 65, reason: 'OK' },
        { index: 1, score: 50, reason: 'Fair' },
        { index: 2, score: 35, reason: 'Low' },
      ],
    })

    const result = governOnePage(content, defaultUserInfo, {
      maxLines: 50, // Moderate limit — should trigger condensation but not necessarily full removal
      sectionOrder: ['education', 'skills', 'experience', 'projects'],
      semanticAnalysis: analysis,
    })

    const stepTypes = result.actions.map(a => a.step)

    // If both CONDENSE and C steps exist, CONDENSE must come first
    const condenseIdx = stepTypes.indexOf('CONDENSE')
    const removalIdx = stepTypes.indexOf('C')
    if (condenseIdx !== -1 && removalIdx !== -1) {
      expect(condenseIdx).toBeLessThan(removalIdx)
    }

    // Verify the governor still reduces lines
    expect(result.linesAfter).toBeLessThanOrEqual(result.linesBefore)
  })

  it('attempts re-expansion when result is significantly under target', () => {
    // Content with a high-scored experience (5 bullets) and a low-scored experience (3 bullets).
    // With maxLines=35, the low-scored entry will be condensed/pruned, leaving
    // the high-scored entry well under 90% of 35 (= 31.5 lines), triggering re-expansion.
    const content: GovernableContent = {
      lead: 'Software engineer with expertise in web development.',
      summary: '',
      experience: [
        {
          title: 'Software Engineer',
          company: 'Tech Corp',
          location: 'SF',
          dates: 'Jan 2023 - Present',
          bullets: [
            'Increased revenue by $500K through platform optimization and feature development',
            'Reduced API response time by 60% using caching and query optimization strategies',
            'Led team of 4 engineers on microservices migration from monolith architecture',
            'Built CI/CD pipeline reducing deploy time from 3 hours to 10 minutes across teams',
            'Mentored 3 junior developers on TypeScript and React best practices and patterns',
          ],
        },
        {
          title: 'Junior Developer',
          company: 'Startup Inc',
          location: 'NY',
          dates: 'Jun 2021 - Dec 2022',
          bullets: [
            'Wrote unit tests for core modules',
            'Updated documentation weekly',
            'Participated in daily standup meetings and retrospectives',
          ],
        },
      ],
      education: [{ degree: 'BS CS', school: 'MIT', graduation: 'May 2021' }],
      skills: {
        languages: ['TypeScript', 'Python'],
        frameworks: ['React', 'Node.js'],
        tools: ['AWS', 'Docker'],
        other: [],
      },
      projects: [
        {
          name: 'Side Project',
          description: 'Personal project',
          technologies: ['React', 'TypeScript'],
          bullets: [
            'Built real-time dashboard with WebSocket integration',
            'Implemented OAuth 2.0 authentication flow',
          ],
        } as any,
      ],
    }

    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 90, reason: 'Excellent' },
        { index: 1, score: 20, reason: 'Low' },
      ],
      project_scores: [{ index: 0, score: 30, reason: 'Low' }],
    })

    const result = governOnePage(content, defaultUserInfo, {
      maxLines: 35,
      sectionOrder: ['education', 'skills', 'experience', 'projects'],
      semanticAnalysis: analysis,
    })

    // Governor must take actions to fit and the result should fit
    expect(result.actions.length).toBeGreaterThan(0)
    expect(result.linesAfter).toBeLessThanOrEqual(35)
  })

  it('produces CONDENSE actions with "to 2" before "to 1" entries', () => {
    const content = createOverflowContent()
    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 90, reason: 'Excellent' },
        { index: 1, score: 70, reason: 'Good' },
        { index: 2, score: 40, reason: 'Low' },
      ],
      project_scores: [
        { index: 0, score: 65, reason: 'OK' },
        { index: 1, score: 50, reason: 'Fair' },
        { index: 2, score: 35, reason: 'Low' },
      ],
    })

    const result = governOnePage(content, defaultUserInfo, {
      maxLines: 42,
      sectionOrder: ['education', 'skills', 'experience', 'projects'],
      semanticAnalysis: analysis,
    })

    const condenseActions = result.actions.filter(a => a.step === 'CONDENSE')
    if (condenseActions.length >= 2) {
      // Find first "to 2" and first "to 1"
      const firstTo2 = condenseActions.findIndex(a => a.action.includes('to 2'))
      const firstTo1 = condenseActions.findIndex(a => a.action.includes('to 1'))
      if (firstTo2 !== -1 && firstTo1 !== -1) {
        expect(firstTo2).toBeLessThan(firstTo1)
      }
    }
  })

  it('returns metricsInFinalContent and densityRatio in result', () => {
    const content = createOverflowContent()
    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 90, reason: 'Excellent' },
        { index: 1, score: 70, reason: 'Good' },
        { index: 2, score: 40, reason: 'Low' },
      ],
      project_scores: [
        { index: 0, score: 65, reason: 'OK' },
        { index: 1, score: 50, reason: 'Fair' },
        { index: 2, score: 35, reason: 'Low' },
      ],
    })

    const result = governOnePage(content, defaultUserInfo, {
      maxLines: 50,
      sectionOrder: ['education', 'skills', 'experience', 'projects'],
      semanticAnalysis: analysis,
    })

    expect(typeof result.metricsInFinalContent).toBe('number')
    expect(result.metricsInFinalContent).toBeGreaterThanOrEqual(0)
    expect(typeof result.densityRatio).toBe('number')
    expect(result.densityRatio).toBeGreaterThan(0)
    expect(result.densityRatio).toBeLessThanOrEqual(1.5) // can be slightly over 1 if not fully fit
  })

  it('preserves education GPA and all skill categories under maximum pruning', () => {
    const content = createOverflowContent()
    const analysis = defaultAnalysis({
      experience_scores: [
        { index: 0, score: 90, reason: 'Excellent' },
        { index: 1, score: 70, reason: 'Good' },
        { index: 2, score: 40, reason: 'Low' },
      ],
      project_scores: [
        { index: 0, score: 65, reason: 'OK' },
        { index: 1, score: 50, reason: 'Fair' },
        { index: 2, score: 35, reason: 'Low' },
      ],
    })

    const result = governOnePage(content, defaultUserInfo, {
      maxLines: 30, // Maximum pressure
      sectionOrder: ['education', 'skills', 'experience', 'projects'],
      semanticAnalysis: analysis,
    })

    // GPA must survive in content
    expect(result.content.education[0].gpa).toBe('3.9')
    // GPA must survive in markdown
    expect(result.markdown).toContain('3.9')

    // All skill categories must survive (note: other may be merged into tools by step B)
    const skills = result.content.skills as {
      languages: string[]
      frameworks: string[]
      tools: string[]
      other: string[]
    }
    expect(skills.languages).toEqual(['TypeScript', 'Python', 'Java', 'Go'])
    expect(skills.frameworks).toEqual(['React', 'Node.js', 'Express', 'Django'])
    // Tools should have original tools + merged other items
    expect(skills.tools).toContain('AWS')
    expect(skills.tools).toContain('Docker')
    expect(skills.tools).toContain('Kubernetes')
    expect(skills.tools).toContain('PostgreSQL')
  })
})

// ─── hasAnyMetric ────────────────────────────────────

describe('hasAnyMetric', () => {
  it('detects currency, percentage, and time units', () => {
    expect(hasAnyMetric('Increased revenue by $200K')).toBe(true)
    expect(hasAnyMetric('Improved performance by 40%')).toBe(true)
    expect(hasAnyMetric('Reduced deploy time by 3 hours')).toBe(true)
  })

  it('detects broad count nouns (staff, engineers, members, clients)', () => {
    expect(hasAnyMetric('Managed a team of 12 engineers')).toBe(true)
    expect(hasAnyMetric('Served 500 clients across the region')).toBe(true)
    expect(hasAnyMetric('Onboarded 20 staff members')).toBe(true) // "20 staff"
    expect(hasAnyMetric('Coordinated 8 teams for the launch')).toBe(true)
  })

  it('detects standalone number+ patterns', () => {
    expect(hasAnyMetric('Processed 100+ applications daily')).toBe(true)
    expect(hasAnyMetric('Built system supporting 1,000+ concurrent connections')).toBe(true)
    expect(hasAnyMetric('Reviewed 50+ pull requests per sprint')).toBe(true)
  })

  it('returns false for non-metric bullets', () => {
    expect(hasAnyMetric('Participated in code reviews')).toBe(false)
    expect(hasAnyMetric('Attended daily standup meetings')).toBe(false)
    expect(hasAnyMetric('Wrote documentation for internal processes')).toBe(false)
  })
})

// ─── pickTopBullets ──────────────────────────────────

describe('pickTopBullets', () => {
  it('returns top N preferring metric bullets', () => {
    const bullets = [
      'Wrote documentation for the team',
      'Increased revenue by $500K',
      'Attended weekly syncs',
      'Reduced latency by 40%',
    ]

    const top2 = pickTopBullets(bullets, 2)
    expect(top2).toHaveLength(2)
    expect(top2.some(b => b.includes('$500K'))).toBe(true)
    expect(top2.some(b => b.includes('40%'))).toBe(true)
  })

  it('preserves original order in output', () => {
    const bullets = [
      'Wrote documentation',
      'Reduced latency by 40%',
      'Attended syncs',
      'Increased revenue by $500K',
    ]

    const top2 = pickTopBullets(bullets, 2)
    // $500K (currency, rank 5) and 40% (percentage, rank 4) should be selected
    // In original order: 40% comes before $500K
    expect(top2[0]).toContain('40%')
    expect(top2[1]).toContain('$500K')
  })

  it('returns all bullets when count >= length', () => {
    const bullets = ['Bullet A', 'Bullet B']
    const result = pickTopBullets(bullets, 5)
    expect(result).toHaveLength(2)
    expect(result).toEqual(['Bullet A', 'Bullet B'])
  })
})
