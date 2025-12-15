# Klevr - Master Implementation Plan

**Version:** 1.0
**Last Updated:** 12/11/2025
**Based on:** PROJECT-SPECIFICATIONS.md v1.1

---

## Overview

This document outlines the complete implementation strategy for Klevr, an AI-powered career assistant. The implementation is divided into 14 stages, each with detailed specifications in separate markdown files.

---

## Implementation Principles

1. **Incremental Development** - Build features in isolated, testable stages
2. **Security First** - Always scope queries by `user_id`, validate all inputs
3. **Type Safety** - Strict TypeScript throughout
4. **AI Best Practices** - Always use pinned model IDs, async operations via Inngest
5. **User-Centric** - Focus on the "magic moment" - instant fit assessment after adding a job

---

## Stage Overview

### **Stage 1: Foundation & Setup**

**File:** `STAGE-01-FOUNDATION.md`
**Duration Estimate:** Foundation work
**Dependencies:** None

- Project scaffolding (Next.js 14, TypeScript)
- Database setup (Prisma + Supabase)
- Auth0 configuration
- Environment management
- Development tooling (ESLint, Prettier, Husky)

**Deliverables:**

- Working Next.js app with TypeScript
- Prisma schema defined
- Auth0 integration complete
- Dev environment fully configured

---

### **Stage 2: User Profile & Onboarding**

**File:** `STAGE-02-ONBOARDING.md`
**Dependencies:** Stage 1

- User model and profile schema
- Onboarding flow (4 steps: Basics, Preferences, Resume Upload, Resume Review)
- Resume parsing (OpenAI-based)
- Resume review/edit interface
- Profile confirmation workflow

**Deliverables:**

- Complete onboarding flow `/onboarding/*`
- Resume upload to S3
- AI resume parsing
- Editable resume review screen
- Profile page `/profile`

---

### **Stage 3: Job Management**

**File:** `STAGE-03-JOB-MANAGEMENT.md`
**Dependencies:** Stage 2

- Job and Application models
- Manual job creation form
- Job detail page
- Application status tracking
- Basic CRUD operations

**Deliverables:**

- `/jobs/new` - Add job form
- `/jobs/:id` - Job detail page
- `/jobs` - Jobs list view
- API routes for job CRUD
- Application status enum and transitions

---

### **Stage 4: AI Infrastructure**

**File:** `STAGE-04-AI-INFRASTRUCTURE.md`
**Dependencies:** Stage 1

- Inngest setup and configuration
- AiTask model and lifecycle
- OpenAI API integration
- Task orchestration patterns
- SSE streaming for real-time updates
- Retry and error handling

**Deliverables:**

- Inngest functions framework
- `AiTask` database model
- `/api/ai-tasks/stream` SSE endpoint
- OpenAI client with rate limiting
- Base prompt templates in `/prompts`

---

### **Stage 5: Fit Assessment**

**File:** `STAGE-05-FIT-ASSESSMENT.md`
**Dependencies:** Stages 2, 3, 4

- Fit scoring algorithm (0-1 scale)
- Fit bucket mapping (EXCELLENT, GOOD, FAIR, POOR)
- LLM-based explanation generation
- Skills matching logic
- Experience/education alignment
- Preference scoring

**Deliverables:**

- Job scoring Inngest function
- Fit bucket calculation logic
- Skills extraction and matching
- Explanation generation
- UI components for fit display

---

### **Stage 6: Document Generation**

**File:** `STAGE-06-DOCUMENT-GENERATION.md`
**Dependencies:** Stages 2, 3, 4

- Resume generation prompts
- Cover letter generation prompts
- @react-pdf/renderer templates (Classic ATS, Modern ATS)
- PDF generation pipeline
- GeneratedDocument model
- Prompt versioning system
- Monthly usage limits (30 resumes, 30 cover letters)

**Deliverables:**

