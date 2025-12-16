import { openai, MODELS, callOpenAI } from './openai'
import { loadPrompt } from './prompts'
import type { ParsedResume } from './resume-parser'
import type { Job } from '@prisma/client'

export async function generateCoverLetterContent(
  userId: string,
  userName: string,
  userResume: ParsedResume,
  job: Job,
  profileSkills?: string[],
  userProjects?: Array<{
    name: string
    description: string | null
    technologies: string[]
    date_range: string | null
    url: string | null
    github_link: string | null
  }>
): Promise<string> {
  const { content: prompt, metadata } = await loadPrompt('cover-letter', 'generate-v1')

  const input = {
    user_name: userName,
    user_resume: userResume,
    job: {
      title: job.title,
      company: job.company,
      description: job.job_description_raw,
    },
    profile_skills: profileSkills || [],
    user_projects: userProjects || [],
  }

  const completion = await callOpenAI(
    userId,
    () =>
      openai.chat.completions.create({
        model: MODELS.GPT4O,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: JSON.stringify(input) },
        ],
        temperature: 0.8,
        max_tokens: metadata.maxTokens,
      }),
    { timeout: 30000 }
  )

  return completion.choices[0].message.content || ''
}
