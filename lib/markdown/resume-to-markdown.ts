import type { GeneratedResumeContent } from '@/lib/resume-generator'
import { isSkillsV2 } from '@/lib/resume-generator'

interface V3Project {
  name: string
  description: string
  technologies: string[]
  bullets?: string[]
}

export interface MarkdownUserInfo {
  name: string
  email: string
  phone?: string
  location?: string
  linkedin?: string
  github?: string
}

export interface MarkdownOptions {
  /** Dynamic section ordering. Default: ['education', 'skills', 'experience', 'projects'] */
  sectionOrder?: string[]
  /** Professional title rendered as subtitle after name */
  professionalTitle?: string
}

// ─── Section Renderers ────────────────────────────────

function renderSummary(content: GeneratedResumeContent & { lead?: string }, lines: string[]): void {
  // Professional lead (V3): plain text, no heading
  if (content.lead) {
    lines.push(content.lead)
    lines.push('')
    return
  }

  // Legacy summary (V1/V2): with heading
  if (content.summary) {
    lines.push('## PROFESSIONAL SUMMARY')
    lines.push('')
    lines.push(content.summary)
    lines.push('')
  }
}

function renderEducation(content: GeneratedResumeContent, lines: string[]): void {
  if (!content.education || content.education.length === 0) return

  lines.push('## EDUCATION')
  lines.push('')
  for (const edu of content.education) {
    lines.push(`**${edu.degree}**`)
    const schoolParts = [edu.school, edu.graduation]
    if (edu.gpa) schoolParts.push(`GPA: ${edu.gpa}`)
    lines.push(`*${schoolParts.join(' | ')}*`)
    lines.push('')
  }
}

function renderExperience(content: GeneratedResumeContent, lines: string[]): void {
  if (!content.experience || content.experience.length === 0) return

  lines.push('## EXPERIENCE')
  lines.push('')
  for (const exp of content.experience) {
    lines.push(`**${exp.title}**`)
    const companyParts = [exp.company]
    if (exp.location) companyParts.push(exp.location)
    lines.push(`*${companyParts.join(' | ')}* | ${exp.dates}`)
    lines.push('')
    for (const bullet of exp.bullets) {
      lines.push(`- ${bullet}`)
    }
    lines.push('')
  }
}

function renderProjects(content: GeneratedResumeContent, lines: string[]): void {
  if (!content.projects || content.projects.length === 0) return

  lines.push('## PROJECTS')
  lines.push('')
  for (const project of content.projects) {
    lines.push(`**${project.name}**`)
    lines.push(`- ${project.description}`)
    if (project.technologies && project.technologies.length > 0) {
      lines.push(`- Technologies: ${project.technologies.join(', ')}`)
    }
    // V3 projects may have bullets
    const projWithBullets = project as V3Project
    if (projWithBullets.bullets && Array.isArray(projWithBullets.bullets)) {
      for (const bullet of projWithBullets.bullets) {
        lines.push(`- ${bullet}`)
      }
    }
    lines.push('')
  }
}

function renderSkills(content: GeneratedResumeContent, lines: string[]): void {
  if (!content.skills) return

  if (isSkillsV2(content.skills)) {
    // V2 (4-category) format
    const { languages, frameworks, tools, other } = content.skills
    const hasAny =
      languages.length > 0 || frameworks.length > 0 || tools.length > 0 || other.length > 0
    if (!hasAny) return

    lines.push('## SKILLS')
    lines.push('')
    if (languages.length > 0) lines.push(`**Languages:** ${languages.join(', ')}`)
    if (frameworks.length > 0) lines.push(`**Frameworks & Libraries:** ${frameworks.join(', ')}`)
    if (tools.length > 0) lines.push(`**Tools & Cloud:** ${tools.join(', ')}`)
    if (other.length > 0) lines.push(`**Other:** ${other.join(', ')}`)
    lines.push('')
  } else {
    // V1 (2-category) format
    const { technical, other } = content.skills
    if (technical.length === 0 && other.length === 0) return

    lines.push('## SKILLS')
    lines.push('')
    if (technical.length > 0) lines.push(`**Technical:** ${technical.join(', ')}`)
    if (other.length > 0) lines.push(`**Other:** ${other.join(', ')}`)
    lines.push('')
  }
}

const SECTION_RENDERERS: Record<
  string,
  (content: GeneratedResumeContent, lines: string[]) => void
> = {
  education: renderEducation,
  experience: renderExperience,
  projects: renderProjects,
  skills: renderSkills,
}

const DEFAULT_SECTION_ORDER = ['education', 'skills', 'experience', 'projects']

// ─── Main Function ────────────────────────────────────

/**
 * Converts GeneratedResumeContent JSON into a formatted Markdown string.
 *
 * Default section ordering: Header -> Summary -> Education -> Skills -> Experience -> Projects
 * V3 supports dynamic ordering via `options.sectionOrder`.
 */
export function generateResumeMarkdown(
  content: GeneratedResumeContent,
  userInfo: MarkdownUserInfo,
  options?: MarkdownOptions
): string {
  const lines: string[] = []

  // Header: Name + optional professional title + contact line
  lines.push(`# ${userInfo.name}`)

  if (options?.professionalTitle) {
    lines.push(`*${options.professionalTitle}*`)
  }

  const contactParts: string[] = [userInfo.email]
  if (userInfo.phone) contactParts.push(userInfo.phone)
  if (userInfo.location) contactParts.push(userInfo.location)
  if (userInfo.linkedin) contactParts.push(userInfo.linkedin)
  if (userInfo.github) contactParts.push(userInfo.github)
  lines.push(contactParts.join(' | '))
  lines.push('')

  // Summary / Lead (always rendered after header, before sections)
  renderSummary(content as GeneratedResumeContent & { lead?: string }, lines)

  // Render sections in specified order
  const sectionOrder = options?.sectionOrder || DEFAULT_SECTION_ORDER
  for (const section of sectionOrder) {
    const renderer = SECTION_RENDERERS[section]
    if (renderer) {
      renderer(content, lines)
    }
  }

  return lines.join('\n').trimEnd() + '\n'
}

/**
 * Generates a formatted Markdown string for a cover letter.
 */
export function generateCoverLetterMarkdown(
  content: string,
  userInfo: { name: string; email: string; phone?: string },
  jobInfo: { title: string; company: string }
): string {
  const lines: string[] = []

  // Header
  lines.push(`# ${userInfo.name}`)
  const contactParts = [userInfo.email]
  if (userInfo.phone) contactParts.push(userInfo.phone)
  lines.push(contactParts.join(' | '))
  lines.push('')

  // Date
  lines.push(new Date().toLocaleDateString())
  lines.push('')

  // Recipient
  lines.push('Hiring Manager')
  lines.push(jobInfo.company)
  lines.push('')

  // Body
  lines.push(content)
  lines.push('')

  // Signature
  lines.push('Sincerely,')
  lines.push(userInfo.name)
  lines.push('')

  return lines.join('\n').trimEnd() + '\n'
}
