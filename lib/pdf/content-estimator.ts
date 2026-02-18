import type { GeneratedResumeContent } from '@/lib/resume-generator'
import { isSkillsV2 } from '@/lib/resume-generator'

/**
 * Content length estimation for PDF rendering
 * Helps determine if content will fit on one page and what adjustments are needed
 */

export interface ContentEstimate {
  estimated_lines: number
  max_lines_per_page: number
  will_fit: boolean
  overflow_lines: number
  sections: {
    header: number
    summary: number
    education: number
    experience: number
    projects: number
    skills: number
  }
  recommendations: string[]
}

/**
 * Estimate how many lines a resume will take when rendered
 * Based on classic-ats template with default styling
 */
export function estimateResumeLines(content: GeneratedResumeContent): ContentEstimate {
  const sections = {
    header: estimateHeaderLines(),
    summary: estimateSummaryLines(content.summary || ''),
    education: estimateEducationLines(content.education || []),
    experience: estimateExperienceLines(content.experience || []),
    projects: estimateProjectLines(content.projects || []),
    skills: estimateSkillsLines(content.skills),
  }

  const estimated_lines =
    sections.header +
    sections.summary +
    sections.education +
    sections.experience +
    sections.projects +
    sections.skills

  // A4 page with 40pt padding, 11pt font, 1.4 line height
  // ~55-60 lines max (accounting for margins and spacing)
  const max_lines_per_page = 58

  const will_fit = estimated_lines <= max_lines_per_page
  const overflow_lines = Math.max(0, estimated_lines - max_lines_per_page)

  const recommendations = generateRecommendations(sections, overflow_lines)

  return {
    estimated_lines,
    max_lines_per_page,
    will_fit,
    overflow_lines,
    sections,
    recommendations,
  }
}

function estimateHeaderLines(): number {
  // Name (1 line) + Contact (1 line) + spacing (1 line) = 3 lines
  return 3
}

function estimateSummaryLines(summary: string): number {
  if (!summary) return 0

  // Section title (1 line) + content (~2-3 lines for typical summary)
  const chars = summary.length
  const charsPerLine = 90 // Approximate characters per line at 11pt
  const contentLines = Math.ceil(chars / charsPerLine)
  const spacing = 1

  return 1 + contentLines + spacing
}

function estimateEducationLines(education: GeneratedResumeContent['education']): number {
  if (!education || education.length === 0) return 0

  // Section title (1 line)
  let lines = 1

  // Each entry: degree (1) + school/date (1) + spacing (1) = 3 lines
  lines += education.length * 3

  // Section bottom spacing
  lines += 1

  return lines
}

function estimateExperienceLines(experience: GeneratedResumeContent['experience']): number {
  if (!experience || experience.length === 0) return 0

  // Section title (1 line)
  let lines = 1

  experience.forEach(exp => {
    // Job title (1)
    lines += 1
    // Company/location (1)
    lines += 1
    // Dates (1)
    lines += 1
    // Bullets (1 line each, with potential wrapping)
    exp.bullets.forEach(bullet => {
      const chars = bullet.length
      const charsPerLine = 75 // Bullets have indentation, so shorter lines
      const bulletLines = Math.ceil(chars / charsPerLine)
      lines += bulletLines
    })
    // Item spacing (1)
    lines += 1
  })

  // Section bottom spacing
  lines += 1

  return lines
}

function estimateProjectLines(projects: GeneratedResumeContent['projects']): number {
  if (!projects || projects.length === 0) return 0

  // Section title (1 line)
  let lines = 1

  projects.forEach(project => {
    // Project name (1)
    lines += 1
    // Description (can wrap to 2-3 lines)
    const descChars = project.description?.length || 0
    const descLines = Math.ceil(descChars / 75) || 1
    lines += descLines
    // Technologies (1 line, usually fits)
    if (project.technologies && project.technologies.length > 0) {
      lines += 1
    }
    // Item spacing (1)
    lines += 1
  })

  // Section bottom spacing
  lines += 1

  return lines
}

function estimateSkillsLines(skills: GeneratedResumeContent['skills']): number {
  if (!skills) return 0

  // Count total skills across all categories
  let totalSkills: number
  if (isSkillsV2(skills)) {
    // V2 (4-category)
    totalSkills =
      skills.languages.length + skills.frameworks.length + skills.tools.length + skills.other.length
  } else {
    // V1 (2-category)
    totalSkills = skills.technical.length + skills.other.length
  }
  if (totalSkills === 0) return 0

  // Section title (1 line)
  let lines = 1

  // Skills wrap in a grid layout
  const skillsPerLine = 6 // Approximate skills that fit per line
  const skillLines = Math.ceil(totalSkills / skillsPerLine)

  lines += skillLines

  // Section bottom spacing
  lines += 1

  return lines
}

function generateRecommendations(
  sections: ContentEstimate['sections'],
  overflowLines: number
): string[] {
  if (overflowLines === 0) {
    return ['Content fits comfortably on one page']
  }

  const recommendations: string[] = []

  // Analyze which sections are taking most space
  const sectionSizes = Object.entries(sections)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines - a.lines)

  recommendations.push(`Resume is ${overflowLines} lines too long for one page`)

  // Recommend specific reductions based on largest sections
  if (sections.experience > 20) {
    recommendations.push(
      'Reduce experience bullets (currently using ~${sections.experience} lines)'
    )
    recommendations.push('Suggestion: Limit to 3-4 bullets per experience')
  }

  if (sections.projects > 10 && sectionSizes[0].name === 'projects') {
    recommendations.push('Projects section is large - consider showing fewer projects')
  }

  if (sections.summary > 5) {
    recommendations.push('Summary could be more concise (currently ~${sections.summary} lines)')
  }

  // Last resort recommendations
  if (overflowLines > 10) {
    recommendations.push('Consider using compact template with tighter spacing')
  }

  return recommendations
}

/**
 * Calculate compression factor needed to fit on one page
 * Returns a multiplier to apply to bullet counts, spacing, etc.
 */
export function calculateCompressionFactor(estimate: ContentEstimate): number {
  if (estimate.will_fit) return 1.0

  const targetLines = estimate.max_lines_per_page
  const actualLines = estimate.estimated_lines

  // We want to reduce by the ratio of overflow
  // e.g., 70 lines / 58 max = 1.21x too much → compress by ~0.83
  return targetLines / actualLines
}

/**
 * Suggest compressed content parameters based on estimate
 */
export interface CompressionSuggestion {
  max_bullets_per_experience: number
  max_projects: number
  use_compact_template: boolean
  condense_summary: boolean
}

export function suggestCompression(estimate: ContentEstimate): CompressionSuggestion {
  const compressionFactor = calculateCompressionFactor(estimate)

  // If fits comfortably, no compression
  if (compressionFactor >= 0.95) {
    return {
      max_bullets_per_experience: 5,
      max_projects: 3,
      use_compact_template: false,
      condense_summary: false,
    }
  }

  // Moderate compression needed (5-10% over)
  if (compressionFactor >= 0.85) {
    return {
      max_bullets_per_experience: 4,
      max_projects: 2,
      use_compact_template: false,
      condense_summary: false,
    }
  }

  // Significant compression needed (10-20% over)
  if (compressionFactor >= 0.75) {
    return {
      max_bullets_per_experience: 3,
      max_projects: 2,
      use_compact_template: true,
      condense_summary: true,
    }
  }

  // Heavy compression needed (20%+ over)
  return {
    max_bullets_per_experience: 3,
    max_projects: 1,
    use_compact_template: true,
    condense_summary: true,
  }
}
