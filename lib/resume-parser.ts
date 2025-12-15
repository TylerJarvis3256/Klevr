import { openai, MODELS } from './openai'
import { readFile } from 'fs/promises'
import path from 'path'

export interface ParsedResume {
  personal: {
    name?: string | null
    email?: string | null
    phone?: string | null
    location?: string | null
    linkedin?: string | null
    github?: string | null
    website?: string | null
  }
  education: Array<{
    school: string
    degree?: string | null
    major?: string | null
    graduationDate?: string | null
    gpa?: string | null
  }>
  experience: Array<{
    title: string
    company: string
    location?: string | null
    startDate?: string | null
    endDate?: string | null
    current: boolean
    bullets: string[]
  }>
  projects: Array<{
    name: string
    description?: string | null
    technologies: string[]
    url?: string | null
  }>
  skills: {
    languages: string[]
    frameworks: string[]
    tools: string[]
    other: string[]
  }
  certifications: Array<{
    name: string
    issuer?: string | null
    date?: string | null
  }>
}

/**
 * Parse resume text using OpenAI
 */
export async function parseResumeText(resumeText: string): Promise<ParsedResume> {
  // Read the prompt template
  const promptPath = path.join(process.cwd(), 'prompts', 'resume', 'parse-v1.md')
  const prompt = await readFile(promptPath, 'utf-8')

  // Call OpenAI
  const response = await openai.chat.completions.create({
    model: MODELS.GPT4O_MINI,
    messages: [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content: resumeText,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  })

  const content = response.choices[0].message.content
  if (!content) {
    throw new Error('No response from OpenAI')
  }

  // Parse and validate the JSON response
  const parsed = JSON.parse(content) as ParsedResume

  return parsed
}
