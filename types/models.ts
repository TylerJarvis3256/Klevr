// Local type definitions for models not in the Prisma schema.
// These types are used by the profile editor components and API routes.

export interface Education {
  id: string
  user_id: string
  school: string
  degree: string
  major: string | null
  graduation_date: string
  gpa: string | null
  location: string | null
  relevant_coursework: string[]
  honors: string[]
  display_order: number
  created_at: Date
  updated_at: Date
}

export interface JobExperience {
  id: string
  user_id: string
  title: string
  company: string
  location: string | null
  start_date: string
  end_date: string | null
  is_current: boolean
  description: string | null
  key_metrics: string | null
  display_order: number
  created_at: Date
  updated_at: Date
}

export interface Bullet {
  id: string
  user_id: string
  experience_id: string | null
  project_id: string | null
  text: string
  tags: string[]
  priority: number
  is_favorite: boolean
  ai_category: string | null
  created_at: Date
  updated_at: Date
}
