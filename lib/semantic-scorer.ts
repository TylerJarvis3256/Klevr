import { openai, MODELS, callOpenAI, parseOpenAIJson } from './openai'
import { loadPrompt } from './prompts'
import { deepSanitizeEmDashes } from './utils'
import { ParsedResume } from './resume-parser'
import { ParsedJobDescription } from './job-parser'

// ─── Types ────────────────────────────────────────────────

export interface SemanticSkillMatch {
  skill: string
  match_type: 'exact' | 'inferred'
  evidence: string
}

export interface SemanticSkillGap {
  skill: string
  severity: 'required' | 'preferred'
  suggestion: string
}

export interface SemanticFitAnalysis {
  semantic_skill_score: number
  persona_fit_score: number
  matched_skills: SemanticSkillMatch[]
  missing_skills: SemanticSkillGap[]
  skill_reasoning: string
  ideal_persona: string
  persona_reasoning: string
  persona_alignment: string
}

export interface SemanticScorerInput {
  candidate_skills: string[]
  candidate_education: Array<{
    degree: string
    major: string | null
    school: string
  }>
  candidate_experience: Array<{
    title: string
    company: string
    bullets: string[]
  }>
  candidate_projects: Array<{
    name: string
    technologies: string[]
    description: string | null
  }>
  job_title: string
  job_company: string
  job_description: string
  parsed_job: {
    required_skills: string[]
    preferred_skills: string[]
    level?: string
    domain?: string
  }
}

// ─── Input Builder ────────────────────────────────────────

/**
 * Build semantic scorer input from profile and job data.
 * Uses profile skills if available, falls back to resume skills.
 */
export function buildSemanticScorerInput(
  parsedResume: ParsedResume | null,
  profile: {
    skills: string[]
    Education?: Array<{ degree: string; major: string | null; school: string }>
    JobExperience?: Array<{
      title: string
      company: string
      Bullets?: Array<{ text: string }>
    }>
    Project?: Array<{
      name: string
      technologies: string[]
      description: string | null
    }>
  },
  job: {
    title: string
    company: string
    job_description_raw: string
  },
  parsedJob: ParsedJobDescription
): SemanticScorerInput {
  // Use profile skills if available, otherwise extract from resume
  const candidateSkills =
    profile.skills.length > 0
      ? profile.skills
      : parsedResume
        ? [
            ...(parsedResume.skills.languages || []),
            ...(parsedResume.skills.frameworks || []),
            ...(parsedResume.skills.tools || []),
            ...(parsedResume.skills.other || []),
          ]
        : []

  // Build education from structured data if available, else from resume
  const candidateEducation =
    profile.Education && profile.Education.length > 0
      ? profile.Education.map(e => ({
          degree: e.degree,
          major: e.major,
          school: e.school,
        }))
      : parsedResume?.education?.map(e => ({
          degree: e.degree || 'Unknown',
          major: e.major || null,
          school: e.school,
        })) || []

  // Build experience from structured data if available, else from resume
  const candidateExperience =
    profile.JobExperience && profile.JobExperience.length > 0
      ? profile.JobExperience.map(e => ({
          title: e.title,
          company: e.company,
          bullets: e.Bullets?.map(b => b.text) || [],
        }))
      : parsedResume?.experience?.map(e => ({
          title: e.title,
          company: e.company,
          bullets: e.bullets || [],
        })) || []

  // Build projects from structured data if available, else from resume
  const candidateProjects =
    profile.Project && profile.Project.length > 0
      ? profile.Project.map(p => ({
          name: p.name,
          technologies: p.technologies,
          description: p.description,
        }))
      : parsedResume?.projects?.map(p => ({
          name: p.name,
          technologies: p.technologies || [],
          description: p.description || null,
        })) || []

  return {
    candidate_skills: candidateSkills,
    candidate_education: candidateEducation,
    candidate_experience: candidateExperience,
    candidate_projects: candidateProjects,
    job_title: job.title,
    job_company: job.company,
    job_description: job.job_description_raw,
    parsed_job: {
      required_skills: parsedJob.required_skills,
      preferred_skills: parsedJob.preferred_skills,
      level: parsedJob.level,
      domain: parsedJob.domain,
    },
  }
}

// ─── LLM Call ─────────────────────────────────────────────

/**
 * Analyze semantic fit using gpt-4o-mini.
 * Returns skill matching with chain-of-thought reasoning and persona analysis.
 */
