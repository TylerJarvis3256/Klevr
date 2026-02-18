# Klevr - Complete Architectural & Feature Documentation

> **Comprehensive technical documentation for understanding Klevr's architecture, features, and implementation**
>
> Last Updated: December 18, 2024

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technical Architecture](#2-technical-architecture)
3. [Complete User Journey](#3-complete-user-journey)
4. [Data Models & Database Schema](#4-data-models--database-schema)
5. [AI Features Deep Dive](#5-ai-features-deep-dive)
6. [Resume & Cover Letter Generation Flow](#6-resume--cover-letter-generation-flow)
7. [Integration Points](#7-integration-points)
8. [File Structure & Organization](#8-file-structure--organization)
9. [Current Limitations & Pain Points](#9-current-limitations--pain-points)

---

## 1. System Overview

### 1.1 What is Klevr?

Klevr is an AI-powered career assistant designed specifically for college students and early-career job seekers. It streamlines the job application process by:

- **Parsing and confirming resume data** from uploaded PDFs/DOCX files
- **Scoring job fit** using AI analysis of skills, experience, and preferences
- **Generating tailored resumes** customized for each job application
- **Creating personalized cover letters** that highlight relevant experience
- **Researching companies** to provide talking points and insights
- **Tracking applications** through the entire job search lifecycle
- **Discovering jobs** via Adzuna API integration with saved searches

### 1.2 Target Users

- College students (currently enrolled)
- Recent graduates (0-2 years post-graduation)
- Early-career professionals seeking entry-level positions
- Users familiar with tech job hunting processes

### 1.3 Core Value Proposition

Klevr reduces the time and effort required to apply to jobs by:

1. Automating resume tailoring (what typically takes 30-60 minutes → 2 minutes)
2. Providing objective fit assessments before applying
3. Generating high-quality, ATS-friendly documents
4. Tracking all applications in one centralized dashboard

---

## 2. Technical Architecture

### 2.1 Tech Stack

```
Frontend:
- Next.js 14 (App Router)
- TypeScript (strict mode)
- React 18
- Tailwind CSS + shadcn/ui components
- TanStack Query (data fetching)
- React Hook Form + Zod (forms/validation)

Backend:
- Next.js API Routes
- Prisma ORM
- PostgreSQL (via Supabase)
- Inngest (background job orchestration)

AI/ML:
- OpenAI API (gpt-4o-2024-05-13, gpt-4o-mini-2024-07-18)
- Custom prompt engineering

Storage:
- AWS S3 (resume uploads, generated PDFs)
- Supabase PostgreSQL (all app data)

Authentication:
- Auth0 (email/password + Google OAuth)

External APIs:
- Adzuna Job Search API (job discovery)
- OpenAI API (all AI features)

PDF Generation:
- @react-pdf/renderer (resume/cover letter PDFs)
```

### 2.2 Architecture Patterns

**Separation of Concerns:**

- `lib/` - Pure business logic (no request/response handling)
- `app/api/` - HTTP API routes (thin controllers)
- `inngest/functions/` - Background job functions (async processing)
- `components/` - UI components (presentation layer)

**Async-First AI Processing:**

- All AI operations run asynchronously via Inngest
- API routes create `AiTask` records and return immediately
- Frontend polls for task completion via Server-Sent Events (SSE)

**Data Isolation:**

- Every query scoped by `user_id` to prevent data leakage
- Profile data gated behind `parsed_resume_confirmed_at` check
- Application ownership validated on every mutation

**Rate Limiting:**

- OpenAI: 60 requests/minute per user (in-memory token bucket)
- Adzuna: 25/min, 250/day, 1000/week, 2500/month (database-tracked)

---

## 3. Complete User Journey

### 3.1 Signup & Authentication

**Flow:**

1. User visits landing page (`/`)
2. Clicks "Get Started Free" → redirects to `/api/auth/signup`
3. Auth0 handles authentication (email/password or Google OAuth)
4. Auth0 callback creates/finds `User` record in database
5. Post-login hook (`/api/auth/post-login`) checks if user has profile
6. New users redirected to `/onboarding/basics`
7. Returning users redirected to `/dashboard`

**Database Changes:**

```typescript
// On first login
User {
  id: cuid()
  auth0_id: "auth0|123..."
  email: "user@example.com"
  created_at: now()
}
```

### 3.2 Onboarding (4 Steps)

#### Step 1: Basic Information (`/onboarding/basics`)

**Purpose:** Collect core profile data

**Fields:**

- Full Name
- School
- Major
- Graduation Year (dropdown: current year through +4 years)

**Validation:**

- All fields required
- Graduation year must be current or future

**API:** `POST /api/profile/basics`

**Database:**

```typescript
Profile {
  user_id: "user_123"
  full_name: "Jane Smith"
  school: "MIT"
  major: "Computer Science"
  graduation_year: 2025
}
```

#### Step 2: Job Preferences (`/onboarding/preferences`)

**Purpose:** Understand job search criteria for fit scoring

**Fields:**

- Job Types (multi-select): Internship, Full-Time, Part-Time, Contract
- Preferred Locations (multi-select): Cities or "Remote"

**Validation:**

- At least one job type required
- At least one location required

**API:** `POST /api/profile/preferences`

**Database:**

```typescript
Profile {
  job_types: ["INTERNSHIP", "FULL_TIME"]
  preferred_locations: ["San Francisco, CA", "Remote"]
}
```

#### Step 3: Resume Upload (`/onboarding/resume-upload`)

**Purpose:** Upload and parse resume for AI features

**Flow:**

1. User selects PDF or DOCX file (max 5MB)
2. Frontend generates presigned S3 upload URL (`POST /api/resume/upload`)
3. File uploaded directly to S3 from browser
4. Backend extracts text from PDF/DOCX (server-side)
5. OpenAI parses resume text → structured JSON (`gpt-4o-mini`)
6. Parsed data saved to `Profile.parsed_resume`

**Prompt:** `prompts/resume/parse-v1.md`

**Parsed Resume Structure:**

```typescript
{
  personal: {
    name: string
    email: string
    phone: string
    location: string
    linkedin: string
    github: string
    website: string
  }
  education: [{
    school: string
    degree: string
    major: string
    graduationDate: string
    gpa: string
  }]
  experience: [{
    title: string
    company: string
    location: string
    startDate: string
    endDate: string
    current: boolean
    bullets: string[]
  }]
  projects: [{
    name: string
    description: string
    technologies: string[]
    url: string
  }]
  skills: {
    languages: string[]
    frameworks: string[]
    tools: string[]
    other: string[]
  }
  certifications: [{
    name: string
    issuer: string
    date: string
  }]
}
```

**Database:**

```typescript
Profile {
  resume_file_url: "s3://bucket/resumes/user_123/1234567890-resume.pdf"
  resume_file_name: "resume.pdf"
  resume_uploaded_at: "2024-01-15T10:30:00Z"
  parsed_resume: { /* JSON above */ }
}
```

#### Step 4: Resume Review (`/onboarding/resume-review`)

**Purpose:** User confirms/edits parsed resume data

**Flow:**

1. Display parsed resume in editable form
2. User can edit any field
3. User clicks "Confirm Resume"
4. Sets `parsed_resume_confirmed_at` timestamp (CRITICAL for AI features)

**Why Confirmation is Critical:**

- All AI features check `parsed_resume_confirmed_at` before running
- Ensures user has reviewed and approved data quality
- Legal/ethical consideration: user consent for AI processing

**API:** `POST /api/resume/confirm`

**Database:**

```typescript
Profile {
  parsed_resume_confirmed_at: "2024-01-15T10:35:00Z"
  skills: ["Python", "React", "Node.js", "AWS"] // Extracted from parsed_resume
}
```

**Post-Onboarding:**
User redirected to `/dashboard`

---

### 3.3 Job Tracking & Management

#### Adding a Job (Manual Entry)

**UI:** `/jobs/new` (form page)

**Fields:**

- Job Title (required)
- Company (required)
- Location (optional)
- Job Source (dropdown: LinkedIn, Indeed, Glassdoor, etc.)
- Job URL (optional)
- Job Description (required, textarea)

**Flow:**

1. User fills form and submits
2. `POST /api/jobs` creates `Job` and `Application` records
3. Automatically triggers job scoring (Inngest event)
4. User redirected to `/jobs/[id]` to see results

**Database Transaction:**

```typescript
// Atomic creation
Job {
  id: "job_123"
  user_id: "user_123"
  title: "Software Engineer Intern"
  company: "Google"
  location: "Mountain View, CA"
  job_source: "LINKEDIN"
  job_url: "https://..."
  job_description_raw: "We are looking for..."
}

Application {
  id: "app_123"
  user_id: "user_123"
  job_id: "job_123"
  status: "PLANNED"
  score_count: 1 // Initial scoring doesn't count toward usage
}

ActivityLog {
  user_id: "user_123"
  application_id: "app_123"
  type: "JOB_CREATED"
}
```

#### Job Discovery (Adzuna Integration)

**UI:** `/jobs/search` (search interface)

**Flow:**

1. User enters search criteria:
   - Keywords (what)
   - Location (where)
   - Salary minimum
   - Job type filters (full-time, part-time)
2. Frontend calls `POST /api/jobs/search`
3. Backend calls Adzuna API with rate limit check
4. Results cached for 1 hour (`AdzunaSearchCache`)
5. User can "Save Job" from search results
6. Creates `Job` + `Application` with `adzuna_id` reference

**Saved Searches:**

- Users can save search queries
- Scheduled to run daily/weekly/monthly
- New jobs trigger notifications
- Managed via `SavedSearch` model

---

### 3.4 Dashboard Experience

**URL:** `/dashboard`

**Key Sections:**

1. **Welcome Header**
   - Greeting with user's first name
   - Current usage stats (fit assessments, resumes, cover letters)

2. **Application Stats**
   - Total applications
   - By status: Planned, Applied, Interview, Offer, Rejected
   - By fit bucket: Excellent, Good, Fair, Poor

3. **Recent Activity Timeline**
   - Last 10 activities across all applications
   - Types: job created, scored, status changed, documents generated

4. **Quick Actions**
   - Add New Job (modal)
   - Search Jobs (Adzuna)
   - View All Applications

**Data Loading:**

```typescript
// lib/dashboard-stats.ts calculates aggregates
{
  total: 15,
  byStatus: { PLANNED: 8, APPLIED: 5, INTERVIEW: 2 },
  byFitBucket: { EXCELLENT: 3, GOOD: 7, FAIR: 4, POOR: 1 }
}
```

---

## 4. Data Models & Database Schema

### 4.1 Core Models

#### User

```prisma
model User {
  id           String   @id @default(cuid())
  auth0_id     String   @unique
  email        String   @unique
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  Profile      Profile?
  AiTask       AiTask[]
  Application  Application[]
  Job          Job[]
  Project      Project[]
  ActivityLog  ActivityLog[]
  SavedSearch  SavedSearch[]
  Notification Notification[]
}
```

**Relationships:**

- 1:1 with Profile
- 1:Many with Jobs, Applications, Projects, etc.

**Indexes:**

- `auth0_id` (unique, for login lookup)
- `email` (unique, for email lookup)

---

#### Profile

```prisma
model Profile {
  id                         String    @id @default(cuid())
  user_id                    String    @unique

  // Basic info
  full_name                  String?
  school                     String?
  major                      String?
  graduation_year            Int?

  // Resume
  resume_file_url            String?
  resume_file_name           String?
  resume_uploaded_at         DateTime?
  resume_deleted_at          DateTime?
  parsed_resume              Json?
  parsed_resume_confirmed_at DateTime? // CRITICAL GATE

  // Preferences
  job_types                  String[]
  preferred_locations        String[]
  skills                     String[] @default([])

  User                       User @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

**Key Fields:**

- `parsed_resume_confirmed_at`: Must be non-null for AI features to work
- `skills`: Extracted from parsed resume, authoritative source for matching
- `parsed_resume`: Full structured resume data (JSON)

---

#### Job

```prisma
model Job {
  id                     String   @id @default(cuid())
  user_id                String
  title                  String
  company                String
  location               String?
  job_url                String?
  job_source             JobSource?
  adzuna_id              String?  @unique
  job_description_raw    String   // Original job posting
  job_description_parsed Json?    // Parsed by AI

  Application            Application[]
  User                   User @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

**JobSource Enum:**

```
LINKEDIN | INDEED | GLASSDOOR | HANDSHAKE | COMPANY_WEBSITE | REFERRAL | ADZUNA | OTHER
```

**Parsed Job Description Structure:**

```typescript
{
  required_skills: string[]
  preferred_skills: string[]
  education_required: string
  experience_required: string
  responsibilities: string[]
  qualifications: string[]
  job_type: "INTERNSHIP" | "FULL_TIME" | "PART_TIME" | "CONTRACT"
  level: "ENTRY_LEVEL" | "MID_LEVEL" | "SENIOR"
  domain: string
}
```

---

#### Application

```prisma
model Application {
  id                       String            @id @default(cuid())
  user_id                  String
  job_id                   String
  status                   ApplicationStatus @default(PLANNED)
  score_count              Int               @default(1)
  applied_at               DateTime?

  // Fit assessment results
  fit_bucket               FitBucket?
  fit_score                Float?
  score_explanation        String?
  matching_skills          String[]
  missing_skills           String[]
  missing_required_skills  String[]          @default([])
  missing_preferred_skills String[]          @default([])
  company_research         Json?

  Job                      Job               @relation(fields: [job_id], references: [id], onDelete: Cascade)
  User                     User              @relation(fields: [user_id], references: [id], onDelete: Cascade)
  GeneratedDocument        GeneratedDocument[]
  Note                     Note[]
  AiTask                   AiTask[]
  ActivityLog              ActivityLog[]
}
```

**ApplicationStatus Enum:**

```
PLANNED | APPLIED | INTERVIEW | OFFER | REJECTED
```

**FitBucket Enum:**

```
EXCELLENT (≥0.8) | GOOD (≥0.6) | FAIR (≥0.4) | POOR (<0.4)
```

**score_count Logic:**

- Initial scoring: `score_count = 1` (free)
- First re-score: `score_count = 2` (free)
- Additional re-scores: `score_count > 2` (counts toward monthly limit)

---

#### GeneratedDocument

```prisma
model GeneratedDocument {
  id              String       @id @default(cuid())
  application_id  String
  type            DocumentType
  storage_url     String       // S3 key
  display_name    String?
  structured_data Json?        // Generated content (JSON)
  prompt_version  String       // Tracks which prompt was used
  model_used      String       // e.g., "gpt-4o-2024-05-13"
  tokens_used     Int?
  deleted_at      DateTime?    // Soft delete

  Application     Application @relation(fields: [application_id], references: [id], onDelete: Cascade)
}
```

**DocumentType Enum:**

```
RESUME | COVER_LETTER
```

**Display Name Format:**

- Resume: `"[User Name] [Job Title] [Company] [Month] [Year]"`
- Cover Letter: `"[User Name] [Job Title] [Company] Cover Letter [Month] [Year]"`

**Soft Delete:**

- `deleted_at` set when user deletes document
- Not actually removed from S3 (for recovery/auditing)
- Filtered out in queries

---

#### AiTask

```prisma
model AiTask {
  id             String       @id @default(cuid())
  user_id        String
  application_id String?
  type           AiTaskType
  status         AiTaskStatus @default(PENDING)
  result_ref     String?      // Reference to result (e.g., application_id)
  error_message  String?
  created_at     DateTime     @default(now())
  updated_at     DateTime     @updatedAt
  started_at     DateTime?
  completed_at   DateTime?

  Application    Application? @relation(fields: [application_id], references: [id], onDelete: Cascade)
  User           User         @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

**AiTaskType Enum:**

```
JOB_SCORING | RESUME_GENERATION | COVER_LETTER_GENERATION | COMPANY_RESEARCH
```

**AiTaskStatus Enum:**

```
PENDING → RUNNING → SUCCEEDED | FAILED
```

**Lifecycle:**

1. API creates task with `PENDING` status
2. Inngest picks up task, sets to `RUNNING`
3. On completion: `SUCCEEDED` or `FAILED`
4. Frontend polls via SSE to show progress

---

#### UsageTracking

```prisma
model UsageTracking {
  id                 String   @id @default(cuid())
  user_id            String
  month              String   // Format: "2024-01"
  fit_count          Int      @default(0)
  resume_count       Int      @default(0)
  cover_letter_count Int      @default(0)

  @@unique([user_id, month])
}
```

**Monthly Limits:**

- Fit assessments: 200
- Resumes: 30
- Cover letters: 30

**Reset Logic:**

- New month = new `UsageTracking` record
- Old records kept for analytics/billing

---

### 4.2 Supporting Models

#### Project

```prisma
model Project {
  id            String   @id @default(cuid())
  user_id       String
  name          String
  description   String?
  technologies  String[] @default([])
  date_range    String?
  url           String?
  github_link   String?
  display_order Int      @default(0)

  User          User @relation(fields: [user_id], references: [id], onDelete: Cascade)
}
```

**Purpose:** User-managed projects for resume/cover letter generation

**Display Order:** Allows user to prioritize which projects appear first

---

#### ActivityLog

```prisma
model ActivityLog {
  id             String       @id @default(cuid())
  user_id        String
  application_id String?
  type           ActivityType
  metadata       Json?
  created_at     DateTime     @default(now())

  User           User         @relation(fields: [user_id], references: [id], onDelete: Cascade)
  Application    Application? @relation(fields: [application_id], references: [id], onDelete: Cascade)
}
```

**ActivityType Enum:**

```
STATUS_CHANGED | JOB_CREATED | JOB_SCORING_STARTED | JOB_SCORING_COMPLETED |
RESUME_GENERATED | COVER_LETTER_GENERATED | COMPANY_RESEARCH_COMPLETED |
NOTE_ADDED | NOTE_EDITED | DOCUMENT_DELETED | JOB_DISCOVERED |
SEARCH_PERFORMED | SEARCH_SAVED | SAVED_SEARCH_RUN
```

**Purpose:** Audit trail and timeline for dashboard

---

#### SavedSearch

```prisma
model SavedSearch {
  id             String               @id @default(cuid())
  user_id        String
  name           String
  query_config   Json                 // Search parameters
  frequency      SavedSearchFrequency @default(WEEKLY)
  notify_in_app  Boolean              @default(true)
  notify_email   Boolean              @default(true)
  last_run_at    DateTime?
  next_run_at    DateTime?
  user_timezone  String?              @default("America/New_York")
  active         Boolean              @default(true)

  SavedSearchRun SavedSearchRun[]
}
```

**Scheduled Execution:** Inngest cron job runs saved searches

---

## 5. AI Features Deep Dive

### 5.1 Resume Parsing

**Trigger:** User uploads resume in onboarding

**Model:** `gpt-4o-mini-2024-07-18`

**Prompt:** `prompts/resume/parse-v1.md`

**Flow:**

1. User selects file (PDF/DOCX, max 5MB)
2. Frontend requests presigned S3 upload URL (`POST /api/resume/upload`)
3. File uploaded directly to S3
4. Backend extracts text:
   - PDF: Using `pdf-parse` library
   - DOCX: Using `mammoth` library
5. Text sent to OpenAI with structured JSON output
6. Response validated and saved to `Profile.parsed_resume`

**Prompt Strategy:**

```markdown
# Key Instructions:

1. Extract ALL information from resume
2. Use null for missing fields
3. Preserve bullet points exactly as written
4. Categorize skills: languages, frameworks, tools, other
5. Return ONLY valid JSON (no markdown fences)
```

**Temperature:** 0.1 (deterministic extraction)

**Cost:** ~$0.01-0.03 per resume

---

### 5.2 Job Fit Scoring

**Trigger:** Job created OR user requests re-score

**Models:**

- Job parsing: `gpt-4o-mini` (parse job description)
- Fit explanation: `gpt-4o-mini` (generate human explanation)

**Location:** `inngest/functions/job-scoring.ts`

**Multi-Step Process:**

#### Step 1: Parse Job Description

**Prompt:** `prompts/scoring/parse-job-v1.md`

```typescript
// lib/job-parser.ts
parseJobDescription(userId, jobDescription) → ParsedJobDescription {
  required_skills: string[]
  preferred_skills: string[]
  education_required: string
  experience_required: string
  job_type: "INTERNSHIP" | "FULL_TIME" | ...
  level: "ENTRY_LEVEL" | "MID_LEVEL" | "SENIOR"
  domain: string
}
```

**Temperature:** 0.1 (structured extraction)

#### Step 2: Calculate Fit Score (Algorithmic)

**Location:** `lib/fit-scorer.ts`

```typescript
// Scoring Formula
fit_score = skills_score * 0.5 + experience_score * 0.3 + preference_score * 0.2

// Skills Score (0.0 - 0.5)
skills_match_score = (required_matches * 0.8) + (preferred_matches * 0.2)
skills_score = skills_match_score * 0.5

// Experience Score (0.0 - 0.3)
base = 0.15 // Having any experience
+ 0.05 if relevant education
+ 0.05 if relevant experience
+ 0.05 if has projects
= max 0.3

// Preference Score (0.0 - 0.2)
+ 0.1 if job_type matches
+ 0.1 if location matches

// Bucket Mapping
fit_score >= 0.8 → EXCELLENT
fit_score >= 0.6 → GOOD
fit_score >= 0.4 → FAIR
fit_score < 0.4  → POOR
```

**Skills Matching:**

```typescript
// lib/skills-matcher.ts
// Exact match, case-insensitive
normalizeSkill("React") === normalizeSkill("react") // true

// Separate required vs preferred
missing_required_skills = requiredSkills - userSkills
missing_preferred_skills = preferredSkills - userSkills
matching_skills = userSkills ∩ (requiredSkills ∪ preferredSkills)
```

#### Step 3: Generate Explanation (AI)

**Prompt:** `prompts/scoring/explain-fit-v1.md`

```typescript
// lib/fit-explainer.ts
generateFitExplanation(userId, {
  fit_bucket: "GOOD",
  fit_score: 0.72,
  matching_skills: ["Python", "React"],
  missing_required_skills: ["TypeScript"],
  missing_preferred_skills: ["AWS"],
  job_title: "Software Engineer Intern",
  user_major: "Computer Science"
}) → "This is a good match for your background. Your experience with Python and React covers most of the required skills for this role. While you'll want to brush up on TypeScript, your solid foundation and relevant projects make you a competitive candidate."
```

**Temperature:** 0.7 (friendly, encouraging tone)

**Length:** 2-4 sentences

**Tone Guidelines:**

- Start positive
- Acknowledge strengths
- Mention 1-2 gaps without discouragement
- End with actionable suggestion (for FAIR/POOR)

#### Step 4: Save Results

```typescript
// Application updated
{
  fit_bucket: "GOOD",
  fit_score: 0.72,
  score_explanation: "This is a good match...",
  matching_skills: ["Python", "React"],
  missing_required_skills: ["TypeScript"],
  missing_preferred_skills: ["AWS"],
  score_count: 2 // Incremented
}

// Job updated
Job.job_description_parsed = parsedJobDescription
```

**Total Time:** 5-15 seconds

**Cost:** ~$0.02-0.05 per scoring

---

### 5.3 Company Research

**Trigger:** User clicks "Research Company" on job page

**Model:** `gpt-4o-mini-2024-07-18`

**Prompt:** `prompts/research/company-v1.md`

**Location:** `inngest/functions/company-research.ts`

**Flow:**

```typescript
generateCompanyResearch(userId, companyName, jobTitle, jobDescription) → {
  overview: "Brief company summary",
  talking_points: [
    "Recent product launch or news",
    "Company values alignment",
    "Technology stack"
  ],
  things_to_research: [
    "Read latest blog posts",
    "Check Glassdoor reviews",
    "Research leadership team"
  ],
  culture_notes: "What to emphasize in interview"
}
```

**Input Truncation:** Job description limited to 500 chars (avoid token waste)

**Temperature:** 0.5 (balanced creativity/accuracy)

**Use Case:** Interview prep, cover letter personalization

**Limitation:** AI knowledge cutoff (no real-time web search)

---

## 6. Resume & Cover Letter Generation Flow

### 6.1 Resume Generation - Complete Flow

**Trigger:** User clicks "Generate Resume" on job page

**API Endpoint:** `POST /api/ai/resume`

**Complete Step-by-Step Flow:**

#### Step 1: API Request (Client → Server)

```typescript
// Frontend
const response = await fetch('/api/ai/resume', {
  method: 'POST',
  body: JSON.stringify({ applicationId: 'app_123' }),
})
const { taskId } = await response.json()
```

#### Step 2: Create AI Task

**Location:** `app/api/ai/resume/route.ts`

```typescript
// Validate user authentication
const user = await getCurrentUser()

// Create task record (status: PENDING)
const taskId = await createAiTask({
  userId: user.id,
  type: 'RESUME_GENERATION',
  applicationId: 'app_123',
  data: {},
})

// Returns taskId to frontend
return NextResponse.json({ taskId })
```

#### Step 3: Trigger Inngest Event

**Location:** `lib/ai-tasks.ts`

```typescript
// Task created in database
AiTask {
  id: taskId
  user_id: "user_123"
  application_id: "app_123"
  type: "RESUME_GENERATION"
  status: "PENDING"
  created_at: now()
}

// Inngest event sent
await inngest.send({
  name: 'resume/generate',
  data: { taskId, userId, applicationId }
})
```

#### Step 4: Inngest Function Execution

**Location:** `inngest/functions/resume-generation.ts`

**Sub-Steps (Inngest orchestration):**

##### 4a. Check Usage Limit

```typescript
const canProceed = await checkUsageLimit(userId, 'RESUME_GENERATION')
if (!canProceed) {
  // Mark task as FAILED
  throw new Error('Resume generation limit exceeded for this month')
}
```

##### 4b. Mark Task Running

```typescript
await prisma.aiTask.update({
  where: { id: taskId },
  data: {
    status: 'RUNNING',
    started_at: now(),
  },
})
```

##### 4c. Fetch Data

```typescript
const application = await prisma.application.findUnique({
  where: { id: applicationId },
  include: {
    Job: true,
    User: {
      include: {
        Profile: true,
        Project: { orderBy: { display_order: 'asc' } },
      },
    },
  },
})

// Critical validation
if (!application.User.Profile.parsed_resume_confirmed_at) {
  throw new Error('User has not confirmed resume')
}
```

**Data Available at This Point:**

- User's parsed resume (full structure)
- Job details (title, company, description)
- Parsed job description (skills, requirements)
- User's profile skills (authoritative)
- User's projects (ordered)

##### 4d. Generate Resume Content (AI)

**Location:** `lib/resume-generator.ts`

**Prompt:** `prompts/resume/generate-v1.md`

**Model:** `gpt-4o-2024-05-13` (NOT mini - needs quality)

**Temperature:** 0.7 (creative but professional)

**Max Tokens:** 3000

**Timeout:** 45 seconds

**Input Passed to OpenAI:**

```typescript
{
  user_resume: ParsedResume, // Full resume structure
  job: {
    title: "Software Engineer Intern",
    company: "Google",
    description: ParsedJobDescription // Structured, not raw text
  },
  profile_skills: ["Python", "React", "Node.js"], // Authoritative
  user_projects: [
    {
      name: "E-commerce Platform",
      description: "Full-stack web app",
      technologies: ["React", "Node.js", "MongoDB"],
      date_range: "Jan 2024 - Present",
      url: "https://github.com/...",
      github_link: "https://github.com/..."
    }
  ]
}
```

**Prompt Key Instructions:**

```markdown
1. Use profile_skills as authoritative source (not user_resume.skills)
2. Tailor experience bullets to highlight job-matching skills
3. Reorder experiences to put most relevant first
4. Add quantified results where possible
5. Match keywords from job description naturally
6. Keep professional tone - no exaggeration
7. Skills section should prioritize job-required skills
8. Summary should position candidate for THIS role
9. Return ONLY valid JSON
```

**Output Structure:**

```typescript
GeneratedResumeContent {
  summary: "Results-driven Computer Science student with strong Python and React experience...",
  experience: [
    {
      title: "Software Engineering Intern",
      company: "Acme Corp",
      location: "San Francisco, CA",
      dates: "June 2023 - August 2023",
      bullets: [
        "Developed RESTful API using Python and Flask, reducing response time by 40%",
        "Built React dashboard for real-time analytics, serving 10K+ users"
      ]
    }
  ],
  education: [
    {
      degree: "Bachelor of Science in Computer Science",
      school: "MIT",
      graduation: "May 2025",
      gpa: "3.8"
    }
  ],
  skills: {
    technical: ["Python", "React", "Node.js", "AWS"],
    other: ["Agile", "Team Leadership"]
  },
  projects: [
    {
      name: "E-commerce Platform",
      description: "Full-stack web application with user authentication and payment integration",
      technologies: ["React", "Node.js", "MongoDB"]
    }
  ]
}
```

**What Happens Here:**

1. AI analyzes job requirements (from parsed description)
2. Matches user's experience/projects to those requirements
3. Rewords bullets to emphasize relevant skills
4. Creates professional summary targeting this specific role
5. Orders sections to highlight strengths
6. Ensures ATS-friendly formatting (keywords, structure)

##### 4e. Render PDF

**Location:** `lib/pdf/renderer.tsx`

**Template:** `lib/pdf/templates/classic-ats.tsx`

**Library:** `@react-pdf/renderer`

**Flow:**

```typescript
const pdfBuffer = await renderResumePDF(
  generatedContent,
  {
    name: 'Jane Smith',
    email: 'jane@mit.edu',
    phone: '(555) 123-4567',
    location: 'Boston, MA',
  },
  'classic-ats' // Template (only one for now)
)
```

**PDF Structure:**

```
┌─────────────────────────────────────┐
│ JANE SMITH                          │
│ jane@mit.edu • (555) 123-4567 • Boston, MA │
├─────────────────────────────────────┤
│ PROFESSIONAL SUMMARY                │
│ Results-driven Computer Science...  │
├─────────────────────────────────────┤
│ EDUCATION                           │
│ Bachelor of Science in CS           │
│ MIT • May 2025 • GPA: 3.8          │
├─────────────────────────────────────┤
│ EXPERIENCE                          │
│ Software Engineering Intern         │
│ Acme Corp • San Francisco, CA       │
│ June 2023 - August 2023            │
│ • Developed RESTful API...          │
│ • Built React dashboard...          │
├─────────────────────────────────────┤
│ PROJECTS                            │
│ E-commerce Platform                 │
│ • Full-stack web application...     │
│ • Technologies: React, Node.js...   │
├─────────────────────────────────────┤
│ SKILLS                              │
│ Python React Node.js AWS            │
│ Agile Team Leadership               │
└─────────────────────────────────────┘
```

**ATS-Friendly Features:**

- Single column layout
- No tables or complex formatting
- Clear section headers (ALL CAPS)
- Standard fonts (Helvetica)
- No images or graphics
- Proper spacing
- Bullet points (• character)

##### 4f. Upload to S3

```typescript
const key = generateDocumentKey(applicationId, 'resume')
// Example: "documents/app_123/resume-1705324800000.pdf"

await uploadBuffer(key, pdfBuffer, 'application/pdf')
```

**S3 Storage:**

- Bucket: `process.env.AWS_S3_BUCKET`
- Path: `documents/[applicationId]/resume-[timestamp].pdf`
- Private (requires presigned URL for download)

##### 4g. Save Document Record

```typescript
const document = await prisma.generatedDocument.create({
  data: {
    application_id: applicationId,
    type: 'RESUME',
    storage_url: key, // S3 key, not full URL
    display_name: 'Jane Smith Software Engineer Intern Google Jan 2024',
    structured_data: generatedContent, // Full JSON
    prompt_version: 'resume-generate-v1.0.0',
    model_used: 'gpt-4o-2024-05-13',
    tokens_used: null, // Could track this
  },
})
```

**Why Store structured_data:**

- Allows re-rendering PDF with different template
- Debugging (see exactly what AI generated)
- Analytics (track common patterns)

##### 4h. Increment Usage

```typescript
await incrementUsage(userId, 'RESUME_GENERATION')

// UsageTracking updated
{
  user_id: "user_123",
  month: "2024-01",
  resume_count: 3 // Incremented
}
```

##### 4i. Mark Success & Log Activity

```typescript
await prisma.aiTask.update({
  where: { id: taskId },
  data: {
    status: 'SUCCEEDED',
    completed_at: now(),
    result_ref: applicationId,
  },
})

await logActivity({
  user_id: userId,
  application_id: applicationId,
  type: 'RESUME_GENERATED',
  metadata: { document_id: document.id },
})
```

#### Step 5: Frontend Receives Update (SSE)

**Frontend polls task status:**

```typescript
// lib/hooks/use-sse-task.ts
const eventSource = new EventSource(`/api/ai-tasks/stream?taskId=${taskId}`)

eventSource.onmessage = event => {
  const task = JSON.parse(event.data)

  if (task.status === 'SUCCEEDED') {
    // Show success toast
    // Refresh documents list
    eventSource.close()
  }

  if (task.status === 'FAILED') {
    // Show error message
    eventSource.close()
  }
}
```

**User sees:**

1. "Generating resume..." (spinner)
2. After 10-30 seconds: "Resume generated!"
3. Download button appears
4. Document added to list

---

### 6.2 Cover Letter Generation Flow

**Trigger:** User clicks "Generate Cover Letter"

**API:** `POST /api/ai/cover-letter`

**Differences from Resume:**

#### Input to AI

```typescript
{
  user_name: "Jane Smith",
  user_resume: ParsedResume,
  job: {
    title: "Software Engineer Intern",
    company: "Google",
    description: rawJobDescription // Raw text, not parsed
  },
  profile_skills: ["Python", "React"],
  user_projects: [...]
}
```

#### Prompt Strategy

**Prompt:** `prompts/cover-letter/generate-v1.md`

**Model:** `gpt-4o-2024-05-13`

**Temperature:** 0.8 (more creative than resume)

**Max Tokens:** 1500

**Structure:**

```markdown
1. Opening Paragraph
   - Express enthusiasm for specific role
   - Briefly state why you're a strong fit

2. Body Paragraph 1 (Skills & Experience)
   - Highlight 2-3 relevant experiences
   - Connect to job requirements
   - Use specific examples

3. Body Paragraph 2 (Motivation & Fit)
   - Explain interest in company/role
   - Show knowledge of company
   - Emphasize cultural fit

4. Closing Paragraph
   - Reiterate interest
   - Call to action (interview request)
   - Professional close
```

**Guidelines:**

- Length: 250-350 words (3-4 paragraphs)
- Tone: Professional, enthusiastic, confident
- Use "I" statements but focus on value to employer
- Be specific - no generic phrases
- Match energy to company culture
- NO fabrication
- Natural keyword integration

**Output:** Plain text (not JSON)

**Example Output:**

```
I am writing to express my strong interest in the Software Engineer Intern position at Google. With my background in full-stack development and passion for building scalable systems, I am confident I would make a valuable contribution to your team.

During my internship at Acme Corp, I developed RESTful APIs using Python and Flask that reduced response times by 40%, serving over 10,000 users. I also built a React-based analytics dashboard that enabled real-time data visualization for the product team. These experiences have strengthened my ability to write clean, efficient code and collaborate effectively in fast-paced environments.

I am particularly excited about Google's commitment to innovation and its impact on billions of users worldwide. Your focus on developing cutting-edge technologies aligns perfectly with my goal of building products that solve real-world problems at scale. I am eager to bring my technical skills and enthusiasm for learning to contribute to Google's mission.

I would welcome the opportunity to discuss how my experience and passion for technology can contribute to your team. Thank you for considering my application.
```

#### PDF Rendering

**Location:** `lib/pdf/renderer.tsx` (renderCoverLetterPDF)

**Structure:**

```
┌─────────────────────────────────────┐
│ Jane Smith                          │
│ jane@mit.edu • (555) 123-4567      │
├─────────────────────────────────────┤
│ January 15, 2024                   │
│                                     │
│ Hiring Manager                      │
│ Google                              │
│                                     │
│ I am writing to express my strong  │
│ interest in the Software Engineer   │
│ Intern position at Google. With my  │
│ background in full-stack...         │
│                                     │
│ [Full letter body]                  │
│                                     │
│ Sincerely,                          │
│ Jane Smith                          │
└─────────────────────────────────────┘
```

**Differences from Resume PDF:**

- Simpler layout (just text)
- Includes date
- Includes recipient ("Hiring Manager\n[Company]")
- Auto-adds signature line

**Total Time:** 8-20 seconds

**Cost:** ~$0.03-0.05 per cover letter

---

### 6.3 Data Flow Diagram

```
┌─────────────┐
│   Frontend  │
│  (User clicks │
│  "Generate   │
│   Resume")   │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│  POST /api/ai/resume │
│  ─────────────────── │
│  1. Validate auth    │
│  2. Check usage limit│
│  3. Create AiTask    │
│  4. Trigger Inngest  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Inngest: resume-generation      │
│  ──────────────────────────────  │
│  STEP 1: Check usage (30/month)  │
│  STEP 2: Mark task RUNNING       │
│  STEP 3: Fetch application +     │
│          job + profile + projects│
│  STEP 4: Call OpenAI (generate   │
│          content)                 │
│          ↓                        │
│          Input:                   │
│          - User resume (parsed)   │
│          - Job (parsed)           │
│          - Profile skills         │
│          - Projects               │
│          ↓                        │
│          Output: GeneratedResume  │
│          Content (JSON)           │
│  STEP 5: Render PDF (@react-pdf) │
│  STEP 6: Upload to S3             │
│  STEP 7: Save GeneratedDocument   │
│  STEP 8: Increment usage          │
│  STEP 9: Mark task SUCCEEDED      │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Database Updated    │
│  ────────────────── │
│  AiTask.status =     │
│    SUCCEEDED         │
│  UsageTracking.      │
│    resume_count++    │
│  GeneratedDocument   │
│    created           │
│  ActivityLog entry   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  Frontend (SSE)      │
│  ────────────────── │
│  Poll /api/ai-tasks/ │
│  stream?taskId=...   │
│  → Receive update    │
│  → Show success      │
│  → Display download  │
│     button           │
└──────────────────────┘
```

---

## 7. Integration Points

### 7.1 Auth0

**Purpose:** User authentication & session management

**Implementation:** `lib/auth0.ts`

**Configuration:**

```typescript
const auth0 = initAuth0({
  secret: process.env.AUTH0_SECRET,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  baseURL: process.env.AUTH0_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
})
```

**Login Flow:**

1. User visits `/api/auth/login`
2. Redirected to Auth0 hosted login page
3. User authenticates (email/password or Google)
4. Auth0 redirects to `/api/auth/callback`
5. Session cookie set (encrypted)
6. Post-login hook calls `/api/auth/post-login`
7. User record created/fetched from database
8. Redirect to dashboard or onboarding

**Session Management:**

```typescript
// lib/auth.ts
const session = await auth0.getSession()
// session.user.sub → auth0_id
// session.user.email → email

const user = await getCurrentUser()
// Fetches from database using auth0_id
```

**Logout:**

- Clears session cookie
- Redirects to Auth0 logout
- Auth0 redirects back to landing page

---

### 7.2 OpenAI API

**Purpose:** All AI features (parsing, scoring, generation)

**Implementation:** `lib/openai.ts`

**Client Setup:**

```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 2,
  timeout: 30000, // 30 seconds default
})
```

**Model Pinning:**

```typescript
const MODELS = {
  GPT4O: 'gpt-4o-2024-05-13', // High-quality generation
  GPT4O_MINI: 'gpt-4o-mini-2024-07-18', // Fast/cheap parsing
}
```

**Rate Limiting:**

```typescript
// In-memory token bucket
class RateLimiter {
  maxTokens: 60 // 60 requests
  refillRate: 1 // 1 per second (60/minute)
}

// Per-user limiters
const userLimiters = new Map<string, RateLimiter>()
```

**Wrapper Function:**

```typescript
async function callOpenAI<T>(
  userId: string,
  fn: () => Promise<T>,
  options: { timeout?: number }
): Promise<T> {
  // 1. Check rate limit
  const limiter = getUserRateLimiter(userId)
  if (!(await limiter.removeTokens(1))) {
    throw new Error('Rate limit exceeded')
  }

  // 2. Execute with timeout
  return Promise.race([
    fn(),
    new Promise((_, reject) => setTimeout(() => reject('Timeout'), timeout)),
  ])
}
```

**Error Handling:**

- 429 (rate limit): Throw specific error
- 5xx (OpenAI issues): Retry with exponential backoff
- Timeout: Fail fast after timeout
- JSON parsing: Validate and throw if invalid

**Cost Tracking:**

- Could track tokens_used in GeneratedDocument
- Currently not implemented

---

### 7.3 AWS S3

**Purpose:** File storage (resumes, generated PDFs)

**Implementation:** `lib/s3.ts`

**Client Setup:**

```typescript
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})
```

**File Upload Flow (Resume):**

```typescript
// 1. Frontend requests presigned URL
POST /api/resume/upload
→ generateUploadUrl(key, contentType, expiresIn: 300)
→ Returns: "https://s3.amazonaws.com/bucket/key?signature=..."

// 2. Frontend uploads directly to S3
PUT [presigned URL]
Body: File (Blob)
→ No backend involvement (saves bandwidth)

// 3. Backend notified of upload
→ File URL stored in Profile.resume_file_url
```

**File Download Flow (Generated Document):**

```typescript
// User clicks "Download" on document
GET /api/documents/[id]/download

// Backend generates presigned URL (15 min expiry)
const url = await generateDownloadUrl(document.storage_url, 900)

// Redirect to presigned URL
→ Browser downloads PDF directly from S3
```

**Direct Upload (Generated Documents):**

```typescript
// Backend generates PDF buffer
const buffer = await renderResumePDF(...)

// Upload directly to S3
await uploadBuffer(key, buffer, 'application/pdf')
```

**S3 Structure:**

```
bucket/
├── resumes/
│   └── [user_id]/
│       └── [timestamp]-[filename].pdf
└── documents/
    └── [application_id]/
        ├── resume-[timestamp].pdf
        └── cover-letter-[timestamp].pdf
```

**Security:**

- All files private (no public URLs)
- Access via presigned URLs only
- URLs expire (5min upload, 15min download)

---

### 7.4 Adzuna API

**Purpose:** Job search and discovery

**Implementation:** `lib/adzuna.ts`

**Configuration:**

```typescript
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY
const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs/us'
```

**Rate Limits:**

```typescript
const RATE_LIMITS = {
  PER_MINUTE: 25,
  PER_DAY: 250,
  PER_WEEK: 1000,
  PER_MONTH: 2500,
}
```

**Rate Limit Tracking:**

```prisma
model AdzunaRequestLog {
  request_type: 'SEARCH' | 'DETAILS'
  status_code: Int?
  rate_limited: Boolean
  created_at: DateTime
}
```

**Search Flow:**

```typescript
// 1. Check rate limits (database query)
const canMake = await canMakeAdzunaRequest()
if (!canMake.allowed) {
  throw new Error(canMake.reason)
}

// 2. Build URL
const url = buildAdzunaUrl('search/1', {
  what: 'software engineer',
  where: 'san francisco',
  results_per_page: 10,
  sort_by: 'date',
})

// 3. Make request
const response = await fetch(url)

// 4. Log request
await logAdzunaRequest('SEARCH', response.status)

// 5. Parse and validate response (Zod)
const data = AdzunaSearchResponseSchema.parse(await response.json())

return data.results
```

**Caching:**

```prisma
model AdzunaSearchCache {
  cache_key: String   @unique
  results: Json
  expires_at: DateTime
}
```

**Cache Strategy:**

- Cache key: hash of search parameters
- TTL: 1 hour
- Reduces API calls for common searches

**Saved Searches:**

- User can save search criteria
- Scheduled cron job runs searches
- New jobs trigger notifications
- Stored in `SavedSearch` model

---

### 7.5 Inngest

**Purpose:** Background job orchestration

**Implementation:** `lib/inngest.ts`

**Client Setup:**

```typescript
const inngest = new Inngest({
  id: 'klevr-app',
  eventKey: process.env.INNGEST_EVENT_KEY,
})
```

**Function Registration:**

```typescript
// inngest/functions/index.ts
export const functions = [
  jobScoringFunction,
  resumeGenerationFunction,
  coverLetterGenerationFunction,
  companyResearchFunction,
  runSavedSearchesFunction,
]
```

**Event Triggering:**

```typescript
// From API route
await inngest.send({
  name: 'resume/generate',
  data: { taskId, userId, applicationId },
})
```

**Function Definition:**

```typescript
export const resumeGenerationFunction = inngest.createFunction(
  {
    id: 'resume-generation',
    name: 'Generate Tailored Resume',
    retries: 2 // Auto-retry on failure
  },
  { event: 'resume/generate' },
  async ({ event, step }) => {
    // Each step is retryable independently
    const data = await step.run('fetch-data', async () => {
      return prisma.application.findUnique(...)
    })

    const content = await step.run('generate-content', async () => {
      return generateResumeContent(...)
    })

    // ... more steps
  }
)
```

**Benefits:**

- Automatic retries
- Step-based execution (granular recovery)
- Timeout handling
- Event replay (debugging)
- Async processing (don't block API)

**Dashboard:**

- Inngest Cloud shows all runs
- View logs, errors, execution times
- Replay failed events

---

## 8. File Structure & Organization

### 8.1 Directory Overview

```
klevr/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (main)/            # Main app (dashboard, jobs, profile)
│   ├── (onboarding)/      # Onboarding flow (4 steps)
│   ├── api/               # API routes
│   ├── auth/callback/     # Auth0 callback
│   └── layout.tsx         # Root layout
│
├── components/            # React components
│   ├── ui/               # shadcn/ui base components
│   ├── forms/            # Form components
│   ├── jobs/             # Job-related components
│   └── layout/           # Sidebar, navbar
│
├── lib/                   # Business logic
│   ├── pdf/              # PDF generation
│   │   ├── renderer.tsx
│   │   └── templates/
│   ├── hooks/            # React hooks
│   ├── auth.ts           # Auth helpers
│   ├── openai.ts         # OpenAI client
│   ├── s3.ts             # S3 operations
│   ├── prisma.ts         # Database client
│   ├── resume-parser.ts
│   ├── resume-generator.ts
│   ├── cover-letter-generator.ts
│   ├── job-parser.ts
│   ├── fit-scorer.ts
│   ├── skills-matcher.ts
│   ├── fit-explainer.ts
│   ├── company-researcher.ts
│   ├── usage.ts
│   ├── ai-tasks.ts
│   ├── activity-log.ts
│   ├── adzuna.ts
│   └── ...
│
├── inngest/               # Background jobs
│   ├── client.ts
│   └── functions/
│       ├── job-scoring.ts
│       ├── resume-generation.ts
│       ├── cover-letter-generation.ts
│       ├── company-research.ts
│       └── run-saved-searches.ts
│
├── prompts/               # AI prompts (versioned)
│   ├── resume/
│   │   ├── parse-v1.md
│   │   └── generate-v1.md
│   ├── cover-letter/
│   │   └── generate-v1.md
│   ├── scoring/
│   │   ├── parse-job-v1.md
│   │   └── explain-fit-v1.md
│   └── research/
│       └── company-v1.md
│
├── prisma/
│   └── schema.prisma      # Database schema
│
├── .claude/               # Claude AI instructions
│   └── skills/
│
├── CLAUDE.md              # Quick reference
├── DESIGN-REQUIREMENTS.md # Design system
└── ARCHITECTURE.md        # This file
```

### 8.2 Key File Responsibilities

**Core Libraries:**

- `lib/openai.ts` - OpenAI client with rate limiting
- `lib/s3.ts` - S3 file operations
- `lib/prisma.ts` - Database client
- `lib/auth.ts` - Authentication helpers

**AI Generators:**

- `lib/resume-parser.ts` - Parse resume text → JSON
- `lib/resume-generator.ts` - Generate tailored resume content
- `lib/cover-letter-generator.ts` - Generate cover letter
- `lib/job-parser.ts` - Parse job description → structured data
- `lib/company-researcher.ts` - Generate company research

**Scoring System:**

- `lib/fit-scorer.ts` - Calculate fit score (algorithmic)
- `lib/skills-matcher.ts` - Match user skills to job requirements
- `lib/fit-explainer.ts` - Generate human-friendly explanation (AI)

**Usage & Tracking:**

- `lib/usage.ts` - Monthly usage limits
- `lib/activity-log.ts` - Application timeline
- `lib/ai-tasks.ts` - Create and manage AI tasks

**PDF Generation:**

- `lib/pdf/renderer.tsx` - Render functions
- `lib/pdf/templates/classic-ats.tsx` - Resume template

**Background Jobs:**

- `inngest/functions/job-scoring.ts` - Full scoring pipeline
- `inngest/functions/resume-generation.ts` - Resume generation pipeline
- `inngest/functions/cover-letter-generation.ts` - Cover letter pipeline
- `inngest/functions/company-research.ts` - Research pipeline

---

## 9. Current Limitations & Pain Points

### 9.1 Resume/Cover Letter Generation Limitations

#### Input Data Quality Issues

**Problem:** AI output quality depends on parsed resume accuracy

**Current Issues:**

- PDF parsing can miss formatting (tables, columns)
- Bullet points sometimes concatenated
- Dates inconsistently formatted
- Skills categorization (languages vs frameworks) arbitrary

**Impact:**

- Generated resumes may have outdated information
- Skills mismatch if parsing failed
- Experience bullets less impactful if original bullets poorly written

**Potential Solutions:**

1. **Better PDF parsing** (use OCR for scanned PDFs)
2. **User validation UI** (highlight low-confidence extractions)
3. **Manual skill tagging** (let users categorize skills)
4. **Resume builder** (avoid parsing entirely - build from scratch)

---

#### Limited Context for Tailoring

**Problem:** AI only has:

- User's resume (static snapshot)
- Job description (often vague)
- No knowledge of:
  - User's actual project code quality
  - User's communication style
  - Specific achievements beyond bullets
  - Company culture details

**Impact:**

- Generic "tailoring" (keyword matching, not deep customization)
- Cover letters lack personal touch
- May not emphasize user's unique strengths

**Potential Solutions:**

1. **User interviews** (ask about projects, achievements)
2. **Portfolio integration** (analyze GitHub repos, LinkedIn)
3. **Feedback loop** (learn from successful applications)
4. **Company research integration** (web scraping/API for culture)

---

#### Single Template Limitation

**Problem:** Only one resume template (`classic-ats`)

**Current State:**

- All resumes look the same
- No customization for industry (tech vs finance)
- No visual differentiation

**Impact:**

- Users can't express personality
- May not match company expectations
- Limited appeal for creative roles

**Potential Solutions:**

1. **Multiple templates** (modern, creative, executive)
2. **Template selector** (user chooses before generation)
3. **Industry-specific templates** (tech, finance, design)
4. **Custom branding** (colors, fonts - still ATS-safe)

---

#### No Iterative Refinement

**Problem:** Generate → Download (one-shot process)

**Current Limitations:**

- Can't ask AI to "make it more technical"
- Can't regenerate with different emphasis
- No A/B testing of versions

**Impact:**

- User stuck with first generation
- May need multiple attempts (uses monthly limit)
- No learning from user preferences

**Potential Solutions:**

1. **Regeneration with instructions** ("emphasize leadership")
2. **Section-level editing** (regenerate just summary)
3. **Version history** (save all attempts, compare)
4. **AI chat interface** (iterative conversation about resume)

---

### 9.2 Fit Scoring Limitations

#### Exact String Matching Only

**Problem:** Skills matcher uses exact case-insensitive match

```typescript
normalizeSkill('React') === normalizeSkill('react') // ✅ Match
normalizeSkill('React') === normalizeSkill('ReactJS') // ❌ No match
normalizeSkill('Node.js') === normalizeSkill('NodeJS') // ❌ No match
```

**Impact:**

- False negatives (user has skill, not detected)
- Inconsistent job descriptions penalized
- Synonyms not recognized

**Potential Solutions:**

1. **Fuzzy matching** (Levenshtein distance)
2. **Skill ontology** (React = ReactJS = React.js)
3. **Embedding similarity** (semantic matching via OpenAI)
4. **User skill aliases** (let users define equivalents)

---

#### No Experience Level Weighting

**Problem:** 6 months React experience = 3 years React experience

**Current Scoring:**

- Boolean match (have skill or don't)
- No consideration of proficiency
- No weighting by recency

**Impact:**

- Overestimates fit for junior roles
- Doesn't differentiate senior candidates
- Ignores skill decay (old skills)

**Potential Solutions:**

1. **Experience duration** (extract years from bullets)
2. **Recency weighting** (recent experience valued higher)
3. **Proficiency levels** (beginner, intermediate, expert)
4. **Project complexity** (simple CRUD vs distributed systems)

---

#### Static Scoring Formula

**Problem:** Hardcoded weights (50% skills, 30% experience, 20% preference)

```typescript
fit_score = skills_score * 0.5 + experience_score * 0.3 + preference_score * 0.2
```

**Limitations:**

- One-size-fits-all approach
- Doesn't adapt to job type (internship vs senior)
- No learning from user feedback

**Impact:**

- May not align with user's priorities
- Scores don't improve over time
- No personalization

**Potential Solutions:**

1. **User-adjustable weights** (prioritize skills vs culture fit)
2. **Job-type-specific formulas** (internships weight education higher)
3. **ML model** (learn from applications → outcomes)
4. **Feedback integration** ("This was a good fit" → retrain)

---

### 9.3 Company Research Limitations

#### No Real-Time Data

**Problem:** OpenAI has knowledge cutoff (Jan 2025)

**Cannot Access:**

- Recent news/funding rounds
- Latest product launches
- Current job openings
- Glassdoor reviews

**Impact:**

- Research is generic/outdated
- Talking points may be irrelevant
- Missing recent developments

**Potential Solutions:**

1. **Web scraping** (company news, blog)
2. **API integrations** (Clearbit, Crunchbase)
3. **Bing/Google Search API** (get latest results)
4. **User-provided links** (paste recent article)

---

#### Surface-Level Insights

**Problem:** Research is based solely on job description + company name

**Shallow Output:**

- Generic values ("innovation", "collaboration")
- Obvious talking points ("mention their products")
- No competitive analysis

**Impact:**

- Doesn't differentiate candidate
- May not match actual culture
- Limited interview prep value

**Potential Solutions:**

1. **Deep research mode** (analyze multiple sources)
2. **Competitor comparison** (how does X compare to Y)
3. **Cultural fit analysis** (values alignment)
4. **Interview question prediction** (common questions for role)

---

### 9.4 System Architecture Pain Points

#### Synchronous Resume Parsing

**Problem:** Resume parsing happens in API route (blocking)

**Current Flow:**

```
User uploads → API extracts text → Calls OpenAI → Waits 5-15s → Returns
```

**Issues:**

- User waits for full parsing
- No progress indication
- Timeouts on large resumes
- Can't close tab during upload

**Potential Solutions:**

1. **Async parsing** (Inngest job)
2. **Progress updates** (SSE stream)
3. **Background upload** (let user continue onboarding)
4. **Client-side extraction** (WebAssembly PDF parser)

---

#### No Error Recovery for Failed Generations

**Problem:** If resume generation fails mid-process:

- Task marked FAILED
- No partial results saved
- User must retry from scratch

**Lost Work:**

- OpenAI call succeeded (paid) but PDF rendering failed
- S3 upload succeeded but DB save failed

**Potential Solutions:**

1. **Step-level persistence** (save intermediate results)
2. **Resume from failure** (retry from last successful step)
3. **Partial results** (save AI output even if PDF fails)
4. **Idempotent steps** (retry without duplicate work)

---

#### Rate Limiting Gaps

**Problem:** Current rate limiting is user-level only

**Not Protected:**

- Global OpenAI rate limits (org-level)
- S3 upload bandwidth
- Database connection pool

**Potential Issues:**

- One user could exhaust OpenAI quota
- Mass uploads could saturate S3
- Connection pool exhaustion

**Potential Solutions:**

1. **Global rate limiter** (Redis-based)
2. **Queue system** (BullMQ for job ordering)
3. **Backpressure** (reject requests when overloaded)
4. **Usage analytics** (alert on abnormal patterns)

---

### 9.5 User Experience Gaps

#### No Document Editing

**Problem:** Generated documents are immutable

**User Cannot:**

- Edit summary after generation
- Fix typos in bullet points
- Reorder sections
- Remove irrelevant experiences

**Impact:**

- Must regenerate entire document for small changes
- Wastes monthly generation limit
- Frustrating for minor tweaks

**Potential Solutions:**

1. **WYSIWYG editor** (edit structured data)
2. **Section regeneration** (just redo summary)
3. **Template overlays** (edit PDF metadata)
4. **Export to Word** (let user edit externally)

---

#### No Application Outcome Tracking

**Problem:** System doesn't track application results

**Missing Data:**

- Did user get interview?
- Were they hired?
- What was fit score accuracy?

**Impact:**

- No feedback loop for AI
- Can't validate fit scoring
- No success metrics

**Potential Solutions:**

1. **Outcome tracking** (add "got interview" field)
2. **Success analytics** (EXCELLENT fit → interview rate)
3. **Retrospective analysis** (compare scores to outcomes)
4. **Model retraining** (improve fit scoring over time)

---

#### Limited Job Discovery

**Problem:** Adzuna is only job source

**Limitations:**

- US jobs only
- No LinkedIn/Indeed scraping
- Rate limits restrict discovery

**Impact:**

- Users must manually paste most jobs
- Saved searches hit API limits quickly
- International students excluded

**Potential Solutions:**

1. **Multi-source aggregation** (LinkedIn, Indeed, Glassdoor)
2. **Web scraping** (company career pages)
3. **API partnerships** (integrate with job boards)
4. **User job boards** (share discovered jobs)

---

### 9.6 Specific Technical Debt

#### Hardcoded Prompt Versions

**Problem:** Prompt versions stored as strings in code

```typescript
prompt_version: 'resume-generate-v1.0.0' // Hardcoded
```

**Issues:**

- Must redeploy to update prompts
- No A/B testing of prompts
- Can't rollback bad prompts
- Version mismatches possible

**Potential Solutions:**

1. **Database-stored prompts** (version control in DB)
2. **Git-based versioning** (load from file with hash)
3. **Feature flags** (gradual rollout of new prompts)
4. **A/B testing framework** (compare prompt variants)

---

#### No Telemetry on AI Quality

**Problem:** Don't track AI output quality

**Unknown Metrics:**

- How often does parsing fail?
- What's average resume quality?
- Do users download generated docs?

**Impact:**

- Can't measure improvements
- Don't know where to optimize
- No alerting on quality degradation

**Potential Solutions:**

1. **Quality scores** (user rates generated docs 1-5)
2. **Download tracking** (measure engagement)
3. **Validation checks** (catch malformed outputs)
4. **Error categorization** (parse errors vs generation errors)

---

## 10. Recommendations for Improvement

### 10.1 Immediate Wins (Low Effort, High Impact)

1. **Fuzzy skill matching** (Levenshtein distance)
   - Effort: 4 hours
   - Impact: Significantly improve fit scoring accuracy

2. **Multiple resume templates**
   - Effort: 8 hours (create 2-3 templates)
   - Impact: User satisfaction, differentiation

3. **Document download tracking**
   - Effort: 2 hours
   - Impact: Understand which features are valuable

4. **Better error messages**
   - Effort: 4 hours
   - Impact: Reduce user confusion on failures

5. **Resume parsing validation UI**
   - Effort: 8 hours
   - Impact: Catch parsing errors before AI generation

---

### 10.2 Medium-Term Improvements (2-4 weeks)

1. **Iterative document refinement**
   - AI chat interface for resume editing
   - Regenerate specific sections
   - Version comparison

2. **Enhanced company research**
   - Web scraping integration
   - API partnerships (Clearbit, etc.)
   - Deeper cultural analysis

3. **Skill ontology & synonyms**
   - Comprehensive skill mapping
   - Industry-specific taxonomies
   - User-defined aliases

4. **Outcome tracking & analytics**
   - Interview/offer rate by fit bucket
   - Validate scoring formula
   - Personalized recommendations

---

### 10.3 Long-Term Vision (3-6 months)

1. **ML-based fit scoring**
   - Train model on application outcomes
   - Personalized scoring per user
   - Adaptive weights

2. **Resume builder (no parsing)**
   - Build resume from scratch in app
   - Rich editing experience
   - Avoid parsing errors entirely

3. **Multi-job application workflows**
   - Batch apply to similar jobs
   - Reuse tailored content
   - Track application pipeline

4. **Community features**
   - Share successful resumes (anonymized)
   - Crowdsourced job discovery
   - Peer review of documents

---

## Conclusion

Klevr is a sophisticated AI-powered career assistant with a well-architected tech stack. The system successfully automates resume tailoring and fit assessment, but has room for improvement in:

1. **AI Quality:** Better prompts, iterative refinement, context enrichment
2. **Fit Scoring:** Semantic matching, experience weighting, personalization
3. **User Experience:** Document editing, multiple templates, outcome tracking
4. **Job Discovery:** Multi-source aggregation, international support

The foundation is solid - now it's about refining the AI outputs and expanding the feature set based on user feedback.

---

**Document Version:** 1.0
**Last Updated:** December 18, 2024
**Maintained By:** Development Team
