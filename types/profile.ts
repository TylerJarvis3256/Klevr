// Profile-related types for Klevr

import type { Profile, Project } from '@prisma/client'
import type { Education, JobExperience, Bullet } from '@/types/models'

// ===== Education Types =====

export interface EducationFormData {
  school: string
  degree: string
  major?: string
  graduation_date: string
  gpa?: string
  location?: string
  relevant_coursework?: string[]
  honors?: string[]
  display_order?: number
}

export type EducationWithRelations = Education

// ===== Job Experience Types =====

export interface JobExperienceFormData {
  title: string
  company: string
  location?: string
  start_date: string
  end_date?: string
  is_current?: boolean
  description?: string
  display_order?: number
}

export type JobExperienceWithBullets = JobExperience & {
  Bullets: Bullet[]
}

// ===== Bullet Types =====

export interface BulletFormData {
  text: string
  experience_id?: string
  project_id?: string
  tags?: string[]
  priority?: number
  is_favorite?: boolean
  ai_category?: string
  metrics?: {
    type: 'percentage' | 'absolute'
    value: number
  }
}

export type BulletWithRelations = Bullet & {
  JobExperience?: JobExperience | null
  Project?: Project | null
}

// ===== Bullet AI Categories =====

export type BulletAICategory =
  | 'leadership'
  | 'technical'
  | 'impact'
  | 'collaboration'
  | 'problem-solving'
  | 'communication'
  | 'other'

// ===== Structured Profile Data (for AI generation) =====

export interface StructuredProfileData {
  education: Education[]
  experiences: JobExperienceWithBullets[]
  projects: (Project & { Bullets: Bullet[] })[]
  skills: string[]
  bullets: Bullet[] // Profile-level bullets
}

// ===== Profile with all relations =====

export type ProfileWithAllData = Profile & {
  User: {
    Education: Education[]
    JobExperience: JobExperienceWithBullets[]
    Project: (Project & { Bullets: Bullet[] })[]
    Bullet: Bullet[]
  }
}

// ===== Bullet Enhancement Types =====

export interface BulletEnhanceRequest {
  bulletText: string
  jobDescription?: string
  context?: {
    jobTitle?: string
    companyName?: string
    skills?: string[]
  }
}

export interface BulletEnhanceResponse {
  originalText: string
  enhancedText: string
  suggestedTags: string[]
  suggestedCategory: BulletAICategory
  suggestedPriority: number
  metrics?: {
    type: 'percentage' | 'absolute'
    value: number
  }
}

// ===== Bullet Suggestion Types =====

export interface BulletSuggestRequest {
  jobDescription: string
  experienceContext?: {
    title: string
    company: string
    description?: string
  }
  projectContext?: {
    name: string
    description?: string
    technologies: string[]
  }
}

export interface BulletSuggestResponse {
  suggestions: Array<{
    text: string
    tags: string[]
    category: BulletAICategory
    priority: number
    metrics?: {
      type: 'percentage' | 'absolute'
      value: number
    }
  }>
}

// ===== Auto-Tag Types =====

export interface BulletAutoTagRequest {
  bullets: Array<{
    id: string
    text: string
  }>
}

export interface BulletAutoTagResponse {
  bulletTags: Array<{
    id: string
    tags: string[]
    category: BulletAICategory
    priority: number
  }>
}
