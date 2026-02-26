import { anthropic, ANTHROPIC_MODELS, callAnthropic, parseAnthropicJson } from './anthropic'
import { loadPrompt } from './prompts'
import { postProcessCoverLetter } from './cover-letter-post-processor'
import { generateCoverLetterMarkdown } from './markdown/resume-to-markdown'
import { deepSanitizeEmDashes } from './utils'
import type { StructuredProfileData } from './resume-types'
import type { Job } from '@prisma/client'
import type {
  CoverLetterVoice,
  CoverLetterSkillData,
  CLSemanticAnalysis,
  CLEngineOutput,
  SkillGroundTruth,
  SkillEvidence,
} from './cover-letter-types'

// ---- Skill Ground Truth Builder ----

/**
 * Build a deterministic skill ground truth from profile data and job scoring results.
 * For each matching skill, finds evidence in experiences and projects.
 */
export function buildSkillGroundTruth(
  profileData: StructuredProfileData,
  matchingSkills: string[],
  missingRequired: string[],
  missingPreferred: string[]
): SkillGroundTruth {
  const verifiedSkills: SkillEvidence[] = matchingSkills.map(skill => {
    const found_in: SkillEvidence['found_in'] = []
    const skillLower = skill.toLowerCase()

    // Search project technologies and bullets
    for (const proj of profileData.projects) {
      const inTech = proj.technologies.some(t => t.toLowerCase() === skillLower)
      const matchingBullets = proj.bullets.filter(b => b.toLowerCase().includes(skillLower))

      if (inTech || matchingBullets.length > 0) {
        const context = inTech
          ? `Technologies: ${proj.technologies.join(', ')}`
          : matchingBullets[0]
        found_in.push({ type: 'project', name: proj.name, context })
      }
    }

    // Search experience bullets
    for (const exp of profileData.experiences) {
      const matchingBullets = exp.bullets.filter(b => b.toLowerCase().includes(skillLower))
      if (matchingBullets.length > 0) {
        found_in.push({
          type: 'experience',
          name: `${exp.title} at ${exp.company}`,
          context: matchingBullets[0],
        })
      }
    }

    return { skill, found_in }
  })

  return {
    verified_skills: verifiedSkills,
    missing_required: missingRequired,
    missing_preferred: missingPreferred,
    all_user_skills: profileData.skills,
  }
}

// ---- Semantic Analysis ----

/**
 * Run semantic analysis on the JD for cover letter generation.
 * Returns analysis identifying pain point, top experiences, and bridge angles.
 */
