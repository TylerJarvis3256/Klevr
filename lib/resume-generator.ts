import { openai, MODELS, callOpenAI, parseOpenAIJson } from './openai'
import { loadPrompt } from './prompts'
import type { ParsedResume } from './resume-parser'
import type { Job } from '@prisma/client'
import { deepSanitizeEmDashes } from './utils'

// Re-export types from resume-types.ts (client-safe module)
export type {
  SkillsV1,
  SkillsV2,
  StructuredProfileData,
  GeneratedResumeContent,
} from './resume-types'
export { isSkillsV2 } from './resume-types'

import type { GeneratedResumeContent, StructuredProfileData } from './resume-types'

export async function generateResumeContent(
  userId: string,
  userResume: ParsedResume,
  job: Job,
  jobParsed: any,
  profileSkills?: string[],
  userProjects?: Array<{
    name: string
    description: string | null
    technologies: string[]
    date_range: string | null
    url: string | null
    github_link: string | null
  }>
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
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: metadata.maxTokens,
      }),
    { timeout: 45000 } // 45 seconds for resume generation
  )

  const content = parseOpenAIJson<GeneratedResumeContent>(completion.choices[0].message.content)
  return deepSanitizeEmDashes(content)
}

// ─── V3 Profile Builder ──────────────────────────────

/**
 * Transforms DB data into the StructuredProfileData shape expected by the V3 engine.
 */
export function buildStructuredProfile(
  parsedResume: ParsedResume,
  profile: { full_name?: string | null; skills: string[] },
  userEmail: string,
  dbProjects: Array<{
    name: string
    description: string | null
    technologies: string[]
    date_range: string | null
    url: string | null
    github_link: string | null
  }>
): StructuredProfileData {
  const personal = {
    name: parsedResume.personal?.name || profile.full_name || 'Your Name',
    email: parsedResume.personal?.email || userEmail,
    ...(parsedResume.personal?.phone && { phone: parsedResume.personal.phone }),
    ...(parsedResume.personal?.location && { location: parsedResume.personal.location }),
    ...(parsedResume.personal?.linkedin && { linkedin: parsedResume.personal.linkedin }),
    ...(parsedResume.personal?.github && { github: parsedResume.personal.github }),
  }

  const education = (parsedResume.education || []).map(edu => ({
    school: edu.school,
    degree: edu.degree || '',
    ...(edu.major && { major: edu.major }),
    graduation_date: edu.graduationDate || '',
    ...(edu.gpa && { gpa: edu.gpa }),
  }))

  const experiences = (parsedResume.experience || []).map(exp => ({
    title: exp.title,
    company: exp.company,
    ...(exp.location && { location: exp.location }),
    start_date: exp.startDate || '',
    ...(exp.endDate && { end_date: exp.endDate }),
    is_current: exp.current,
    bullets: exp.bullets || [],
  }))

  // Merge DB projects with parsed resume projects (match by name for bullets)
  const parsedProjectsByName = new Map(
    (parsedResume.projects || []).map(p => [p.name.toLowerCase(), p])
  )

  const projects = dbProjects.map(dbProj => {
    const parsed = parsedProjectsByName.get(dbProj.name.toLowerCase())
    return {
      name: dbProj.name,
      ...(dbProj.description && { description: dbProj.description }),
      technologies: dbProj.technologies || [],
      bullets: parsed?.description ? [parsed.description] : [],
      ...(dbProj.date_range && { date_range: dbProj.date_range }),
      ...(dbProj.url && { url: dbProj.url }),
      ...(dbProj.github_link && { github_link: dbProj.github_link }),
    }
  })

  // Skills: prefer profile skills, fall back to flattening parsed resume skill categories
  let skills = profile.skills
  if (skills.length === 0 && parsedResume.skills) {
    skills = [
      ...(parsedResume.skills.languages || []),
      ...(parsedResume.skills.frameworks || []),
      ...(parsedResume.skills.tools || []),
      ...(parsedResume.skills.other || []),
    ]
  }

  return { personal, education, experiences, projects, skills }
}
