/**
 * Shared resume types — safe for both server and client imports.
 *
 * This file has ZERO Node.js dependencies so it can be imported from
 * 'use client' components without triggering "Module not found: fs" errors.
 */

// ─── Skills ──────────────────────────────────────────

export interface SkillsV2 {
  languages: string[]
  frameworks: string[]
  tools: string[]
  other: string[]
}

export interface SkillsV1 {
  technical: string[]
  other: string[]
}

export function isSkillsV2(skills: SkillsV1 | SkillsV2): skills is SkillsV2 {
  return 'languages' in skills
}

// ─── Profile ─────────────────────────────────────────

export interface StructuredProfileData {
  personal: {
    name: string
    email: string
    phone?: string
    location?: string
    linkedin?: string
    github?: string
  }
  education: Array<{
    school: string
    degree: string
    major?: string
    graduation_date: string
    gpa?: string
    relevant_coursework?: string[]
    honors?: string[]
  }>
  experiences: Array<{
    title: string
    company: string
    location?: string
    start_date: string
    end_date?: string
    is_current: boolean
    bullets: string[]
    key_metrics?: string
  }>
  projects: Array<{
    name: string
    description?: string
    technologies: string[]
    bullets: string[]
    date_range?: string
    url?: string
    github_link?: string
    key_metrics?: string
  }>
  skills: string[]
}

// ─── Generated Content ───────────────────────────────

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
  skills: SkillsV1 | SkillsV2
  projects: Array<{
    name: string
    description: string
    technologies: string[]
  }>
}
