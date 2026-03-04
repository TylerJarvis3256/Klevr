import { FitBucket } from '@prisma/client'
import { ParsedJobDescription } from './job-parser'
import { SemanticFitAnalysis } from './semantic-scorer'

export interface FitScore {
  fit_score: number // 0.0 - 1.0
  fit_bucket: FitBucket
  experience_score: number
  preference_score: number
  components: {
    semantic_skills: number
    experience: number
    persona: number
    preferences: number
  }
}

// Component weights (must sum to 1.0)
const WEIGHTS = {
  SEMANTIC_SKILLS: 0.4,
  EXPERIENCE: 0.25,
  PERSONA: 0.2,
  PREFERENCES: 0.15,
} as const

interface ExperienceInput {
  education: Array<{
    degree: string
    major: string | null
  }>
  experience: Array<{
    title: string
  }>
  projects: Array<{
    name: string
  }>
}

/**
 * Calculate composite fit score using LLM semantic analysis + algorithmic components
 */
export function calculateFitScore(
  experienceInput: ExperienceInput,
  parsedJob: ParsedJobDescription,
  semanticAnalysis: SemanticFitAnalysis,
  preferences: {
    job_types: string[]
    preferred_locations: string[]
  },
  jobLocation?: string
): FitScore {
  // 1. Semantic Skills (from LLM) - 40%
  const semanticSkillsScore = semanticAnalysis.semantic_skill_score * WEIGHTS.SEMANTIC_SKILLS

  // 2. Experience/Education (algorithmic) - 25%
  const rawExperienceScore = calculateExperienceScore(experienceInput, parsedJob)
  const experienceScore = rawExperienceScore * WEIGHTS.EXPERIENCE

  // 3. Persona Fit (from LLM) - 20%
  const personaScore = semanticAnalysis.persona_fit_score * WEIGHTS.PERSONA

  // 4. Preferences (algorithmic) - 15%
  const rawPreferenceScore = calculatePreferenceScore(preferences, parsedJob, jobLocation)
  const preferenceScore = rawPreferenceScore * WEIGHTS.PREFERENCES

  // Calculate total score
  const fit_score = semanticSkillsScore + experienceScore + personaScore + preferenceScore

  // Map to fit bucket
  const fit_bucket = mapScoreToBucket(fit_score)

  return {
    fit_score,
    fit_bucket,
    experience_score: rawExperienceScore,
    preference_score: rawPreferenceScore,
    components: {
      semantic_skills: semanticSkillsScore,
      experience: experienceScore,
      persona: personaScore,
      preferences: preferenceScore,
    },
  }
}

/**
 * Calculate experience/education sub-score (0.0 - 1.0)
 *
 * Education: has any (0.15) + relevant major (0.15) + degree level (0.10) = max 0.40
 * Experience: has any (0.10) + count bonus (up to 0.15) + relevant title (0.10) = max 0.35
 * Projects: has any (0.10) + count bonus (up to 0.15) = max 0.25
 */
export function calculateExperienceScore(
  input: ExperienceInput,
  parsedJob: ParsedJobDescription
): number {
  let score = 0

  // Education component (max 0.40)
  if (input.education.length > 0) {
    score += 0.15 // Has any education

    // Relevant major check
    const hasRelevantMajor = input.education.some(edu => {
      if (!edu.major || !parsedJob.education_required) return false
      const major = edu.major.toLowerCase()
      const required = parsedJob.education_required.toLowerCase()
      return (
        required.includes(major) ||
        major.includes('computer') ||
        major.includes('software') ||
        major.includes('information')
      )
    })
    if (hasRelevantMajor) score += 0.15

    // Degree level match
    const hasBachelorOrHigher = input.education.some(edu => {
      const degree = edu.degree.toLowerCase()
      return (
        degree.includes('bachelor') ||
        degree.includes('master') ||
        degree.includes('b.s') ||
        degree.includes('b.a') ||
        degree.includes('m.s') ||
        degree.includes('m.a')
      )
    })
    if (hasBachelorOrHigher) score += 0.1
  }

  // Experience component (max 0.35)
  if (input.experience.length > 0) {
    score += 0.1 // Has any experience

    // Count bonus (up to 0.15)
    const expCount = Math.min(input.experience.length, 3)
    score += (expCount / 3) * 0.15

    // Relevant title check
    const hasRelevantTitle = input.experience.some(exp => {
      const title = exp.title.toLowerCase()
      const domain = parsedJob.domain?.toLowerCase()
      return (
        (domain && title.includes(domain)) ||
        title.includes('engineer') ||
        title.includes('developer') ||
        title.includes('intern')
      )
    })
    if (hasRelevantTitle) score += 0.1
  }

  // Projects component (max 0.25)
  if (input.projects.length > 0) {
    score += 0.1 // Has any projects

    // Count bonus (up to 0.15)
    const projCount = Math.min(input.projects.length, 3)
    score += (projCount / 3) * 0.15
  }

  return Math.min(score, 1.0)
}

/**
 * Calculate preference alignment sub-score (0.0 - 1.0)
 *
 * Job type match: 0.5
 * Location match: 0.5
 * Defaults to 0.25 per component when data is unavailable
 */
export function calculatePreferenceScore(
  preferences: {
    job_types: string[]
    preferred_locations: string[]
  },
  parsedJob: ParsedJobDescription,
  jobLocation?: string
): number {
  let score = 0

  // Job type match (0.5)
  if (parsedJob.job_type && preferences.job_types.length > 0) {
    if (preferences.job_types.includes(parsedJob.job_type)) {
      score += 0.5
    }
  } else {
    score += 0.25 // Neutral when data unavailable
  }

  // Location match (0.5)
  if (jobLocation && preferences.preferred_locations.length > 0) {
    const locationMatch = preferences.preferred_locations.some(
      loc => jobLocation.toLowerCase().includes(loc.toLowerCase()) || loc.toLowerCase() === 'remote'
    )
    if (locationMatch) score += 0.5
  } else {
    score += 0.25 // Neutral when data unavailable
  }

  return score
}

/**
 * Map numeric score to fit bucket
 */
function mapScoreToBucket(score: number): FitBucket {
  if (score >= 0.8) return FitBucket.EXCELLENT
  if (score >= 0.6) return FitBucket.GOOD
  if (score >= 0.4) return FitBucket.FAIR
  return FitBucket.POOR
}
