/**
 * Cover letter V2 engine types - safe for both server and client imports.
 * No Node.js dependencies.
 */

export type CoverLetterVoice = 'professional' | 'casual' | 'friendly' | 'research'

export const COVER_LETTER_VOICES: CoverLetterVoice[] = [
  'professional',
  'casual',
  'friendly',
  'research',
]

export const VOICE_LABELS: Record<CoverLetterVoice, string> = {
  professional: 'Professional',
  casual: 'Casual / Startup',
  friendly: 'Friendly',
  research: 'Research',
}

export const VOICE_DESCRIPTIONS: Record<CoverLetterVoice, string> = {
  professional: 'Formal and measured - focuses on ROI, strategy, and impact',
  casual: 'Enthusiastic and direct - focuses on building, shipping, and speed',
  friendly: 'Warm and collaborative - focuses on culture fit and teamwork',
  research: 'Academic and precise - focuses on methodology and rigor',
}

export interface CLSemanticAnalysis {
  primary_pain_point: string
  role_intent: string
  core_competencies: string[]
  top_experiences: Array<{
    index: number
    score: number
    bridge_angle: string
    highlight_bullets: number[]
  }>
  top_projects: Array<{
    index: number
    score: number
    bridge_angle: string
  }>
  company_insights: {
    industry: string
    mission_or_product: string
    culture_signals: string[]
  }
  metrics_to_feature: string[]
  skills_to_weave: string[]
}

export interface CLEngineOutput {
  content: {
    salutation: string
    paragraphs: string[]
    closing: string
  }
  markdown: string
  metadata: {
    semantic_analysis: CLSemanticAnalysis
    voice: CoverLetterVoice
    model_used: string
    prompt_version: string
    experiences_used: number[]
    projects_used: number[]
    metrics_featured: number
    post_processor_fixes: string[]
    word_count: number
  }
}
