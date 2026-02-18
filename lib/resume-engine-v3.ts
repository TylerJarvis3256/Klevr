import { anthropic, ANTHROPIC_MODELS, callAnthropic, parseAnthropicJson } from './anthropic'
import { loadPrompt } from './prompts'
import { rankBullets, detectBulletMetrics } from './bullet-scorer'
import { estimateContentWordCount } from './resume-tailoring'
import { type MarkdownUserInfo } from './markdown/resume-to-markdown'
import type { StructuredProfileData, SkillsV1, SkillsV2 } from './resume-generator'
import { isSkillsV2 } from './resume-generator'
import type { SemanticJDAnalysis } from './semantic-analyzer'
import type { Job } from '@prisma/client'
import { deepSanitizeEmDashes } from './utils'
import { governOnePage, type GovernableContent } from './one-page-governor'

// ─── Interfaces ───────────────────────────────────────

export interface ResumeV3Output {
  content: GovernableContent
  markdown: string
  metadata: {
    semantic_analysis: SemanticJDAnalysis
    section_order: string[]
    bullets_used: number
    bullets_available: number
    pruned_entries: string[]
    boosted_section: string | null
    model_used: string
    prompt_version: string
    metric_protected_count: number
    metric_restored_count: number
    governor_actions: string[]
    density_failure: boolean
    density_ratio: number
    metrics_in_final: number
  }
}

// ─── V3 Engine ────────────────────────────────────────

/**
 * Generate a tailored resume using the V3 semantic-weighted engine.
 *
 * Pipeline:
 * 1. Pre-process: rank bullets per experience/project
 * 2. Determine layout from semantic analysis
 * 3. Estimate fit and decide on pruning/boosting
 * 4. Call Claude Sonnet for content generation
 * 5. Post-process: validate skills guardrail
 * 6. Generate markdown with dynamic section ordering
 */