export async function analyzeSemanticFit(
  userId: string,
  input: SemanticScorerInput
): Promise<SemanticFitAnalysis> {
  const { content: prompt } = await loadPrompt('scoring', 'semantic-fit-v1')

  const completion = await callOpenAI(userId, () =>
    openai.chat.completions.create({
      model: MODELS.GPT4O_MINI,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(input) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2000,
    })
  )

  const content = completion.choices[0].message.content
  let analysis = parseOpenAIJson<SemanticFitAnalysis>(content)

  // Clamp scores to valid range
  analysis.semantic_skill_score = clampScore(analysis.semantic_skill_score)
  analysis.persona_fit_score = clampScore(analysis.persona_fit_score)

  // Sanitize em dashes from LLM output
  analysis = deepSanitizeEmDashes(analysis)

  // Deterministic validation against ground truth profile skills
  analysis = validateSemanticFitResults(analysis, input.candidate_skills)

  return analysis
}

// ─── Helpers ──────────────────────────────────────────────

function clampScore(score: number): number {
  if (typeof score !== 'number' || isNaN(score)) return 0.5
  return Math.max(0.0, Math.min(1.0, score))
}

// ─── Deterministic Validation ────────────────────────────

/**
 * Split compound skills on "/" and "&" delimiters.
 * "Git/GitHub" -> { "git": "Git/GitHub", "github": "Git/GitHub" }
 */
export function buildSegmentMap(skills: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const skill of skills) {
    const segments = skill.split(/\s*[/&]\s*/)
    if (segments.length > 1) {
      for (const seg of segments) {
        const trimmed = seg.trim()
        if (trimmed.length > 0) {
          map.set(trimmed.toLowerCase(), skill)
        }
      }
    }
  }
  return map
}

/**
 * Check if a JD skill exists in the candidate's profile using:
 * 1. Exact match (case-insensitive)
 * 2. Profile skill contains job skill as substring (only if profile skill is longer)
 * 3. Compound segment match ("Git/GitHub" -> "GitHub")
 */
export function skillExistsInProfile(
  jobSkill: string,
  normalizedProfileSkills: Set<string>,
  rawProfileSkills: string[],
  profileSkillSegments: Map<string, string>
): boolean {
  const jobLower = jobSkill.toLowerCase()

  // 1. Exact match
  if (normalizedProfileSkills.has(jobLower)) return true

  // 2. Profile skill contains job skill as substring (profile must be longer)
  for (const raw of rawProfileSkills) {
    if (raw.length > jobSkill.length && raw.toLowerCase().includes(jobLower)) {
      return true
    }
  }

  // 3. Compound segment match
  if (profileSkillSegments.has(jobLower)) return true

  return false
}

/**
 * Validate LLM semantic fit results against ground truth profile skills.
 * - Downgrades false "exact" matches (skill not in profile) to "inferred"
 * - Rescues false negatives (missing skills that exist in profile) to matched
 */
export function validateSemanticFitResults(
  analysis: SemanticFitAnalysis,
  candidateSkills: string[]
): SemanticFitAnalysis {
  if (!candidateSkills.length) return analysis

  const normalizedProfileSkills = new Set(candidateSkills.map(s => s.toLowerCase()))
  const profileSkillSegments = buildSegmentMap(candidateSkills)

  // Track matched skill names (lowercase) to avoid duplicates when rescuing
  const matchedSkillNames = new Set(analysis.matched_skills.map(m => m.skill.toLowerCase()))

  // 1. Validate matched_skills: downgrade false "exact" matches to "inferred"
  const validatedMatched = analysis.matched_skills.map(match => {
    if (match.match_type !== 'exact') return match

    const exists = skillExistsInProfile(
      match.skill,
      normalizedProfileSkills,
      candidateSkills,
      profileSkillSegments
    )

    if (!exists) {
      return { ...match, match_type: 'inferred' as const }
    }
    return match
  })

  // 2. Check missing_skills against profile - rescue false negatives
  const stillMissing: SemanticSkillGap[] = []
  const rescued: SemanticSkillMatch[] = []

  for (const gap of analysis.missing_skills) {
    const exists = skillExistsInProfile(
      gap.skill,
      normalizedProfileSkills,
      candidateSkills,
      profileSkillSegments
    )

    if (exists && !matchedSkillNames.has(gap.skill.toLowerCase())) {
      rescued.push({
        skill: gap.skill,
        match_type: 'exact',
        evidence: 'Found in candidate skills (deterministic match)',
      })
      matchedSkillNames.add(gap.skill.toLowerCase())
    } else if (!exists) {
      stillMissing.push(gap)
    }
    // If exists but already in matched, just drop from missing (dedup)
  }

  return {
    ...analysis,
    matched_skills: [...validatedMatched, ...rescued],
    missing_skills: stillMissing,
  }
}
