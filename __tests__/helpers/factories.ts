/**
 * Test data factories for Prisma models.
 * All factories return deterministic defaults with Partial<Model> overrides.
 */

let counter = 0

function nextId(): string {
  counter++
  return `test-id-${counter}`
}

export function resetFactoryCounters(): void {
  counter = 0
}

const FIXED_DATE = new Date('2024-01-01T00:00:00Z')

// ─── User ──────────────────────────────────────────────

export function createUser(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    auth0_id: `auth0|${id}`,
    email: `user-${id}@test.com`,
    created_at: FIXED_DATE,
    updated_at: FIXED_DATE,
    ...overrides,
  }
}

// ─── Profile ───────────────────────────────────────────

export function createProfile(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    user_id: `user-${id}`,
    full_name: 'Test User',
    school: null,
    major: null,
    graduation_year: null,
    resume_file_url: null,
    resume_file_name: null,
    resume_uploaded_at: null,
    parsed_resume: null,
    parsed_resume_confirmed_at: null,
    job_types: ['FULL_TIME'],
    preferred_locations: ['Remote'],
    skills: ['TypeScript', 'React', 'Node.js'],
    resume_deleted_at: null,
    created_at: FIXED_DATE,
    updated_at: FIXED_DATE,
    ...overrides,
  }
}

// ─── Job ───────────────────────────────────────────────

export function createJob(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    user_id: `user-${id}`,
    title: 'Software Engineer',
    company: 'Test Corp',
    location: 'Remote',
    job_url: 'https://example.com/job',
    job_description_raw: 'We are looking for a software engineer...',
    job_description_parsed: null,
    job_source: null,
    adzuna_id: null,
    final_source_url: null,
    scraping_attempted_at: null,
    scraping_completed_at: null,
    scraping_error: null,
    scraping_method: null,
    scraping_status: 'PENDING',
    created_at: FIXED_DATE,
    updated_at: FIXED_DATE,
    ...overrides,
  }
}

// ─── Application ───────────────────────────────────────

export function createApplication(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    user_id: `user-${id}`,
    job_id: `job-${id}`,
    status: 'PLANNED',
    applied_at: null,
    fit_bucket: null,
    fit_score: null,
    score_explanation: null,
    matching_skills: [],
    missing_skills: [],
    missing_required_skills: [],
    missing_preferred_skills: [],
    score_count: 1,
    company_research: null,
    created_at: FIXED_DATE,
    updated_at: FIXED_DATE,
    ...overrides,
  }
}

// ─── Education ─────────────────────────────────────────

export function createEducation(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    user_id: `user-${id}`,
    school: 'Test University',
    degree: 'Bachelor of Science',
    major: 'Computer Science',
    graduation_date: 'May 2024',
    gpa: '3.8',
    location: 'New York, NY',
    relevant_coursework: ['Data Structures', 'Algorithms'],
    honors: ["Dean's List"],
    display_order: 0,
    created_at: FIXED_DATE,
    updated_at: FIXED_DATE,
    ...overrides,
  }
}

// ─── JobExperience ─────────────────────────────────────

export function createJobExperience(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    user_id: `user-${id}`,
    title: 'Software Engineering Intern',
    company: 'Tech Co',
    location: 'San Francisco, CA',
    start_date: 'Jun 2023',
    end_date: 'Aug 2023',
    is_current: false,
    description: 'Developed features for the main product.',
    key_metrics: null,
    display_order: 0,
    created_at: FIXED_DATE,
    updated_at: FIXED_DATE,
    ...overrides,
  }
}

// ─── Bullet ────────────────────────────────────────────

export function createBullet(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    user_id: `user-${id}`,
    experience_id: null,
    project_id: null,
    text: 'Implemented feature X, resulting in 20% performance improvement',
    tags: ['technical', 'impact'],
    priority: 0,
    is_favorite: false,
    ai_category: 'technical',
    metrics: null,
    created_at: FIXED_DATE,
    updated_at: FIXED_DATE,
    ...overrides,
  }
}

// ─── SemanticJDAnalysis ───────────────────────────────

export function createSemanticAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    role_intent: 'Build and maintain scalable web applications',
    core_competencies: ['Full-Stack Development', 'API Design', 'Cloud Infrastructure'],
    metric_priorities: [
      { type: 'scale', importance: 'high' },
      { type: 'efficiency', importance: 'medium' },
    ],
    experience_scores: [{ index: 0, score: 85, reason: 'Strong match for backend development' }],
    project_scores: [{ index: 0, score: 70, reason: 'Relevant React project' }],
    experience_section_total: 85,
    project_section_total: 70,
    recommended_section_order: ['experience', 'projects'],
    entries_to_include: { experiences: [0], projects: [0] },
    entries_to_exclude: { experiences: [], projects: [] },
    bullet_guidance: [{ experience_index: 0, bullet_index: 0, action: 'emphasize' }],
    skills_to_emphasize: ['TypeScript', 'React', 'Node.js'],
    jd_terminology_map: { 'REST endpoints': 'API services' },
    professional_title: 'Software Engineer',
    ...overrides,
  }
}

// ─── SemanticFitAnalysis ──────────────────────────────

export function createSemanticFitAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    semantic_skill_score: 0.75,
    persona_fit_score: 0.65,
    matched_skills: [
      {
        skill: 'TypeScript',
        match_type: 'exact' as const,
        evidence: 'Listed in candidate skills',
      },
      { skill: 'React', match_type: 'exact' as const, evidence: 'Listed in candidate skills' },
      {
        skill: 'JavaScript',
        match_type: 'inferred' as const,
        evidence: 'Implied by TypeScript and React experience',
      },
    ],
    missing_skills: [
      {
        skill: 'Docker',
        severity: 'required' as const,
        suggestion: 'Consider learning containerization basics',
      },
      {
        skill: 'GraphQL',
        severity: 'preferred' as const,
        suggestion: 'Build a small project with GraphQL',
      },
    ],
    skill_reasoning:
      'The candidate has strong frontend skills with TypeScript and React that match core requirements. JavaScript is inferred from their TypeScript and React experience. Missing Docker is a gap for the DevOps aspects of the role.',
    ideal_persona:
      'A collaborative, fast-paced team player comfortable with ambiguity in a startup environment',
    persona_reasoning:
      'The JD emphasizes collaboration, fast iteration, and wearing multiple hats - typical startup signals. The candidate needs to be comfortable with ambiguity and rapid context switching.',
    persona_alignment:
      "The candidate's internship at a small tech company and varied project work suggest good alignment with the fast-paced team culture described in the job posting.",
    ...overrides,
  }
}

// ─── ResumeUpload ─────────────────────────────────────

export function createResumeUpload(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    user_id: `user-${id}`,
    file_name: 'resume.pdf',
    file_type: 'application/pdf',
    file_size: 102400,
    storage_url: `resumes/user-${id}/${Date.now()}-resume.pdf`,
    source: 'upload',
    parsed_at: FIXED_DATE,
    parsing_error: null,
    created_at: FIXED_DATE,
    ...overrides,
  }
}

// ─── Project ───────────────────────────────────────────

export function createProject(overrides: Record<string, unknown> = {}) {
  const id = nextId()
  return {
    id,
    user_id: `user-${id}`,
    name: 'Test Project',
    description: 'A test project for unit tests',
    technologies: ['React', 'TypeScript'],
    date_range: 'Jan 2024 - Mar 2024',
    url: null,
    github_link: 'https://github.com/test/project',
    key_metrics: null,
    display_order: 0,
    created_at: FIXED_DATE,
    updated_at: FIXED_DATE,
    ...overrides,
  }
}
