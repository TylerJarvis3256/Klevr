import { openai, MODELS, callOpenAI } from './openai'
import { loadPrompt } from './prompts'
import { FitBucket } from '@prisma/client'
import { SemanticFitAnalysis } from './semantic-scorer'

export interface ExplanationInput {
  fit_bucket: FitBucket
  fit_score: number
  matching_skills: string[]
  missing_required_skills: string[]
  missing_preferred_skills: string[]
  job_title: string
  user_major?: string
  ideal_persona?: string
  persona_alignment?: string
  persona_fit_score?: number
}

/**
 * Build explanation input from semantic analysis results
 */
export function buildExplanationInput(
  fitBucket: FitBucket,
  fitScore: number,
  semanticAnalysis: SemanticFitAnalysis,
  jobTitle: string,
  userMajor?: string
): ExplanationInput {
  return {
    fit_bucket: fitBucket,
    fit_score: fitScore,
    matching_skills: semanticAnalysis.matched_skills.map(s => s.skill),
    missing_required_skills: semanticAnalysis.missing_skills
      .filter(s => s.severity === 'required')
      .map(s => s.skill),
    missing_preferred_skills: semanticAnalysis.missing_skills
      .filter(s => s.severity === 'preferred')
      .map(s => s.skill),
    job_title: jobTitle,
    user_major: userMajor,
    ideal_persona: semanticAnalysis.ideal_persona,
    persona_alignment: semanticAnalysis.persona_alignment,
    persona_fit_score: semanticAnalysis.persona_fit_score,
  }
}

/**
 * Generate AI explanation for fit assessment
 */
export async function generateFitExplanation(
  userId: string,
  input: ExplanationInput
): Promise<string> {
  const { content: prompt } = await loadPrompt('scoring', 'explain-fit-v2')

  const completion = await callOpenAI(userId, () =>
    openai.chat.completions.create({
      model: MODELS.GPT4O_MINI,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(input) },
      ],
      temperature: 0.7,
      max_tokens: 600,
    })
  )

  return completion.choices[0].message.content || 'No explanation available.'
}
