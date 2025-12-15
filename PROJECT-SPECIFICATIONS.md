# **Klevr – Full Product Specification**

**Version:** 1.1  
 **Last Updated:** 12/11/2025

---

## **0\. Terminology**

- **Job** – A saved job opportunity (title \+ company \+ description).

- **Application** – The user’s tracked pursuit of a specific Job.

- **Stage / Status** – The Application’s current pipeline status (`PLANNED`, `APPLIED`, `INTERVIEW`, `OFFER`, `REJECTED`).

- **Fit Bucket** – A coarse level for job fit: `EXCELLENT`, `GOOD`, `FAIR`, `POOR`.

- **Cover letter** – Always written in full, no “CL” abbreviation.

Score and fit are **application-level** (Job \+ User Profile), not global per Job.

---

## **1\. Product & Scope**

### **1.1 Project Name & Elevator Pitch**

**Name**  
 Klevr

**Elevator Pitch**  
 Klevr is an AI-powered career assistant that streamlines your path to hired by finding the best-fit roles, custom-tailoring your resume and cover letter, and tracking every application in one intelligent dashboard.

---

### **1.2 Problem & Target User**

**Primary User**  
 College students and early-career job seekers.

**Pain Points**

- Applying to many jobs is confusing, repetitive, and time-consuming.

- Tailoring resumes and cover letters to each role is exhausting.

- Tracking applications, deadlines, and interview stages is scattered across spreadsheets, docs, job boards, and email.

**Klevr’s Solution**

Centralize job opportunities and application status, and use AI to:

- Assess and bucket job fit.

- Tailor resumes and cover letters per job.

- Provide quick company insights for better applications and interviews.

---

### **1.3 Core Value Proposition**

**Magic Moment**

After adding a job (by pasting the description), the user sees:

- A **fit bucket** (e.g., “Excellent Fit”) with a short explanation.

- A new **Application card** in a clear pipeline view.

- One-click actions to generate a tailored resume and cover letter.

Klevr immediately helps them decide **where to focus** and **how to present themselves**.

---

### **1.4 MVP vs Future Scope**

**MVP – Must-Have**

- User profile & resume upload \+ parsing \+ review/edit.

- Manual job add (company, title, description, link, location).

- Job fit assessment (fit buckets \+ explanation, not precise scores).

- Application pipeline with stage tracking (Planned → Applied → Interview → Offer → Rejected).

- AI-generated tailored resumes for specific jobs.

- AI-generated tailored cover letters for specific jobs.

- Company research summaries (LLM-only, light-weight).

- Basic notes for each application.

- Basic bulk operations (multi-select \+ bulk status update).

**Post-MVP (Nice-to-Have)**

- AI-powered job recommendations.

- Interview preparation (practice questions, suggested answers).

- Full conversational AI chatbot for open-ended questions.

- AI strengths & weaknesses analysis.

- Saved filters/views for power users.

- Advanced analytics dashboards.

- Bulk export of applications.

**Explicitly Out of Scope for v1**

- Automatic job scraping via LinkedIn, Indeed, etc.

- Paid subscription plans, payments, and billing.

- Native mobile apps (iOS/Android).

- Browser extensions (e.g., “1-click import from LinkedIn”).

- Real-time collaboration, team accounts, or coach views.

- In-app messaging between users.

- Full interview simulation or live practice.

- General-purpose AI chatbot (v1 only focused AI actions).

- Deep external company data integrations (Clearbit, LinkedIn APIs, etc.).

---

## **2\. UX & Flows**

### **2.1 User Roles**

- **Job Seeker (v1)** – manage profile, jobs, applications, AI generations.

- **Admin (future)** – moderation/support; out of scope for v1.

---

### **2.2 Main User Journeys**

#### **2.2.1 “Zero to First Value” – Onboarding → Setup → Resume Review → First Job**

1. User signs up via email/password or Google (Auth0).

2. On first login, they enter a **guided onboarding flow** with a progress stepper:

   Steps:
   - **Step 1 – Basics:** degree, major, graduation date.

   - **Step 2 – Preferences:** job types (internship, full-time), locations (cities/remote).

   - **Step 3 – Resume Upload:** upload PDF/DOCX or paste text.

   - **Step 4 – Resume Review:**
     - Klevr parses the resume into structured sections (education, experience, skills).

     - User sees an editable view (inline form with grouped sections).

     - User **must confirm** this parsed resume (Save) before job scoring is enabled.