export async function generateResumeV3(
  userId: string,
  profileData: StructuredProfileData,
  job: Job,
  jobParsed: Record<string, unknown>,
  analysis: SemanticJDAnalysis,
  userInfo: MarkdownUserInfo
): Promise<ResumeV3Output> {
  const coreCompetencies = analysis.core_competencies
  const metricPriorities = analysis.metric_priorities.map(mp => mp.type)

  // Step 1: Rank bullets per experience and project
  const rankedExperiences = profileData.experiences.map((exp, idx) => {
    const ranked = rankBullets(
      exp.bullets.map(text => ({ text })),
      coreCompetencies,
      metricPriorities
    )
    return { ...exp, bullets: ranked.map(r => r.text), originalIndex: idx }
  })

  const rankedProjects = profileData.projects.map((proj, idx) => {
    const ranked = rankBullets(
      proj.bullets.map(text => ({ text })),
      coreCompetencies,
      metricPriorities
    )
    return { ...proj, bullets: ranked.map(r => r.text), originalIndex: idx }
  })

  // Step 1b: Track metric-protected bullets per experience and project
  const metricBulletsPerExp = new Map<number, string[]>()
  profileData.experiences.forEach((exp, idx) => {
    const metricBullets = exp.bullets.filter(b => detectBulletMetrics(b).hasMetric)
    if (metricBullets.length > 0) metricBulletsPerExp.set(idx, metricBullets)
  })

  const metricBulletsPerProj = new Map<number, string[]>()
  profileData.projects.forEach((proj, idx) => {
    const metricBullets = proj.bullets.filter(b => detectBulletMetrics(b).hasMetric)
    if (metricBullets.length > 0) metricBulletsPerProj.set(idx, metricBullets)
  })

  const metricProtectedCount = [
    ...metricBulletsPerExp.values(),
    ...metricBulletsPerProj.values(),
  ].reduce((sum, bullets) => sum + bullets.length, 0)

  // Step 2: Determine section order and entries
  // New default: Education → Skills → Experience → Projects
  // Override: if projects score 20%+ higher than experience, swap to projects first
  let primarySecondary: string[]
  if (
    analysis.project_section_total > 0 &&
    analysis.project_section_total >= analysis.experience_section_total * 1.2
  ) {
    primarySecondary = ['projects', 'experience']
  } else {
    primarySecondary = ['experience', 'projects']
  }

  const fullSectionOrder = ['education', 'skills', ...primarySecondary]

  const includedExperienceIndices = new Set(analysis.entries_to_include.experiences)
  const includedProjectIndices = new Set(analysis.entries_to_include.projects)

  let filteredExperiences = rankedExperiences.filter((_, idx) => includedExperienceIndices.has(idx))
  const filteredProjects = rankedProjects.filter((_, idx) => includedProjectIndices.has(idx))

  // Guardrail: Never allow zero professional experiences if user has any
  if (filteredExperiences.length === 0 && profileData.experiences.length > 0) {
    // Force-include the highest-scored experience from the analysis
    const bestScore = [...analysis.experience_scores].sort((a, b) => b.score - a.score)[0]
    if (bestScore) {
      const bestExp = rankedExperiences.find((_, idx) => idx === bestScore.index)
      if (bestExp) filteredExperiences = [bestExp]
    } else {
      // No scores available — include the first experience
      filteredExperiences = [rankedExperiences[0]]
    }
  }

  // Guardrail: If user has ≤ 2 total experiences, include ALL regardless of analysis scores
  if (profileData.experiences.length <= 2 && profileData.experiences.length > 0) {
    filteredExperiences = rankedExperiences
  }

  // Track pruned entries
  const prunedEntries: string[] = []
  for (const excluded of analysis.entries_to_exclude.experiences) {
    const exp = profileData.experiences[excluded.index]
    if (exp) prunedEntries.push(`Experience: ${exp.title} at ${exp.company} - ${excluded.reason}`)
  }
  for (const excluded of analysis.entries_to_exclude.projects) {
    const proj = profileData.projects[excluded.index]
    if (proj) prunedEntries.push(`Project: ${proj.name} - ${excluded.reason}`)
  }

  // Step 3: Estimate fit and determine boost/prune
  const totalBulletsAvailable = [
    ...profileData.experiences.flatMap(e => e.bullets),
    ...profileData.projects.flatMap(p => p.bullets),
  ].length

  const wordCount = estimateContentWordCount(profileData)
  const needsCompression = wordCount > 500
  let boostSection: string | null = null

  if (!needsCompression && wordCount < 350) {
    // Room to spare — boost the higher-scoring section
    boostSection =
      analysis.experience_section_total >= analysis.project_section_total
        ? 'experience'
        : 'projects'
  }

  const maxBulletsPerExperience = needsCompression ? 3 : 4
  const maxProjects = needsCompression ? 3 : 4

  // Step 4: Build AI input and call Claude
  const { content: prompt, metadata } = await loadPrompt('resume', 'generate-v3')

  const aiInput = {
    profile: {
      ...profileData,
      experiences: filteredExperiences,
      projects: filteredProjects,
    },
    job: {
      title: job.title,
      company: job.company,
      description: jobParsed,
    },
    analysis: {
      role_intent: analysis.role_intent,
      core_competencies: analysis.core_competencies,
      metric_priorities: analysis.metric_priorities,
      recommended_section_order: analysis.recommended_section_order,
      entries_to_include: analysis.entries_to_include,
      entries_to_exclude: analysis.entries_to_exclude,
      bullet_guidance: analysis.bullet_guidance,
      skills_to_emphasize: analysis.skills_to_emphasize,
      jd_terminology_map: analysis.jd_terminology_map,
      professional_title: analysis.professional_title,
      fact_grounding_note:
        'IMMUTABLE RULE: Terminology map entries change FRAMING only, never the technical action.\n' +
        'VALID: "REST endpoints" → "API services" (same action, different label)\n' +
        'VALID: "analyzed data" → "engineered data-processing pipeline" (upgraded framing, same action)\n' +
        'INVALID: "analyzed job posts" → "trained ML models" (different action)\n' +
        'INVALID: "built dashboard" → "architected microservice orchestration" (inflated beyond recognition)\n' +
        'TEST: Could the candidate describe this bullet in an interview without contradicting their work?',
      metric_protection_note:
        'Bullets containing quantifiable metrics (%, $, #, time) are HIGH DENSITY ' +
        'and must be prioritized for inclusion. Never drop a metric-bearing bullet in favor of a non-metric one.',
    },
    constraints: {
      section_order: fullSectionOrder,
      max_bullets_per_experience:
        boostSection === 'experience' ? maxBulletsPerExperience + 1 : maxBulletsPerExperience,
      max_projects: boostSection === 'projects' ? maxProjects + 1 : maxProjects,
      boost_section: boostSection,
    },
  }

  const message = await callAnthropic(
    userId,
    () =>
      anthropic.messages.create({
        model: ANTHROPIC_MODELS.SONNET,
        max_tokens: metadata.maxTokens || 4000,
        temperature: metadata.temperature ?? 0.5,
        system: prompt,
        messages: [
          { role: 'user', content: JSON.stringify(aiInput) },
          { role: 'assistant', content: '{' },
        ],
      }),
    { timeout: 45000 }
  )

  let generatedContent = parseAnthropicJson<GovernableContent>(message)
  generatedContent = deepSanitizeEmDashes(generatedContent)

  // Step 5: Post-process — validate skills guardrail
  const userSkillsLower = new Set(profileData.skills.map(s => s.toLowerCase()))

  if (generatedContent.skills) {
    if (isSkillsV2(generatedContent.skills)) {
      // V2 (4-category) skills format
      const v2 = generatedContent.skills as SkillsV2
      v2.languages = v2.languages.filter(s => userSkillsLower.has(s.toLowerCase()))
      v2.frameworks = v2.frameworks.filter(s => userSkillsLower.has(s.toLowerCase()))
      v2.tools = v2.tools.filter(s => userSkillsLower.has(s.toLowerCase()))
      v2.other = v2.other.filter(s => userSkillsLower.has(s.toLowerCase()))
    } else {
      // V1 (2-category) skills format
      const v1 = generatedContent.skills as SkillsV1
      v1.technical = v1.technical.filter(s => userSkillsLower.has(s.toLowerCase()))
      v1.other = v1.other.filter(s => userSkillsLower.has(s.toLowerCase()))
    }
  }

  // Step 5b: Post-process — metric retention guardrail
  let metricRestoredCount = 0

  if (generatedContent.experience) {
    for (const genExp of generatedContent.experience) {
      // Match generated experience back to original by title+company (case-insensitive)
      const origIdx = profileData.experiences.findIndex(
        e =>
          e.title.toLowerCase() === genExp.title.toLowerCase() &&
          e.company.toLowerCase() === genExp.company.toLowerCase()
      )
      if (origIdx === -1) continue

      const protectedBullets = metricBulletsPerExp.get(origIdx)
      if (!protectedBullets) continue

      for (const metricBullet of protectedBullets) {
        const metricInfo = detectBulletMetrics(metricBullet)
        if (!metricInfo.rawMatch) continue

        // Check if this metric value appears in any generated bullet
        const metricPresent = genExp.bullets.some(b => b.includes(metricInfo.rawMatch!))
        if (metricPresent) continue

        // Find lowest-scored non-metric bullet to replace
        const nonMetricIdx = [...genExp.bullets]
          .map((b, i) => ({ b, i, hasMetric: detectBulletMetrics(b).hasMetric }))
          .filter(x => !x.hasMetric)
          .pop() // last non-metric bullet = lowest priority (already sorted by rank)

        if (nonMetricIdx) {
          genExp.bullets[nonMetricIdx.i] = metricBullet
          metricRestoredCount++
        }
      }
    }
  }

  if (generatedContent.projects) {
    for (const genProj of generatedContent.projects) {
      const projBullets = genProj.bullets
      if (!projBullets) continue

      // Match generated project back to original by name (case-insensitive)
      const origIdx = profileData.projects.findIndex(
        p => p.name.toLowerCase() === genProj.name.toLowerCase()
      )
      if (origIdx === -1) continue

      const protectedBullets = metricBulletsPerProj.get(origIdx)
      if (!protectedBullets) continue

      for (const metricBullet of protectedBullets) {
        const metricInfo = detectBulletMetrics(metricBullet)
        if (!metricInfo.rawMatch) continue

        const metricPresent = projBullets.some(b => b.includes(metricInfo.rawMatch!))
        if (metricPresent) continue

        const nonMetricIdx = [...projBullets]
          .map((b, i) => ({ b, i, hasMetric: detectBulletMetrics(b).hasMetric }))
          .filter(x => !x.hasMetric)
          .pop()

        if (nonMetricIdx) {
          projBullets[nonMetricIdx.i] = metricBullet
          metricRestoredCount++
        }
      }
    }
  }

  // Step 6: Governor — generate markdown with one-page enforcement
  const outputSectionOrder = generatedContent.section_order || fullSectionOrder

  const governorResult = governOnePage(generatedContent, userInfo, {
    sectionOrder: outputSectionOrder,
    professionalTitle: analysis.professional_title,
    semanticAnalysis: analysis,
  })

  const finalContent = governorResult.content
  const markdown = governorResult.markdown

  // Recalculate bullets from governed content
  const bulletsUsed =
    (finalContent.experience?.reduce((sum, exp) => sum + exp.bullets.length, 0) || 0) +
    (finalContent.projects?.reduce((sum, proj) => sum + (proj.bullets?.length || 0), 0) || 0)

  return {
    content: finalContent,
    markdown,
    metadata: {
      semantic_analysis: analysis,
      section_order: outputSectionOrder,
      bullets_used: bulletsUsed,
      bullets_available: totalBulletsAvailable,
      pruned_entries: prunedEntries,
      boosted_section: boostSection,
      model_used: ANTHROPIC_MODELS.SONNET,
      prompt_version: 'resume-generate-v3.0.0',
      metric_protected_count: metricProtectedCount,
      metric_restored_count: metricRestoredCount,
      governor_actions: governorResult.actions.map(
        a => `[Step ${a.step}] ${a.action} (saved ~${a.linesSaved} lines)`
      ),
      density_failure: metricProtectedCount > 0 && governorResult.metricsInFinalContent === 0,
      density_ratio: governorResult.densityRatio,
      metrics_in_final: governorResult.metricsInFinalContent,
    },
  }
}
