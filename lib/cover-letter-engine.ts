import { anthropic, ANTHROPIC_MODELS, callAnthropic, parseAnthropicJson } from './anthropic'
import { loadPrompt } from './prompts'
import { postProcessCoverLetter } from './cover-letter-post-processor'
import { generateCoverLetterMarkdown } from './markdown/resume-to-markdown'
import { deepSanitizeEmDashes } from './utils'
import type { StructuredProfileData } from './resume-types'
import type { Job } from '@prisma/client'
import type { CoverLetterVoice, CLSemanticAnalysis, CLEngineOutput } from './cover-letter-types'

// ---- Semantic Analysis ----

/**
 * Run semantic analysis on the JD for cover letter generation.
 * Returns analysis identifying pain point, top experiences, and bridge angles.
 */
async function runCLSemanticAnalysis(
  userId: string,
  profileData: StructuredProfileData,
  job: Job
): Promise<CLSemanticAnalysis> {
  const { content: prompt, metadata } = await loadPrompt('cover-letter', 'semantic-analysis-v1')

  const input = {
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
  voice: CoverLetterVoice
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

  const input = {
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
  voice: CoverLetterVoice = 'professional'
): Promise<CLEngineOutput> {
  // Step 1: Semantic analysis
  const analysis = await runCLSemanticAnalysis(userId, profileData, job)

  // Step 2: Generate content
  const rawContent = await generateCLContent(userId, profileData, job, analysis, voice)

  // Step 3: Post-process
  const { paragraphs: processedParagraphs, fixes } = postProcessCoverLetter(rawContent.paragraphs)

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
      voice,
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