3. After onboarding, user is prompted to **add their first Job**:
   - Paste job description and/or job URL, plus title and company.

   - System creates a Job \+ a linked Application in stage `PLANNED`.

   - AI task is enqueued for **fit assessment**.

4. Within a short time:
   - User sees Application card in pipeline with **fit bucket** (e.g., “Good fit”) and a short explanation.

   - They can click into the job detail and use **Generate tailored resume** / **Generate cover letter** actions.

5. Generated documents become available on the job detail page and pipeline card.

---

#### **2.2.2 Daily Use Flow**

1. User lands on `/dashboard`:
   - Sees pipeline columns (Planned, Applied, Interview, Offer, Rejected).

   - Each card shows job title, company, fit bucket badge, and last updated.

   - Top stat cards:
     - Applications this month

     - Response rate (applied vs responses)

     - Active interviews

2. User filters or searches:
   - By company, stage, or fit bucket.

   - **Filter state is reflected in URL query params** (e.g., `?stage=APPLIED&fit=GOOD`) so views can be bookmarked/shared.

   - Filters persist in local storage across sessions.

3. User opens a Job detail (`/jobs/:id`):
   - See job description (raw and parsed), fit bucket, explanation, and company summary.

   - Use actions:
     - Update stage (dropdown).

     - Generate / regenerate tailored resume or cover letter (with remaining quota indicator).

     - Add notes (e.g., recruiter name, interview dates).

4. User uses bulk operations (in `/jobs`):
   - Multi-select applications from the list.

   - Actions: bulk stage update, bulk archive/delete.

---

#### **2.2.3 Edge Flows**

- **Empty state (no jobs yet):**
  - Message: “You don’t have any applications yet. Add your first job to start tracking.”

  - CTA: “Add your first job”.

- **Resume parsing failure or low confidence:**
  - After upload, if parse fails or confidence threshold not met, user still lands on **Resume Review screen** with partially filled fields and prompts:
    - “We had trouble reading some parts of your resume. Please review and fill in anything missing.”

- **No profile/resume:**
  - Dashboard shows a banner: “We’ll get better recommendations if you complete your profile and resume.” with CTA “Complete profile”.

- **AI generation error (resume/cover letter):**
  - Toast: “We couldn’t generate this right now. Please try again in a few minutes.”

  - UI shows "Failed" status on that AI task with a retry button.

- **Network/API errors:**
  - Toast with a retry button.

  - UI falls back to last known stable state (no infinite spinners).

---

### **2.3 Screens & Pages**

**Auth**

- `/login`

- `/signup`

- `/forgot-password`

**Onboarding**

- `/onboarding/basics`

- `/onboarding/preferences`

- `/onboarding/resume-upload`

- `/onboarding/resume-review` (structured edit \+ confirmation)

**Main App**

- `/dashboard` – pipeline overview \+ stats \+ quota summary.

- `/jobs` – list/table view of jobs/applications with filters, search, and bulk operations.

- `/jobs/new` – add job form/modal.

- `/jobs/:id` – job & application detail (fit, AI docs, notes, company research).

- `/profile` – basic info, preferences, editable parsed resume.

- `/settings/account` – email, password, OAuth connections, account deletion.

- `/settings/notifications` – email notification preferences.

- `/settings/usage` – AI quota/usage dashboard.

**System/Legal**

- `/auth/callback` – Auth0 OAuth callback.

- `/legal/privacy` – privacy policy.

- `/legal/terms` – terms of service.

---

### **2.4 Layout & Navigation**

**Desktop**

- Top navbar: Klevr logo/name and current page title; right side user avatar dropdown (Profile, Usage, Settings, Logout).

- Left sidebar navigation (Lucide icons):
  - Dashboard

  - Jobs

  - Profile

  - Settings

**Mobile**

- Top bar with logo \+ avatar.

- Slide-out hamburger menu for navigation.

