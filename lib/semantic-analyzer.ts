import { anthropic, ANTHROPIC_MODELS, callAnthropic, parseAnthropicJson } from './anthropic'
import { loadPrompt } from './prompts'
import { deepSanitizeEmDashes } from './utils'
import type { Job } from '@prisma/client'
import type { StructuredProfileData } from './resume-generator'

// ─── Interfaces ───────────────────────────────────────

export interface MetricPriority {
  type: string
  importance: 'high' | 'medium' | 'low'
}

export interface SectionRelevanceScore {
  index: number
  score: number
  reason: string
}

export interface BulletGuidance {
  experience_index?: number
  project_index?: number
  bullet_index: number
  action: 'emphasize' | 'rewrite' | 'keep' | 'deprioritize'
  rewrite_hint?: string
}

export interface SemanticJDAnalysis {
  role_intent: string
  core_competencies: string[]
  metric_priorities: MetricPriority[]
  experience_scores: SectionRelevanceScore[]
  project_scores: SectionRelevanceScore[]
  experience_section_total: number
  project_section_total: number
  recommended_section_order: ('experience' | 'projects')[]
  entries_to_include: { experiences: number[]; projects: number[] }
  entries_to_exclude: {
    experiences: Array<{ index: number; reason: string }>
    projects: Array<{ index: number; reason: string }>
  }
  bullet_guidance: BulletGuidance[]
  skills_to_emphasize: string[]
  jd_terminology_map: Record<string, string>
  professional_title: string
}

// ─── Analyzer ─────────────────────────────────────────

/**
 * Analyze a job description semantically to produce a tailoring strategy.
 * Uses Claude Sonnet for deep semantic understanding of JD intent.
 */
export async function analyzeJobDescription(
  userId: string,
  profileData: StructuredProfileData,
  job: Job,
  jobParsed: Record<string, unknown>
): Promise<SemanticJDAnalysis> {
  const { content: prompt, metadata } = await loadPrompt('resume', 'semantic-analysis-v1')

  const input = {
    job: {
      title: job.title,
      company: job.company,
      description: jobParsed,
    },
    profile: {
      experiences: profileData.experiences.map((exp, index) => ({
        index,
        title: exp.title,
        company: exp.company,
        bullets: exp.bullets,
        ...(exp.key_metrics && { key_metrics: exp.key_metrics }),
      })),
      projects: profileData.projects.map((proj, index) => ({
        index,
        name: proj.name,
        technologies: proj.technologies,
        bullets: proj.bullets,
        ...(proj.key_metrics && { key_metrics: proj.key_metrics }),
      })),
      skills: profileData.skills,
    },
  }

  const message = await callAnthropic(
    userId,
    () =>
      anthropic.messages.create({
        model: ANTHROPIC_MODELS.SONNET,
        max_tokens: metadata.maxTokens || 2000,
        temperature: metadata.temperature ?? 0.3,
        system: prompt,
        messages: [
          { role: 'user', content: JSON.stringify(input) },
          { role: 'assistant', content: '{' },
        ],
      }),
    { timeout: 30000 }
  )

  let analysis = parseAnthropicJson<SemanticJDAnalysis>(message)
  analysis = deepSanitizeEmDashes(analysis)

  // Validate: skills_to_emphasize must only contain user's actual skills
  const userSkillsLower = new Set(profileData.skills.map(s => s.toLowerCase()))
  analysis.skills_to_emphasize = analysis.skills_to_emphasize.filter(skill =>
    userSkillsLower.has(skill.toLowerCase())
  )

  return analysis
}
