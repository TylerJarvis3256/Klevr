import { openai, MODELS, callOpenAI, parseOpenAIJson } from './openai'
import { loadPrompt } from './prompts'

export interface ParsedJobDescription {
  required_skills: string[]
  preferred_skills: string[]
  education_required?: string
  experience_required?: string
  responsibilities: string[]
  qualifications: string[]
  job_type?: string
  level?: 'ENTRY_LEVEL' | 'MID_LEVEL' | 'SENIOR'
  domain?: string
}

/**
 * Parse job description using AI
 */
export async function parseJobDescription(
  userId: string,
  jobDescription: string
): Promise<ParsedJobDescription> {
  const { content: prompt } = await loadPrompt('scoring', 'parse-job-v1')

  const completion = await callOpenAI(userId, () =>
    openai.chat.completions.create({
      model: MODELS.GPT4O_MINI,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: jobDescription },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })
  )

  const content = completion.choices[0].message.content
  return parseOpenAIJson<ParsedJobDescription>(content)
}
