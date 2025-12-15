import { openai, MODELS, callOpenAI, parseOpenAIJson } from './openai'
import { loadPrompt } from './prompts'

export interface CompanyResearch {
  overview: string
  talking_points: string[]
  things_to_research: string[]
  culture_notes?: string
}

/**
 * Generate company research summary (LLM-only)
 */
export async function generateCompanyResearch(
  userId: string,
  companyName: string,
  jobTitle: string,
  jobDescription: string
): Promise<CompanyResearch> {
  const { content: prompt } = await loadPrompt('research', 'company-v1')

  // Truncate job description to avoid token limits
  const truncatedDescription = jobDescription.substring(0, 500)

  const input = {
    company_name: companyName,
    job_title: jobTitle,
    job_description: truncatedDescription,
  }

  const completion = await callOpenAI(userId, () =>
    openai.chat.completions.create({
      model: MODELS.GPT4O_MINI,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify(input) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 1000,
    })
  )

  return parseOpenAIJson<CompanyResearch>(completion.choices[0].message.content)
}