- Pipeline and tables collapse into cards, with:
  - For pipeline: stage tabs across the top (Planned, Applied, etc.) instead of horizontal Kanban board.

  - Cards show main job details and actions (update stage, open details, generate docs).

  - No drag-and-drop reordering on mobile; stage changes via dropdown.

---

### **2.5 Key Page Layouts**

**Dashboard (`/dashboard`)**

- Row 1: Stat cards.

- Row 2: Tabbed pipeline view (columns on desktop, tabs on mobile).

- Top filter bar:
  - Stage filter (All / Active only).

  - Fit bucket filter (Excellent/Good/Fair/Poor).

  - Search bar.

- Sidebar or header element showing AI usage:
  - “This month: 12 / 30 resumes · 8 / 30 cover letters.”

---

**Jobs List (`/jobs`)**

- Columns:
  - Job Title

  - Company

  - Stage

  - Fit bucket

  - Last updated

- Controls:
  - Search input (job title or company).

  - Filters: stage, fit bucket, created/applied date.

  - Multi-select checkboxes \+ bulk actions (change stage, delete).

- Query params represent filters and pagination for persistence.

---

**Job Detail (`/jobs/:id`)**

- Header:
  - Job title, company, location.

  - Fit bucket badge (e.g., “Excellent fit”) with tooltip describing why (skills, experience match).

  - Stage dropdown.

- Sections (tabs or stacked):
  - **Job Description** – raw text and parsed structured view.

  - **Fit & Insight** – explanation, matching skills, missing skills, suggestions.

  - **Company Research** – summary \+ bullet talking points.

  - **Documents** – list of GeneratedDocument entries with version and type, “View” and “Download” actions.

  - **Notes** – text area \+ list of notes (date/time stamped).

- Sidebar actions:
  - Generate/Regenerate Resume (with visible remaining quota).

  - Generate/Regenerate Cover Letter (with remaining quota).

---

**Profile (`/profile`)**

- Basic info: full name, school, major, grad year.

- Preferences: job types, preferred locations.

- **Resume section:**
  - Last uploaded file name \+ timestamp.

  - Buttons: “Upload new resume”, “Re-parse”, “Edit parsed resume”.

  - Link to resume review screen (embedded or modal).

---

### **2.6 Mobile UX**

- Full feature set available on mobile for:
  - Viewing pipeline and jobs.

  - Updating stages.

  - Triggering AI generations.

  - Viewing docs (open PDFs via device viewer).

- Adjustments:
  - Pipeline \= stage tabs \+ vertical cards; no drag-and-drop.

  - Bulk operations: not required for v1 mobile; supported on desktop first.

---

## **3\. Visual Design System**

### **3.1 Brand Direction**

- Clean, modern, minimal.

- Student- and early-career-friendly.

- Focus on clarity and reducing anxiety.

  ***

  ### **3.2 Colors**

- **Primary:** `#EEEBD9`

- **Secondary:** `#282427`

- **Accent:**
  - `#EE7B30`

  - `#2292A4`

- **Backgrounds:**
  - Primary (Main UI)

  - Secondary (Rare accent sections)

- **Status Colors:**
  - Error: `#DC2626`

  - Warning: `#F59E0B`

  - Success: `#16A34A`

  ***

  ### **3.3 Typography**

**Heading Font:** Lora

- Weights: 600, 700

- Usage:
  - H1/H2 – weight 700

  - H3/H4, navigation labels – 600

**Body Font:** Open Sans

- Weights: 400, 500, 600

- Usage:
  - Body: 400

  - Labels/table headers: 500

  - Buttons: 600

  ***

  ### **3.4 Type Scale**

- Base font size: 16px

- H1: 32px, line-height \~1.25

- H2: 24px, line-height \~1.3

- H3: 20px, line-height \~1.35

- Body: 16px, line-height \~1.5

- Small text: 14px, line-height \~1.4

  ***

  ### **3.5 Spacing Scale**

- 4, 8, 12, 16, 24, 32, 40 (e.g., Tailwind: `1, 2, 3, 4, 6, 8, 10`)

  ***

  ### **3.6 Components**

**Buttons:**

- Border radius: 9999px (pill).

