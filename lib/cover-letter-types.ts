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

// ---- Voice Selection (UI - includes 'auto' option) ----

export type CoverLetterVoiceSelection = CoverLetterVoice | 'auto'

export const COVER_LETTER_VOICE_OPTIONS: CoverLetterVoiceSelection[] = [
  'auto',
  'professional',
  'casual',
  'friendly',
  'research',
]

export const VOICE_SELECTION_LABELS: Record<CoverLetterVoiceSelection, string> = {
  auto: 'Best Match',
  ...VOICE_LABELS,
}

export const VOICE_SELECTION_DESCRIPTIONS: Record<CoverLetterVoiceSelection, string> = {
  auto: 'Let the AI analyze the job description and choose the best voice',
  ...VOICE_DESCRIPTIONS,
}

// ---- Skill Ground Truth (anti-hallucination) ----

export interface SkillEvidence {
  skill: string
  found_in: Array<{
    type: 'experience' | 'project'
    name: string
    context: string
  }>
}

export interface SkillGroundTruth {
  verified_skills: SkillEvidence[]
  missing_required: string[]
  missing_preferred: string[]
  all_user_skills: string[]
}

export interface CoverLetterSkillData {
  matching_skills: string[]
  missing_required_skills: string[]
  missing_preferred_skills: string[]
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
  recommended_voice: CoverLetterVoice
  adjacency_map?: Array<{
    missing_skill: string
    adjacent_user_skill: string
    reframe_angle: string
  }>
  education_to_feature?: {
    credential: string
    graduation_date: string
    gpa?: string
    relevance_note: string
  }
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
    voice_auto_recommended: CoverLetterVoice
    voice_used: CoverLetterVoice
    model_used: string
    prompt_version: string
    experiences_used: number[]
    projects_used: number[]
    metrics_featured: number
    post_processor_fixes: string[]
    word_count: number
  }
}
