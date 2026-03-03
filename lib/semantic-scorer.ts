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

  return analysis
}

// ─── Helpers ──────────────────────────────────────────────

function clampScore(score: number): number {
  if (typeof score !== 'number' || isNaN(score)) return 0.5
  return Math.max(0.0, Math.min(1.0, score))
}