- Primary:
  - Background: `#282427`

  - Text: `#EEEBD9`

  - Hover: slightly lighter (`#3A3438`)

  - Disabled: BG `#9CA3AF`, text `#F3F4F6`

- Secondary:
  - Background: transparent

  - Border: `1px solid #282427`

  - Text: `#282427`

  - Hover: BG `#EEEBD9`

- Ghost:
  - Background: transparent

  - Text: `#282427`

  - Hover: BG `#EEEBD9`

- Destructive:
  - Background: `#DC2626`

  - Text: `#FFFFFF`

  - Hover: slightly darker red

**Cards:**

- Background: `#FFFFFF`

- Border: `1px solid #E5E7EB`

- Border radius: 16px

- Shadow: `0 8px 24px rgba(0,0,0,0.04)`

- Padding: 16–24px with clear header/body separation.

**Inputs:**

- Height: 40–44px

- Border: `1px solid #D1D5DB`

- Radius: 10–12px

- Placeholder: `#9CA3AF`

- Focus:
  - Border: `#2292A4`

  - Optional focus ring with same color

- Error:
  - Border: `#DC2626`

  - Helper text: red, 14px

**Icons:**

- Library: Lucide Icons

- Used in: navigation, primary actions (add job, generate, edit), toasts, status display.

---

## **4\. Functional Requirements**

_(Most unchanged; key additions highlighted.)_

### **4.1 User Profile & Onboarding**

- Includes **Resume Review** step where user must confirm structured data before scoring is allowed.

---

### **4.2 Manual Job Add**

- **Description:** Add jobs to track and evaluate.

- **User Story:** As a job seeker, I want to quickly save jobs by pasting descriptions so I can track and score them.

- **Inputs:** title, company, job description, job URL, location (optional).

- **Outputs:** New Job \+ Application (status: Planned).

- **Validation:** title \+ company \+ (job URL or job description) required.

- **Permissions:** Only owner.

---

### **4.3 Fit Assessment (Job Scoring)**

- **Description:** Assess and bucket job-candidate fit, and explain why.

- **User Story:** As a job seeker, I want my opportunities bucketed by fit (Excellent/Good/Fair/Poor) so I know where to focus.

- **Inputs:** parsed job description, parsed profile, preferences.

- **Outputs:**
  - `fit_bucket` (enum: `EXCELLENT`, `GOOD`, `FAIR`, `POOR`).

  - Optional internal numeric `fit_score` (0–1) used for sorting only.

  - Explanation text.

  - Matching and missing skills lists.

- **Validation:** Job/Application must belong to user; profile parsed and confirmed.

- **Permissions:** Only owner.

---

### **4.4 Application Pipeline**

- **Description:** Track the status of each application in a pipeline.

- **User Story:** As a job seeker, I want to see all my applications by stage so I always know what’s next.

- **Inputs:** status changes, applied_at, optional follow-up dates.

- **Outputs:** pipeline view, status history.

- **Validation:** status must be one of enum values; transitions are free-form (no strict workflow).

- **Permissions:** Only owner.

---

### **4.5 Tailored Resume Generation**

- **Description:** Generate a job-specific resume using user’s profile and job description.

- **User Story:** As a job seeker, I want tailored resumes for each job so I can stand out without rewriting everything.

- **Inputs:** application_id (which maps to job \+ user profile).

- **Outputs:** structured resume content (JSON) and a generated PDF stored in S3.

- **Validation:** Application and profile must exist; user has not exceeded monthly limit.

- **Permissions:** Only owner.
  - Uses **defined PDF generation pipeline** (Section 9.8).

  - Writes `prompt_version` and `model_used` to `GeneratedDocument`.

---

### **4.6 Tailored Cover Letter Generation**

- **Description:** Generate a custom cover letter per job.

- **User Story:** As a job seeker, I want a tailored cover letter so I can send high-quality applications quickly.

- **Inputs:** application_id, optional user-provided notes.

- **Outputs:** cover letter text and generated document (PDF or plain text).

- **Validation:** Application must exist; profile must be minimally complete; user must not exceed limit.

- **Permissions:** Only owner.
- with same prompt/version tracking.

---

### **4.7 Company Research**

