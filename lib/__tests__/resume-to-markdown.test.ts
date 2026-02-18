import { describe, it, expect, vi } from 'vitest'

// Mock OpenAI module (prevents initialization error from resume-generator import chain)
vi.mock('@/lib/openai', () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
  MODELS: { GPT4O: 'gpt-4o-2024-05-13', GPT4O_MINI: 'gpt-4o-mini-2024-07-18' },
  callOpenAI: vi.fn(),
  parseOpenAIJson: vi.fn(),
}))

import {
  generateResumeMarkdown,
  generateCoverLetterMarkdown,
} from '@/lib/markdown/resume-to-markdown'
import type { GeneratedResumeContent } from '@/lib/resume-generator'

function createFullContent(): GeneratedResumeContent {
  return {
    summary: 'Experienced software engineer with 3+ years building web applications.',
    experience: [
      {
        title: 'Software Engineer',
        company: 'Acme Corp',
        location: 'San Francisco, CA',
        dates: 'Jan 2022 - Present',
        bullets: [
          'Built REST APIs serving 10K+ requests/day',
          'Led migration from monolith to microservices',
        ],
      },
      {
        title: 'Junior Developer',
        company: 'StartupCo',
        dates: 'Jun 2020 - Dec 2021',
        bullets: ['Developed React components for dashboard'],
      },
    ],
    education: [
      {
        degree: 'B.S. Computer Science',
        school: 'MIT',
        graduation: 'May 2020',
        gpa: '3.8',
      },
    ],
    skills: {
      technical: ['TypeScript', 'React', 'Node.js'],
      other: ['Leadership', 'Agile'],
    },
    projects: [
      {
        name: 'Open Source CLI Tool',
        description: 'Command-line tool for code generation',
        technologies: ['Go', 'Docker'],
      },
    ],
  }
}

const defaultUserInfo = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '555-0100',
  location: 'New York, NY',
  linkedin: 'linkedin.com/in/janedoe',
  github: 'github.com/janedoe',
}