- Resume generation Inngest function
- Cover letter generation Inngest function
- PDF templates with React PDF
- S3 upload for generated PDFs
- Usage quota tracking
- `/api/ai/resume` and `/api/ai/cover-letter` endpoints

---

### **Stage 7: Company Research**

**File:** `STAGE-07-COMPANY-RESEARCH.md`
**Dependencies:** Stage 4

- LLM-only company research (no external APIs)
- Research prompt engineering
- Company summary generation
- Talking points extraction

**Deliverables:**

- Company research Inngest function
- Research prompt template
- UI component for company insights
- Disclaimer messaging for AI-generated content

---

### **Stage 8: Dashboard & Pipeline**

**File:** `STAGE-08-DASHBOARD-PIPELINE.md`
**Dependencies:** Stages 3, 5

- Dashboard layout and stats
- Pipeline Kanban view (Planned, Applied, Interview, Offer, Rejected)
- Application cards with fit badges
- Filters (stage, fit bucket, search)
- URL query param persistence
- Stats calculation (applications this month, response rate, active interviews)

**Deliverables:**

- `/dashboard` page with pipeline
- Stat cards component
- Filter system with URL persistence
- Mobile-responsive tabs view
- Drag-and-drop stage updates (desktop)

---

### **Stage 9: Document Management**

**File:** `STAGE-09-DOCUMENT-MANAGEMENT.md`
**Dependencies:** Stage 6

- S3 file storage architecture
- Presigned URL generation (15-minute expiry)
- Document download endpoints
- Document versioning
- Document list UI

**Deliverables:**

- `/api/documents/:id` metadata endpoint
- `/api/documents/:id/download` presigned URL endpoint
- S3 helper utilities in `/lib/s3.ts`
- Document viewer/download UI
- Auto-refresh for expired URLs

---

### **Stage 10: Notes & Bulk Operations**

**File:** `STAGE-10-NOTES-BULK-OPS.md`
**Dependencies:** Stage 3

- Note model and CRUD
- Notes UI on job detail page
- Multi-select on jobs list
- Bulk status update
- Bulk delete/archive

**Deliverables:**

- Note database model
- Notes component with timestamp
- Multi-select checkboxes on `/jobs`
- Bulk action toolbar
- Bulk update API endpoints

---

### **Stage 11: Settings & Usage**

**File:** `STAGE-11-SETTINGS-USAGE.md`
**Dependencies:** Stages 2, 6

- Account settings page
- Notification preferences
- AI usage dashboard
- Monthly quota tracking and display
- Quota warnings (80% threshold)
- Account deletion flow

**Deliverables:**

- `/settings/account` page
- `/settings/notifications` page
- `/settings/usage` page with quota visualization
- Usage calculation logic
- Account deletion endpoint with soft-delete

---

### **Stage 12: UI/UX Polish**

**File:** `STAGE-12-UI-UX-POLISH.md`
**Dependencies:** All feature stages

- Mobile responsiveness
- Empty states
- Loading states
- Error handling and toasts
- Form validation messaging
- Accessibility (WCAG 2.1 AA)
- Design token implementation

**Deliverables:**

- Mobile-optimized layouts
- Skeleton loaders
- Toast notification system
- Empty state illustrations/messages
- Accessible forms and navigation
- Dark mode support (optional)

---

### **Stage 13: Testing & QA**

**File:** `STAGE-13-TESTING-QA.md`
**Dependencies:** All feature stages

- Unit tests (scoring logic, helpers)
- Integration tests (API routes)
- E2E tests (critical flows)
- Security testing
- Performance testing
- Cross-browser testing

**Deliverables:**

- Vitest/Jest test suite
- Playwright E2E tests
- Test coverage reports
- Security audit results
- Performance benchmarks

---

### **Stage 14: Deployment & DevOps**

**File:** `STAGE-14-DEPLOYMENT-DEVOPS.md`
**Dependencies:** All stages

- Vercel deployment configuration
- Environment variable management
- CI/CD pipeline (GitHub Actions)
- Database migrations in production
- Monitoring and logging (Sentry)
- Analytics (Plausible/PostHog)
- Backup and recovery procedures