- **Architecture Decision:** v1 uses **LLM-only summarization**, not external company data APIs.

- Inputs: company name, job description text.

- Output: high-level overview \+ talking points \+ “things to research yourself”.

- Disclaimer in UI: “AI-generated summary—verify details for accuracy, especially for smaller or lesser-known companies.”

---

### **4.8 Notes**

- Included in v1.

- Simple CRUD per Application.

- No rich text required; plain text or minimal markdown.

---

### **4.9 Bulk Operations (v1 Desktop)**

- **Minimum v1:**
  - Multi-select rows in `/jobs`.

  - Bulk stage update.

  - Bulk delete/archive.

- All operations scoped to current user.

---

## **5\. Data Model & Schema**

### **5.1 Entities Overview**

_(Same list; Note is now explicitly in v1, Job.source removed.)_

---

### **5.2 Entity Changes vs 1.0**

#### **5.2.3 Job**

- Remove `source` field for v1 (since imports are out of scope).

- Fields:
  - `id`, `user_id`, `title`, `company`, `location`, `job_url`, `job_description_raw`, `job_description_parsed`, timestamps, indexes as before.

---

#### **5.2.4 Application**

Add fit bucket instead of relying solely on precise numeric score:

- `fit_bucket` (enum: `EXCELLENT`, `GOOD`, `FAIR`, `POOR`, nullable initially).

- `fit_score` (numeric, 0–1, nullable; for internal ranking).

- `score_explanation` as before.

`job_score` (0–100) can be removed or left internal; **UI shows only buckets** and explanation.

---

#### **5.2.5 GeneratedDocument**

- `prompt_version` is now **required** (non-nullable):
  - String referencing prompt registry version (e.g., `resume-v1.2.0`).

- `model_used` uses pinned model IDs (e.g., `gpt-4o-2024-05-13`).

---

#### **5.2.7 AiTask**

Unchanged structurally, but will now support SSE streaming (see Section 10).

---

### **5.3 Concurrency & Multi-Device**

- **Last-write-wins** is accepted for v1.

- PATCH endpoints can optionally accept `updated_at`:
  - If current record `updated_at` \> client’s `updated_at`, return conflict (409) with message: “This item changed in another session. Reload to continue.”

---

## **6\. Non-Functional Requirements**

Same baseline as v1.0, plus:

### **6.1 Resume File Size Limit**

- Max upload size: 5 MB per resume file.

- Enforced at presigned URL creation and UI level.

---

### **6.2 Multi-Device Behavior**

- No real-time syncing between devices v1.

- Users can refresh to see latest data.

- Concurrency handled via last-write-wins and optional `updated_at` check.

---

### **6.3 Data Export & Account Deletion**

- v1:
  - **Account deletion:** Self-service button in Settings that triggers soft-delete and manual data cleanup process.

  - **Data export:** Manual process documented; user can request a CSV export of Applications via support (future self-service export).

---

## **7\. Tech Stack (High-Level)**

Mostly as before, with some decisions locked:

- **PDF generation:** `@react-pdf/renderer` (or similar React-based PDF library) running in serverless Node on Vercel \+ (if needed) a dedicated Node function on AWS Lambda for heavier workloads. **No Puppeteer in v1** to avoid cold start and infra complexity.

- **AI model pinning:**
  - High quality: `gpt-4o-2024-05-13`

  - Cheaper: `gpt-4o-mini-2024-05-13`

- **Job queue/orchestration:** Inngest (explicit decision for v1).

Auth0 plan assumed to be Dev/Free tier; expected MAU \< 7k.

---

## **8\. API Contracts (High-Level)**

Same as before plus:

### **8.5 Document Download & Access**

**GET `/api/documents/:id`**

- Returns metadata for a single `GeneratedDocument` (type, version, created_at).

- No file content, just metadata.

**GET `/api/documents/:id/download`**

- Validates ownership.

Returns:

{

"url": "https://presigned-s3-url",

"expires_in": 900

}

-
- `expires_in` is 15 minutes (configurable).

- If user clicks a stale URL, frontend fetches a fresh one via this endpoint.

---

## **9\. AI System Design**

### **9.1–9.2 (Responsibilities & Model Selection)**