describe('generateResumeMarkdown', () => {
  it('produces correct Markdown with all sections', () => {
    const md = generateResumeMarkdown(createFullContent(), defaultUserInfo)

    // Header
    expect(md).toContain('# Jane Doe')
    expect(md).toContain(
      'jane@example.com | 555-0100 | New York, NY | linkedin.com/in/janedoe | github.com/janedoe'
    )

    // Sections
    expect(md).toContain('## PROFESSIONAL SUMMARY')
    expect(md).toContain('Experienced software engineer')
    expect(md).toContain('## EDUCATION')
    expect(md).toContain('**B.S. Computer Science**')
    expect(md).toContain('*MIT | May 2020 | GPA: 3.8*')
    expect(md).toContain('## EXPERIENCE')
    expect(md).toContain('**Software Engineer**')
    expect(md).toContain('- Built REST APIs serving 10K+ requests/day')
    expect(md).toContain('## PROJECTS')
    expect(md).toContain('**Open Source CLI Tool**')
    expect(md).toContain('- Technologies: Go, Docker')
    expect(md).toContain('## SKILLS')
    expect(md).toContain('**Technical:** TypeScript, React, Node.js')
    expect(md).toContain('**Other:** Leadership, Agile')
  })

  it('omits empty sections without errors', () => {
    const content: GeneratedResumeContent = {
      summary: '',
      experience: [],
      education: [],
      skills: { technical: [], other: [] },
      projects: [],
    }
    const md = generateResumeMarkdown(content, defaultUserInfo)

    expect(md).toContain('# Jane Doe')
    expect(md).not.toContain('## PROFESSIONAL SUMMARY')
    expect(md).not.toContain('## EDUCATION')
    expect(md).not.toContain('## EXPERIENCE')
    expect(md).not.toContain('## PROJECTS')
    expect(md).not.toContain('## SKILLS')
  })

  it('handles missing optional fields without undefined in output', () => {
    const content = createFullContent()
    // Remove optional fields
    content.experience[1].location = undefined
    content.education[0].gpa = undefined
    content.projects[0].technologies = []

    const userInfo = { name: 'John', email: 'john@test.com' }
    const md = generateResumeMarkdown(content, userInfo)

    expect(md).not.toContain('undefined')
    // No GPA line
    expect(md).toContain('*MIT | May 2020*')
    // No technologies line for the project
    expect(md).not.toContain('Technologies:')
    // Contact line should only have email
    expect(md).toContain('john@test.com')
  })

  it('handles special characters correctly', () => {
    const content: GeneratedResumeContent = {
      summary: 'Built systems for R&D with "cutting-edge" tech & 100% uptime.',
      experience: [],
      education: [],
      skills: { technical: ['C++', 'C#'], other: [] },
      projects: [],
    }
    const md = generateResumeMarkdown(content, defaultUserInfo)

    expect(md).toContain('R&D')
    expect(md).toContain('"cutting-edge"')
    expect(md).toContain('100%')
    expect(md).toContain('C++')
    expect(md).toContain('C#')
  })

  it('follows default section order: Summary -> Education -> Skills -> Experience -> Projects', () => {
    const md = generateResumeMarkdown(createFullContent(), defaultUserInfo)

    const summaryIdx = md.indexOf('## PROFESSIONAL SUMMARY')
    const educationIdx = md.indexOf('## EDUCATION')
    const skillsIdx = md.indexOf('## SKILLS')
    const experienceIdx = md.indexOf('## EXPERIENCE')
    const projectsIdx = md.indexOf('## PROJECTS')

    expect(summaryIdx).toBeLessThan(educationIdx)
    expect(educationIdx).toBeLessThan(skillsIdx)
    expect(skillsIdx).toBeLessThan(experienceIdx)
    expect(experienceIdx).toBeLessThan(projectsIdx)
  })

  // ─── V3: Dynamic Section Ordering ────────────────────

  it('supports dynamic section ordering', () => {
    const md = generateResumeMarkdown(createFullContent(), defaultUserInfo, {
      sectionOrder: ['experience', 'projects', 'education', 'skills'],
    })

    const experienceIdx = md.indexOf('## EXPERIENCE')
    const projectsIdx = md.indexOf('## PROJECTS')
    const educationIdx = md.indexOf('## EDUCATION')
    const skillsIdx = md.indexOf('## SKILLS')

    expect(experienceIdx).toBeLessThan(projectsIdx)
    expect(projectsIdx).toBeLessThan(educationIdx)
    expect(educationIdx).toBeLessThan(skillsIdx)
  })

  it('renders projects before experience when section order says so', () => {
    const md = generateResumeMarkdown(createFullContent(), defaultUserInfo, {
      sectionOrder: ['projects', 'experience', 'education', 'skills'],
    })

    const projectsIdx = md.indexOf('## PROJECTS')
    const experienceIdx = md.indexOf('## EXPERIENCE')

    expect(projectsIdx).toBeLessThan(experienceIdx)
  })

  // ─── V3: Professional Lead ───────────────────────────

  it('renders professional lead without heading when lead field exists', () => {
    const content = createFullContent() as any
    content.lead = 'Software Engineer building scalable web apps.'
    content.summary = '' // V3 sets summary to empty

    const md = generateResumeMarkdown(content, defaultUserInfo)

    expect(md).toContain('Software Engineer building scalable web apps.')
    expect(md).not.toContain('## PROFESSIONAL SUMMARY')
  })

  it('falls back to summary with heading when no lead field', () => {
    const content = createFullContent()
    const md = generateResumeMarkdown(content, defaultUserInfo)

    expect(md).toContain('## PROFESSIONAL SUMMARY')
    expect(md).toContain('Experienced software engineer')
  })

  // ─── V3: Professional Title ──────────────────────────

  it('renders professional title as subtitle after name', () => {
    const md = generateResumeMarkdown(createFullContent(), defaultUserInfo, {
      professionalTitle: 'Full-Stack Engineer',
    })

    expect(md).toContain('# Jane Doe')
    expect(md).toContain('*Full-Stack Engineer*')
    // Title should come between name and contact
    const nameIdx = md.indexOf('# Jane Doe')
    const titleIdx = md.indexOf('*Full-Stack Engineer*')
    const contactIdx = md.indexOf('jane@example.com')
    expect(titleIdx).toBeGreaterThan(nameIdx)
    expect(titleIdx).toBeLessThan(contactIdx)
  })

  it('does not render title line when no professionalTitle', () => {
    const md = generateResumeMarkdown(createFullContent(), defaultUserInfo)

    // Should go straight from name to contact
    const lines = md.split('\n')
    expect(lines[0]).toBe('# Jane Doe')
    expect(lines[1]).toContain('jane@example.com')
  })

  // ─── V3: Project Bullets ─────────────────────────────

  // ─── V3.1: 4-Category Skills ─────────────────────────

  it('renders V2 (4-category) skills correctly', () => {
    const content = createFullContent()
    content.skills = {
      languages: ['Python', 'TypeScript'],
      frameworks: ['React', 'Express'],
      tools: ['Docker', 'AWS'],
      other: ['Agile'],
    } as any

    const md = generateResumeMarkdown(content, defaultUserInfo)

    expect(md).toContain('## SKILLS')
    expect(md).toContain('**Languages:** Python, TypeScript')
    expect(md).toContain('**Frameworks & Libraries:** React, Express')
    expect(md).toContain('**Tools & Cloud:** Docker, AWS')
    expect(md).toContain('**Other:** Agile')
    expect(md).not.toContain('**Technical:**')
  })

  it('renders V1 (2-category) skills correctly for backward compat', () => {
    const content = createFullContent()
    // Already V1 format from createFullContent()
    const md = generateResumeMarkdown(content, defaultUserInfo)

    expect(md).toContain('**Technical:** TypeScript, React, Node.js')
    expect(md).toContain('**Other:** Leadership, Agile')
    expect(md).not.toContain('**Languages:**')
  })

  it('omits empty V2 skills categories', () => {
    const content = createFullContent()
    content.skills = {
      languages: ['Python'],
      frameworks: [],
      tools: ['Docker'],
      other: [],
    } as any

    const md = generateResumeMarkdown(content, defaultUserInfo)

    expect(md).toContain('**Languages:** Python')
    expect(md).toContain('**Tools & Cloud:** Docker')
    expect(md).not.toContain('**Frameworks & Libraries:**')
    expect(md).not.toContain('**Other:**')
  })

  it('renders project bullets when present', () => {
    const content = createFullContent() as any
    content.projects[0].bullets = ['Implemented real-time notifications', 'Achieved 99.9% uptime']

    const md = generateResumeMarkdown(content, defaultUserInfo)

    expect(md).toContain('- Implemented real-time notifications')
    expect(md).toContain('- Achieved 99.9% uptime')
  })
})

describe('generateCoverLetterMarkdown', () => {
  it('produces formatted cover letter with header, date, body, signature', () => {
    const md = generateCoverLetterMarkdown(
      'I am writing to express my interest in the position.',
      { name: 'Jane Doe', email: 'jane@example.com', phone: '555-0100' },
      { title: 'Software Engineer', company: 'Acme Corp' }
    )

    expect(md).toContain('# Jane Doe')
    expect(md).toContain('jane@example.com | 555-0100')
    expect(md).toContain('Hiring Manager')
    expect(md).toContain('Acme Corp')
    expect(md).toContain('I am writing to express my interest in the position.')
    expect(md).toContain('Sincerely,')
    expect(md).toContain('Jane Doe')
  })

  it('handles missing optional fields', () => {
    const md = generateCoverLetterMarkdown(
      'Body text.',
      { name: 'John', email: 'john@test.com' },
      { title: 'Dev', company: 'Co' }
    )

    expect(md).not.toContain('undefined')
    expect(md).toContain('john@test.com')
    // Should not have a pipe separator after email when no phone
    expect(md).not.toContain('john@test.com |')
  })
})
