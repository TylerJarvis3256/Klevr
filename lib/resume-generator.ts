import { openai, MODELS, callOpenAI, parseOpenAIJson } from './openai'
import { loadPrompt } from './prompts'
import type { ParsedResume } from './resume-parser'
import type { Job } from '@prisma/client'

export interface GeneratedResumeContent {
  summary: string
  experience: Array<{
    title: string
    company: string
    location?: string
    dates: string
    bullets: string[]
  }>
  education: Array<{
    degree: string
    school: string
    graduation: string
    gpa?: string
  }>
  skills: {
    technical: string[]
    other: string[]
  }
  projects: Array<{
    name: string
    description: string
    technologies: string[]
  }>
}

export async function generateResumeContent(
  userId: string,
  userResume: ParsedResume,
  job: Job,
  jobParsed: any,
  profileSkills?: string[]
): Promise<GeneratedResumeContent> {
  const { content: prompt, metadata } = await loadPrompt('resume', 'generate-v1')

  const input = {
    user_resume: userResume,
    job: {
      title: job.title,
      company: job.company,
      description: jobParsed,
    },
    profile_skills: profileSkills || [],
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
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: metadata.maxTokens,
      }),
    { timeout: 45000 } // 45 seconds for resume generation
  )

  return parseOpenAIJson<GeneratedResumeContent>(completion.choices[0].message.content)
}