Same as 1.0 but now use **pinned model identifiers** and clarify cost tiering.

---

### **9.3 Resume Parsing Strategy \+ Review**

- Parse as before, but parsing is followed by a **required review/edit step**:
  - v1 requires user to confirm parsed resume in `/onboarding/resume-review` or `/profile` before any fit assessments or AI document generations are allowed.

- UI includes:
  - Editable lists of experiences, education, skills, with Add/Edit/Delete.

  - “Looks good” button that sets `Profile.parsed_resume_confirmed_at`.

- AI tasks check that `parsed_resume_confirmed_at` is non-null before running.

---

### **9.5 Fit Assessment Algorithm (Updated)**

- **Internal numeric score** (0–1) kept for sorting, not shown directly to user.

- Components:
  - Skills match (0.0–0.5).

  - Experience/education match (0.0–0.3).

  - Preference alignment (0.0–0.2).

- Map numeric score to a **fit bucket**:
  - `EXCELLENT`: 0.80–1.0

  - `GOOD`: 0.60–0.79

  - `FAIR`: 0.40–0.59

  - `POOR`: \< 0.40

- **LLM involvement**:
  - LLM explains the score and lists matched/missing skills.

  - LLM may suggest a minor adjustment to numeric score but within a very tight band (±0.05).

  - Final bucket is computed after this adjustment.

- No “80 vs 82” false precision—UI shows bucket \+ explanation.

---

### **9.8 Document Generation Pipeline (Decided)**

1. LLM returns **structured JSON** (not raw formatted text) describing sections.

2. Backend uses a **React-based PDF template** with `@react-pdf/renderer`:
   - Templates:
     - **Template A – Classic ATS:** single column, simple headings, bullets.

     - **Template B – Modern ATS:** subtle two-column layout on desktop, still ATS-friendly.

   - v1: user chooses template in Settings or per generation (optional). Default Template A.

3. React PDF is rendered in a Node serverless function; output PDF stream is uploaded to S3.

4. `GeneratedDocument` record created with:
   - `storage_url` (S3 key).

   - `prompt_version` (e.g., `resume-v1.0.0`).

   - `model_used`, `tokens_used`.

5. Frontend uses `/api/documents/:id/download` to fetch presigned URLs.

No Puppeteer/Playwright in v1 (explicit).

---

### **9.9 AI Cost Modeling & Limits \+ UX**

- Limits (per calendar month, reset at 00:00 UTC on the 1st):
  - Job fit assessments: up to 200 per user.

  - Tailored resumes: up to 30\.

  - Tailored cover letters: up to 30\.

- When user approaches 80% of a limit:
  - Small warning chip (e.g., “24/30 resumes used this month”) in `/settings/usage` and near generation buttons.

- At limit:
  - Generation buttons disabled with tooltip: “You’ve used all resume generations for this month. Limits reset on \[date\].”

- v1 does not do hard per-day concurrency throttling; however, we can:
  - Enforce per-user concurrency: no more than 3 outstanding `RESUME_GENERATION` tasks at once (others rejected with friendly error).

---

### **9.10 Prompt Versioning Strategy**

- All prompts live in repository under `/prompts/{feature}/...` (e.g., `/prompts/resume/v1.md`).

- Each release sets semantic versions per prompt (e.g., `resume-v1.0.0`, `cover-letter-v1.1.0`).

- `prompt_version` in `GeneratedDocument` refers to this semantic version.

- Changelog is maintained in `PROMPTS_CHANGELOG.md` describing changes and their rationale.

This allows future re-generation and debugging.

---

### **9.11 Company Research Architecture**

- LLM-only, no external web calls or APIs in v1.

- Prompt focuses on:
  - Generic, evergreen company-type advice (e.g., for “Google”, mention scale, innovation, data).

  - Avoid precise stats and time-sensitive information.

- Output is intentionally high-level and treated as an **aid**, not authoritative data.

---

## **10\. Async & Background Job Architecture**

### **10.1 Why Async**

AI operations (scoring, resume/cover letter generation, research) can take 5–30 seconds. Running them synchronously would cause request timeouts and poor UX.

---

### **10.2 Job Queue**