async function runCLSemanticAnalysis(
  userId: string,
  profileData: StructuredProfileData,
  job: Job,
  groundTruth?: SkillGroundTruth
): Promise<CLSemanticAnalysis> {
  const { content: prompt, metadata } = await loadPrompt('cover-letter', 'semantic-analysis-v1')

  const input: Record<string, unknown> = {
    job: {
      title: job.title,
      company: job.company,
      description: job.job_description_raw,
    },
    profile: {
      experiences: profileData.experiences.map((exp, index) => ({
        index,
        title: exp.title,
        company: exp.company,
        bullets: exp.bullets,
      })),
      projects: profileData.projects.map((proj, index) => ({
        index,
        name: proj.name,
        technologies: proj.technologies,
        bullets: proj.bullets,
      })),
      skills: profileData.skills,
      education: profileData.education.map(edu => ({
        school: edu.school,
        degree: edu.degree,
        major: edu.major,
        graduation_date: edu.graduation_date,
        gpa: edu.gpa,
      })),
    },
  }

  if (groundTruth) {
    input.skill_boundaries = {
      verified_skills: groundTruth.verified_skills.map(vs => ({
        skill: vs.skill,
        evidence: vs.found_in.map(f => f.context).slice(0, 3),
      })),
      missing_required: groundTruth.missing_required,
      missing_preferred: groundTruth.missing_preferred,
      all_user_skills: groundTruth.all_user_skills,
    }
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

  const analysis = parseAnthropicJson<CLSemanticAnalysis>(message)
  return deepSanitizeEmDashes(analysis)
}

// ---- Content Generation ----

interface CLGeneratedContent {
  salutation: string
  paragraphs: string[]
  closing: string
}

/**
 * Generate cover letter content using Claude with semantic analysis context.
 */
async function generateCLContent(
  userId: string,
  profileData: StructuredProfileData,
  job: Job,
  analysis: CLSemanticAnalysis,
  voice: CoverLetterVoice,
  forbiddenSkills?: string[]
): Promise<CLGeneratedContent> {
  const { content: prompt, metadata } = await loadPrompt('cover-letter', 'generate-v2')

  // Build enriched experience data for the prompt
  const topExperiences = analysis.top_experiences
    .map(te => {
      const exp = profileData.experiences[te.index]
      if (!exp) return null
      return {
        title: exp.title,
        company: exp.company,
        bridge_angle: te.bridge_angle,
        highlight_bullets: te.highlight_bullets.map(bi => exp.bullets[bi]).filter(Boolean),
      }
    })
    .filter(Boolean)

  // Build enriched project data for the prompt
  const topProjects = analysis.top_projects
    .map(tp => {
      const proj = profileData.projects[tp.index]
      if (!proj) return null
      return {
        name: proj.name,
        bridge_angle: tp.bridge_angle,
        technologies: proj.technologies,
      }
    })
    .filter(Boolean)

  const input: Record<string, unknown> = {
    user_name: profileData.personal.name,
    job: {
      title: job.title,
      company: job.company,
    },
    voice,
    semantic_analysis: {
      primary_pain_point: analysis.primary_pain_point,
      role_intent: analysis.role_intent,
      core_competencies: analysis.core_competencies,
      top_experiences: topExperiences,
      top_projects: topProjects,
      company_insights: analysis.company_insights,
      metrics_to_feature: analysis.metrics_to_feature,
      skills_to_weave: analysis.skills_to_weave,
    },
    education_context: analysis.education_to_feature ?? null,
  }

  if (forbiddenSkills && forbiddenSkills.length > 0) {
    input.skill_boundaries = {
      forbidden_skills: forbiddenSkills,
      adjacency_map: analysis.adjacency_map ?? [],
    }
  }

  const message = await callAnthropic(
    userId,
    () =>
      anthropic.messages.create({
        model: ANTHROPIC_MODELS.SONNET,
        max_tokens: metadata.maxTokens || 1500,
        temperature: metadata.temperature ?? 0.7,
        system: prompt,
        messages: [
          { role: 'user', content: JSON.stringify(input) },
          { role: 'assistant', content: '{' },
        ],
      }),
    { timeout: 30000 }
  )

  const content = parseAnthropicJson<CLGeneratedContent>(message)
  return deepSanitizeEmDashes(content)
}

// ---- Main Engine ----

/**
 * Generate a V2 cover letter using the semantic-weighted pipeline.
 *
 * Pipeline:
 * 1. Run CL semantic analysis (Claude)
 * 2. Generate content with voice + analysis context (Claude)
 * 3. Post-process to enforce writing rules
 * 4. Generate markdown with letterhead layout
 * 5. Return CLEngineOutput with content + markdown + metadata
 */
export async function generateCoverLetterV2(
  userId: string,
  profileData: StructuredProfileData,
  job: Job,
  voice?: CoverLetterVoice,
  skillData?: CoverLetterSkillData
): Promise<CLEngineOutput> {
  // Step 0: Build skill ground truth if scoring data is available
  const groundTruth = skillData
    ? buildSkillGroundTruth(
        profileData,
        skillData.matching_skills,
        skillData.missing_required_skills,
        skillData.missing_preferred_skills
      )
    : undefined

  const forbiddenSkills = groundTruth
    ? [...groundTruth.missing_required, ...groundTruth.missing_preferred]
    : undefined

  // Step 1: Semantic analysis
  const analysis = await runCLSemanticAnalysis(userId, profileData, job, groundTruth)

  // Use recommended voice from analysis if no explicit override provided
  const recommendedVoice = analysis.recommended_voice || 'professional'
  const effectiveVoice = voice ?? recommendedVoice

  // Step 2: Generate content
  const rawContent = await generateCLContent(
    userId,
    profileData,
    job,
    analysis,
    effectiveVoice,
    forbiddenSkills
  )

  // Step 3: Post-process (with metric context and forbidden skills detection)
  const { paragraphs: processedParagraphs, fixes } = postProcessCoverLetter(rawContent.paragraphs, {
    metricsToFeature: analysis.metrics_to_feature,
    forbiddenSkills,
  })

  const content = {
    salutation: rawContent.salutation,
    paragraphs: processedParagraphs,
    closing: rawContent.closing,
  }

  // Step 4: Generate markdown
  const markdown = generateCoverLetterMarkdown(
    content,
    {
      name: profileData.personal.name,
      email: profileData.personal.email,
      phone: profileData.personal.phone,
    },
    {
      title: job.title,
      company: job.company,
    }
  )

  // Count metrics featured in final content
  const allText = processedParagraphs.join(' ')
  const metricsInFinal = analysis.metrics_to_feature.filter(m => allText.includes(m)).length

  // Count words
  const wordCount = allText.split(/\s+/).filter(w => w.length > 0).length

  return {
    content,
    markdown,
    metadata: {
      semantic_analysis: analysis,
      voice: effectiveVoice,
      voice_auto_recommended: recommendedVoice,
      voice_used: effectiveVoice,
      model_used: ANTHROPIC_MODELS.SONNET,
      prompt_version: 'cover-letter-generate-v2.0.0',
      experiences_used: analysis.top_experiences.map(e => e.index),
      projects_used: analysis.top_projects.map(p => p.index),
      metrics_featured: metricsInFinal,
      post_processor_fixes: fixes,
      word_count: wordCount,
    },
  }
}
