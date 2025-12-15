import { FitBucket } from '@prisma/client'
import { ParsedResume } from './resume-parser'
import { ParsedJobDescription } from './job-parser'
import { matchSkills, SkillsMatchResult } from './skills-matcher'

export interface FitScore {
  fit_score: number // 0.0 - 1.0
  fit_bucket: FitBucket
  skills_match: SkillsMatchResult
  experience_score: number
  preference_score: number
  components: {
    skills: number
    experience: number
    preferences: number
  }
}

/**
 * Calculate comprehensive fit score
 */
export function calculateFitScore(
  resume: ParsedResume,
  job: ParsedJobDescription,
  preferences: {
    job_types: string[]
    preferred_locations: string[]
  },
  jobLocation?: string
): FitScore {
  // 1. Skills Match (0.0 - 0.5)
  const allUserSkills = [
    ...(resume.skills.languages || []),
    ...(resume.skills.frameworks || []),
    ...(resume.skills.tools || []),
  ]

  const skillsMatch = matchSkills(
    allUserSkills,
    job.required_skills || [],
    job.preferred_skills || []
  )

  const skillsScore = skillsMatch.match_score * 0.5

  // 2. Experience/Education (0.0 - 0.3)
  let experienceScore = 0.15 // Base score for having any experience

  // Education match
  if (resume.education && resume.education.length > 0) {
    const hasRelevantEducation = resume.education.some(edu =>
      job.education_required
        ? job.education_required.toLowerCase().includes(edu.major?.toLowerCase() || '')
        : true
    )
    if (hasRelevantEducation) experienceScore += 0.05
  }

  // Experience match
  if (resume.experience && resume.experience.length > 0) {
    const hasRelevantExperience = resume.experience.some(exp =>
      job.domain ? exp.title.toLowerCase().includes(job.domain.toLowerCase()) : true
    )
    if (hasRelevantExperience) experienceScore += 0.05
  }

  // Projects
  if (resume.projects && resume.projects.length > 0) {
    experienceScore += 0.05
  }

  experienceScore = Math.min(experienceScore, 0.3)

  // 3. Preference Alignment (0.0 - 0.2)
  let preferenceScore = 0

  // Job type match
  if (job.job_type && preferences.job_types.includes(job.job_type)) {
    preferenceScore += 0.1
  }

  // Location match
  if (jobLocation) {
    const locationMatch = preferences.preferred_locations.some(
      loc =>
        jobLocation.toLowerCase().includes(loc.toLowerCase()) ||
        loc.toLowerCase() === 'remote'
    )
    if (locationMatch) preferenceScore += 0.1
  }

  // Calculate total score
  const fit_score = skillsScore + experienceScore + preferenceScore

  // Map to fit bucket
  const fit_bucket = mapScoreToBucket(fit_score)

  return {
    fit_score,
    fit_bucket,
    skills_match: skillsMatch,
    experience_score: experienceScore,
    preference_score: preferenceScore,
    components: {
      skills: skillsScore,
      experience: experienceScore,
      preferences: preferenceScore,
    },
  }
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