**Deliverables:**

- Production Vercel project
- Staging environment (optional)
- GitHub Actions workflows
- Monitoring dashboards
- Runbook for common issues
- Analytics event tracking

---

## Critical Path

The following stages are on the critical path to MVP:

1. **Stage 1** → Foundation (required for all)
2. **Stage 2** → User onboarding (required for user data)
3. **Stage 4** → AI infrastructure (required for all AI features)
4. **Stage 3** → Job management (required for core feature)
5. **Stage 5** → Fit assessment (core magic moment)
6. **Stage 6** → Document generation (core value prop)
7. **Stage 8** → Dashboard (main user interface)

Stages 7, 9, 10, 11 can be developed in parallel after their dependencies are met.

---

## Technical Debt & Future Considerations

### Known Limitations in MVP

- No real-time multi-device sync (last-write-wins)
- No automatic job scraping
- LLM-only company research (no external data APIs)
- Manual data export (no self-service)
- Basic concurrency handling

### Post-MVP Enhancements

- AI job recommendations
- Interview preparation features
- Conversational AI chatbot
- AI strengths/weaknesses analysis
- Advanced analytics dashboards
- Native mobile apps
- Browser extensions

---

## Success Metrics

### Technical Success

- [ ] All critical flows covered by E2E tests
- [ ] 90%+ uptime in production
- [ ] AI task completion rate >95%
- [ ] P95 page load time <2s
- [ ] Zero data leakage incidents

### Product Success

- [ ] Users complete onboarding in <5 minutes
- [ ] Average 5+ jobs added per active user
- [ ] 80%+ of generated documents are downloaded
- [ ] Users return within 7 days of signup

---

## Risk Management

| Risk                    | Impact | Mitigation                                               |
| ----------------------- | ------ | -------------------------------------------------------- |
| OpenAI API rate limits  | High   | Implement queue with backoff, show clear status to users |
| Resume parsing accuracy | Medium | Require user review and confirmation, allow manual edit  |
| Auth0 downtime          | High   | Clear error messaging, retry logic, status page          |
| S3 storage costs        | Low    | Set lifecycle policies, monitor usage, compress PDFs     |
| Slow AI responses       | Medium | SSE streaming, clear progress indicators, 30s timeout    |

---

## Development Guidelines

### Code Organization

```
app/
├── (auth)/                 # Auth pages
├── (main)/                 # Main app (requires auth)
├── (onboarding)/           # Onboarding flow
├── api/                    # API routes
└── auth/callback/          # Auth0 callback

components/
├── ui/                     # shadcn components
├── forms/                  # Form components
├── jobs/                   # Job-specific components
└── layout/                 # Layout components

lib/
├── auth.ts                 # Auth utilities
├── prisma.ts               # Prisma client
├── openai.ts               # OpenAI client
├── s3.ts                   # S3 utilities
└── inngest.ts              # Inngest client

inngest/
└── functions/              # Background job functions

prompts/
├── resume/                 # Resume prompts
├── cover-letter/           # Cover letter prompts
├── scoring/                # Fit assessment prompts
└── research/               # Company research prompts
```

### Commit Conventions

Use Conventional Commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `chore:` - Maintenance tasks
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring

### Branch Strategy

- `main` - Production branch
- `feat/<feature-name>` - Feature branches
- PR required for merge to main

---

## Getting Started

1. Read `STAGE-01-FOUNDATION.md` for initial setup
2. Follow stages sequentially for dependencies
3. Refer to `PROJECT-SPECIFICATIONS.md` for requirements
4. Check `DESIGN-REQUIREMENTS.md` for design specifications

---

## Document Maintenance

- Update stage files when implementation details change
- Keep this master plan in sync with individual stages
- Document all architectural decisions
- Maintain prompt versioning in `PROMPTS_CHANGELOG.md`

---

**Ready to build? Start with Stage 1: Foundation & Setup**
