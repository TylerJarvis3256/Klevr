import { openai, MODELS, callOpenAI } from './openai'
import { loadPrompt } from './prompts'
import { FitBucket } from '@prisma/client'

export interface ExplanationInput {
  fit_bucket: FitBucket
  fit_score: number
  matching_skills: string[]
  missing_required_skills: string[]
  missing_preferred_skills: string[]
  job_title: string
  user_major?: string
}

/**
 * Generate AI explanation for fit assessment
 */
export async function generateFitExplanation(
  userId: string,
  input: ExplanationInput
): Promise<string> {
  const { content: prompt } = await loadPrompt('scoring', 'explain-fit-v1')

  const completion = await callOpenAI(userId, () =>
    openai.chat.completions.create({
      model: MODELS.GPT4O_MINI,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(input) },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })
  )

  return completion.choices[0].message.content || 'No explanation available.'
}