- Queue orchestration: Inngest (or equivalent SaaS job orchestrator) integrated with Next.js.

- Tasks:
  - `JOB_SCORING`

  - `RESUME_GENERATION`

  - `COVER_LETTER_GENERATION`

  - `COMPANY_RESEARCH`

---

### **10.3 Task Lifecycle (with SSE)**

1. Frontend calls e.g. `/api/ai/resume`.

2. API:
   - Validates input.

   - Creates `AiTask` (`PENDING`).

   - Enqueues Inngest job with task ID.

   - Returns `ai_task_id`.

3. Worker (Inngest):
   - Marks task `RUNNING`.

   - Calls AI, generates documents, updates DB.

   - On success: `SUCCEEDED`, `result_ref` set.

   - On permanent failure: `FAILED`, `error_message` set.

4. Frontend subscribes to **SSE**:
   - `GET /api/ai-tasks/stream?taskId=<id>`

   - SSE events: `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED` with minimal payload.

   - If SSE unsupported or fails, fallback to polling every 5 seconds with exponential backoff.

---

### **10.4 Retry & Timeout Policies**

- AI call timeout: 30 seconds.

- Retries:
  - Rate limits/timeouts: up to 2 retries with exponential backoff.

  - JSON parse errors: 1 retry with stricter instructions.

- After max retries:
  - AiTask marked `FAILED`.

  - Error surfaced in UI.

---

### **10.5 UX for Long Running Tasks**

- On start: show inline spinner on relevant button \+ text “Generating...”.

- On SSE update:
  - Success: replace spinner with “View” button.

  - Failure: show toast; button state goes back to “Generate” with “Try again” text.

---

## **11\. Hosting, DevOps & Environments**

### **11.1 Git Strategy**

- Repository name: `klevr-career-assistant`.

- Branches:
  - `main` → production.

  - Feature branches: `feat/<feature-name>`.

- Commit convention: Conventional Commits (`feat:`, `fix:`, `chore:` etc.).

---

### **11.2 Environments**

- Local: developer machine with `.env.local`.

- Staging: optional separate Vercel project \+ database.

- Production: main Vercel project, single Postgres instance via Supabase.

---

### **11.3 Deployment**

- Frontend \+ API: Next.js app deployed to Vercel.

- Database: Supabase Postgres instance.

- File storage: AWS S3.

- Env vars:
  - Locally via `.env.local`.

  - On Vercel via project settings.

  - On worker/orchestrator via their own env management.

---

### **11.4 CI/CD**

- On PR:
  - Run `eslint`.

  - Run `tsc --noEmit` for typechecking.

- On merge to `main`:
  - Run tests.

  - Trigger Vercel deploy.

---

## **12\. Tooling & Developer Experience**

### **12.1 Code Quality**

- ESLint:
  - Next.js \+ TypeScript config.

  - Enforce hooks rules and import ordering.

- Prettier:
  - Standard formatting; integrated with ESLint.

### **12.2 TypeScript**

- `"strict": true` in `tsconfig.json`.

### **12.3 Git Hooks**

- Husky \+ lint-staged:
  - `pre-commit`: run `eslint` \+ `prettier --check` on staged files.

  - `pre-push` (for main): run test suite.

### **12.4 Project Structure**

- Single repo, standard Next.js structure:
  - `/app` – routes and layouts.

  - `/components` – shared UI.

  - `/lib` – utilities.

  - `/server` – server utilities, AI/DB logic.

  - `/prisma` – schema and migrations.

### **12.5 NPM Scripts**

- `dev` – `next dev`

- `build` – `next build`

- `start` – `next start`

- `lint` – `next lint`

- `test` – test runner (Vitest/Jest)

- `db:migrate` – Prisma migrate

- `db:seed` – seed script

---

## **13\. Testing & QA**

### **13.1 Test Levels**

- Unit:
  - Pure functions: scoring logic, parsing helpers.

- Integration:
  - API routes \+ DB interactions.

- E2E:
  - Critical flows via Playwright/Cypress.

### **13.2 Must-Test Flows**

- Auth:
  - Protected pages require login.

- Core CRUD:
  - Add job, view job, update stage.

- AI:
  - At least validate that endpoints handle success/failure gracefully.

- Permissions:
  - Users cannot access each other’s data.

### **13.3 Test Data Strategy**

- Seed script:
  - One demo user, sample profile, 5–10 jobs with various stages.

- Staging:
  - Optional fixed “demo” user for quick visual QA.

---

## **14\. Security, Auth & Access Control**

### **14.1 Authentication (Auth0)**

- Auth via Auth0 Universal Login.

- OAuth providers:
  - v1: Google.

  - Future: LinkedIn, GitHub.

### **14.2 Linking Auth0 → User**

- `User.auth0_id` ← Auth0 user identifier.

- Email mirrored from Auth0; `auth0_id` used as primary reference.

### **14.3 Session Management**

- Secure, HTTP-only cookies.

- Token validation via Auth0 SDK in Next.js middleware.

- If token invalid/expired:
  - API returns 401\.

  - Frontend redirects to login.

### **14.4 Access Control**

- All `/app` routes except `/`, `/legal/*` require auth.

- API:
  - Middleware ensures `user_id` attached to request.

  - All data access queries scoped by `user_id`.

### **14.5 Input Validation**

- All API endpoints validate incoming payloads with Zod schemas.

- Frontend forms share schemas where possible.

### **14.6 Rate Limiting & Protection**

- Rate limiting:
  - Per-IP and per-user on AI-heavy endpoints.

- CSRF:
  - Rely on same-site cookies and proper auth flows.

- CORS:
  - Only allow requests from Klevr’s domains (Vercel \+ custom).

### **14.7 Backups & Recovery**

- DB daily backups (via Supabase).

- Recovery playbook:
  - Restore from backup.

  - Communicate with affected users if catastrophic.

---

## **15\. Analytics, Logging & Monitoring**

### **15.1 Product Analytics**

- Tool: Plausible or PostHog.

- Track page views and key events.

### **15.2 Event Taxonomy (Core Events)**

- `user_signed_up` { source, has_resume, has_profile }

- `profile_completed` { education_set, skills_set }

- `job_created` { source, has_description, has_url }

- `job_scored` { score_bucket, model_used }

- `resume_generated` { model_used, tokens_bucket }

- `cover_letter_generated`

- `application_status_changed` { from_status, to_status }

### **15.3 Logging & Error Tracking**

- Logging:
  - Structured logs for backend operations.

- Error tracking:
  - Sentry for frontend and backend exceptions.

---

## **16\. Content, Copy & Text**

### **16.1 Tone & Voice**

- Encouraging, friendly, non-judgmental.

- Professional but not stiff; speak like an older student/mentor.

- No guilt-tripping about rejections or low scores.

### **16.2 Key Copy Examples**

**Landing Hero:**

- Headline: “Get hired faster with an AI career copilot.”

- Subheadline: “Score job postings, tailor your resume and cover letters, and track every application in one clean dashboard.”

**Dashboard Empty State:**

- “You don’t have any applications yet. Add your first job to start tracking your path to hired.”

**Error Toasts:**

- “Something went wrong. Please try again in a few seconds.”

- For AI failures: “We couldn’t generate this right now. Please try again later.”

**Emails:**

- Welcome email: short, warm, invites user to add first job and upload resume.

- Password reset: handled mostly by Auth0 but wrapped with consistent branding where possible.

---

## **17\. Project Docs & AI Context Block**

### **17.1 Project Brief**

A 1–2 page internal doc summarizing:

- Problem & target user.

- MVP feature set.

- Tech stack.

- Routes.

- Data model overview (ERD).

- Visual system summary.

### **17.2 AI Assistant Context Block**

A reusable prompt snippet for AI assistants including:

- Short description of Klevr and user persona.

- Chosen tech stack: Next.js (App Router), TS, Prisma, Supabase, Tailwind, shadcn, Auth0, S3, Resend, OpenAI.

- Folder structure conventions.

- Data model cheat sheet (entities \+ key fields).

- Routing map.

- Coding conventions (TS strict, ESLint/Prettier, React Query, RHF \+ Zod).

This block is prepended to development prompts so the AI behaves like a collaborator already familiar with Klevr.
