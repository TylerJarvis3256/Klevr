# Klevr — AI Career Assistant

## Project Overview

AI-powered career assistant for college students and early-career job seekers. Tracks job applications, scores job fit using AI, and generates tailored resumes and cover letters.

| Layer           | Technology                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Framework       | Next.js 15 (App Router)                                                                                  |
| Language        | TypeScript (strict mode)                                                                                 |
| Database        | Prisma 7 + Supabase (PostgreSQL)                                                                         |
| Auth            | Auth0 (email/password + Google OAuth)                                                                    |
| AI              | Anthropic Claude (`claude-sonnet-4-5-20250929`) + OpenAI (`gpt-4o-2024-05-13`, `gpt-4o-mini-2024-07-18`) |
| Background Jobs | Inngest                                                                                                  |
| File Storage    | AWS S3                                                                                                   |
| PDF Generation  | @react-pdf/renderer                                                                                      |
| UI              | Tailwind CSS 4 + shadcn/ui + Lucide icons                                                                |
| Forms           | React Hook Form + Zod                                                                                    |
| Data Fetching   | TanStack Query                                                                                           |
| Testing         | Vitest + Testing Library + Playwright (e2e)                                                              |

## Build & Development

```bash
npm run dev              # Start Next.js dev server
npm run dev:inngest      # Start Inngest dev server
npm run build            # Production build
npm run lint             # ESLint (flat config)
npm run typecheck        # TypeScript type checking
npm run format           # Prettier format all files

npm run db:migrate       # Run Prisma migrations
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database
npm run db:reset         # Reset database

npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:ui          # Open Vitest UI
npm run test:e2e         # Run Playwright e2e tests
```

### Required Environment Variables

See `.env.example` for all variables. Critical ones:

| Variable                                                                    | Purpose                               |
| --------------------------------------------------------------------------- | ------------------------------------- |
| `DATABASE_URL`                                                              | Supabase PostgreSQL connection string |
| `AUTH0_SECRET`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`    | Auth0 authentication                  |
| `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`                                   | Auth0 URLs                            |
| `OPENAI_API_KEY`                                                            | OpenAI API access                     |
| `ANTHROPIC_API_KEY`                                                         | Anthropic Claude API access           |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | S3 file storage                       |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`                                  | Inngest background jobs               |
| `NEXT_PUBLIC_APP_URL`, `APP_BASE_URL`                                       | App base URLs                         |

### Full System Reset

`npm run db:reset` only resets the database. For a complete teardown:

```bash
# 1. Database — drop all tables, re-migrate, re-seed
npm run db:reset

# 2. S3 — delete all user-uploaded files from the bucket
#    (no automated script — manually clear via AWS Console or:)
aws s3 rm s3://$AWS_S3_BUCKET --recursive

# 3. Inngest — cancel any in-flight or queued jobs
#    In dev: restart the Inngest dev server (Ctrl+C → npm run dev:inngest)
#    In prod: use the Inngest dashboard to bulk-cancel pending functions

# 4. Local caches
rm -rf .next node_modules/.cache
```

After reset, the first user login will re-trigger Auth0 post-login sync and create a fresh `User` + `Profile` record.

## Testing Strategy

### File Locations

| Type            | Location                              | Pattern                  |
| --------------- | ------------------------------------- | ------------------------ |
| Unit tests      | `lib/__tests__/`                      | `*.test.ts`              |
| Component tests | `components/__tests__/`               | `*.test.tsx`             |
| Test helpers    | `__tests__/helpers/`                  | Factories, mocks, barrel |
| E2E tests       | `e2e/`                                | `*.spec.ts`              |
| Config          | `vitest.config.ts`, `vitest.setup.ts` | —                        |

### Factories (`__tests__/helpers/factories.ts`)

```typescript
import { createUser, createJob, createApplication, resetFactoryCounters } from '@/__tests__/helpers'

// All factories return deterministic defaults with Partial overrides
const user = createUser({ email: 'custom@test.com' })
const job = createJob({ title: 'Frontend Dev', user_id: user.id })

// Reset counter-based IDs between tests
beforeEach(() => resetFactoryCounters())
```

Available: `createUser`, `createProfile`, `createJob`, `createApplication`, `createEducation`, `createJobExperience`, `createBullet`, `createProject`, `createSemanticAnalysis`

### Mocks (`__tests__/helpers/mocks.ts`)

```typescript
import {
  createMockPrisma,
  createMockAuth0Session,
  createMockOpenAIResponse,
} from '@/__tests__/helpers'

// Prisma — all model methods are vi.fn()
const prisma = createMockPrisma()
prisma.user.findUnique.mockResolvedValue(createUser())

// Auth0 session
const session = createMockAuth0Session({ email: 'user@test.com' })

// OpenAI completion response
const response = createMockOpenAIResponse('{"score": 85}')
```

### Mocking Patterns

**Prisma** — mock the module, not the client:

```typescript
vi.mock('@/lib/prisma', () => ({ prisma: createMockPrisma() }))
```

**Auth0** — mock getSession:

```typescript
vi.mock('@auth0/nextjs-auth0', () => ({
  getSession: vi.fn().mockResolvedValue(createMockAuth0Session()),
}))
```

**OpenAI** — mock the client:

```typescript
vi.mock('@/lib/openai', () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
}))
```

**Anthropic** — mock the client (use `vi.hoisted` for mock variables):

```typescript
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))
vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { create: mockCreate } },
  ANTHROPIC_MODELS: { SONNET: 'claude-sonnet-4-5-20250929' },
  callAnthropic: vi.fn((_userId: string, fn: () => Promise<unknown>) => fn()),
  parseAnthropicJson: vi.fn((msg: any) => JSON.parse('{' + msg.content[0].text)),
}))
```

**S3** — use provided mocks:

```typescript
import { mockS3Client, mockGetSignedUrl } from '@/__tests__/helpers'
vi.mock('@aws-sdk/client-s3', () => ({ S3Client: vi.fn(() => mockS3Client) }))
```

**Inngest** — mock send:

```typescript
import { mockInngest } from '@/__tests__/helpers'
vi.mock('@/inngest/client', () => ({ inngest: mockInngest }))
```

## Code Style & Guidelines

### Laws of the Codebase

1. **Scope every query by `user_id`** — never expose data across users
2. **Resume must be confirmed** before AI features work (`parsed_resume_confirmed_at`)
3. **Use pinned model IDs** — always `gpt-4o-2024-05-13` / `claude-sonnet-4-5-20250929`, never unpinned
4. **AI operations are async** — always use Inngest, never synchronous AI calls
5. **Follow the design system** — consult `DESIGN-REQUIREMENTS.md` before building UI
6. **Buttons are pills** — always `rounded-full`
7. **Cards are rounded** — always `rounded-2xl` with `shadow-card`
8. **Headings use Lora** — `font-lora`, body uses Open Sans `font-sans`
9. **Validate at boundaries** — Zod schemas for API inputs, trust internal code
10. **API routes return `NextResponse.json()`** — standard Next.js App Router pattern
11. **Use TanStack Query** for client-side data fetching — no raw `fetch` in components
12. **Server components by default** — only `'use client'` when state/effects are needed
13. **Prisma for all DB access** — no raw SQL
14. **Type everything** — `strict: true`, no untyped `any` (warn on explicit any)
15. **Error classes for AI** — use `AIError`, `RateLimitError`, `TimeoutError`, `ValidationError`, `UsageLimitError` from `lib/errors.ts`
16. **No em dashes or en dashes** — never use `—` (em dash) or `–` (en dash) in git commit messages, code comments, or informative files (README, docs, markdown). Use a regular hyphen `-` instead
17. **Keep the README in sync** — when a major feature, architectural change, or structural addition is made (new tech stack entry, new AI pipeline, new data model, new API surface, new section of the app, etc.), update `README.md` to reflect the change. Match the existing README style: tech stack table with rationale, Mermaid ER diagrams for data model changes, ASCII pipeline diagrams for workflow changes, and detailed prose in Engineering Highlights for non-trivial systems. Do not add trivial changes (bug fixes, minor refactors, internal-only utilities) to the README

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { user } = await getSession()

  const data = await prisma.model.findMany({
    where: { user_id: user.id }, // Always scope by user_id
  })

  return NextResponse.json(data)
}
```

### Component Patterns

- Server components by default, `'use client'` only when needed
- Forms: React Hook Form + Zod resolver + shadcn form components
- Data fetching: TanStack Query with `queryKey` conventions
- Toast notifications: `sonner` (`toast.success()`, `toast.error()`)
- Icons: `lucide-react` exclusively
- Styling: Tailwind utility classes, `cn()` helper for conditional classes

### Design Tokens

| Token                | Value     | Class                                    |
| -------------------- | --------- | ---------------------------------------- |
| Primary (cream)      | `#EEEBD9` | `bg-primary`                             |
| Secondary (charcoal) | `#282427` | `bg-secondary`, `text-secondary`         |
| Accent Orange        | `#EE7B30` | `bg-accent-orange`, `text-accent-orange` |
| Accent Teal          | `#2292A4` | `bg-accent-teal`, `text-accent-teal`     |

## Security & Permissions

### Auth0 Model

- Auth provider: Auth0 with email/password + Google OAuth
- Session: `getSession()` from `@/lib/auth` (wraps `@auth0/nextjs-auth0`)
- User lookup: `auth0_id` → `User` table
- Post-login: `/api/auth/post-login` syncs Auth0 user to database

### User Data Scoping Checklist

- [ ] Every `prisma.findMany()` includes `where: { user_id }`
- [ ] Every `prisma.findUnique()` verifies ownership after fetch
- [ ] Every `prisma.update()` / `prisma.delete()` includes `where: { id, user_id }`
- [ ] No cross-user data leaks in API responses
- [ ] File storage keys include user_id prefix

## AI Operations & Limits

### Task Types

| Type                      | Model                        | Monthly Limit |
| ------------------------- | ---------------------------- | ------------- |
| `JOB_SCORING`             | `gpt-4o-mini-2024-05-13`     | 200           |
| `RESUME_GENERATION`       | `claude-sonnet-4-5-20250929` | 30            |
| `COVER_LETTER_GENERATION` | `gpt-4o-2024-05-13`          | 30            |
| `COMPANY_RESEARCH`        | `gpt-4o-mini-2024-05-13`     | —             |

### Workflow

1. Client calls API endpoint → creates `AiTask` record (status: `PENDING`)
2. API sends Inngest event
3. Inngest function picks up event → updates status to `RUNNING`
4. OpenAI call executes → result stored → status `SUCCEEDED` or `FAILED`
5. Client polls or uses TanStack Query to detect completion

### Usage Tracking

- Tracked per user per month in `UsageTracking` table
- Month format: `YYYY-MM` (from `getCurrentMonth()` in `lib/utils.ts`)
- Check limits before creating AI tasks

## Data Models

### Key Enums

```typescript
ApplicationStatus: PLANNED | APPLIED | INTERVIEW | OFFER | REJECTED
FitBucket: EXCELLENT | GOOD | FAIR | POOR
DocumentType: RESUME | COVER_LETTER
AiTaskType: JOB_SCORING | RESUME_GENERATION | COVER_LETTER_GENERATION | COMPANY_RESEARCH
AiTaskStatus: PENDING | RUNNING | SUCCEEDED | FAILED
JobSource: LINKEDIN | INDEED | GLASSDOOR | HANDSHAKE | COMPANY_WEBSITE | REFERRAL | OTHER | ADZUNA
ActivityType: STATUS_CHANGED |
  JOB_CREATED |
  JOB_SCORING_STARTED |
  JOB_SCORING_COMPLETED |
  RESUME_GENERATED |
  COVER_LETTER_GENERATED |
  COMPANY_RESEARCH_COMPLETED |
  NOTE_ADDED |
  NOTE_EDITED |
  DOCUMENT_DELETED |
  JOB_DISCOVERED |
  SEARCH_PERFORMED |
  SEARCH_SAVED |
  SAVED_SEARCH_RUN
```

### Core Models

- **User** — `id`, `auth0_id`, `email`; has one `Profile`, many `Job`, `Application`, `Education`, `JobExperience`, `Bullet`, `Project`
- **Profile** — `user_id` (unique), `skills[]`, `parsed_resume` (JSON), `parsed_resume_confirmed_at`
- **Job** — `user_id`, `title`, `company`, `job_description_raw`, optional `job_description_parsed` (JSON)
- **Application** — `user_id`, `job_id`, `status`, `fit_score`, `fit_bucket`, `matching_skills[]`, `missing_skills[]`
- **GeneratedDocument** — `application_id`, `type` (RESUME/COVER_LETTER), `storage_url`, `structured_data` (JSON), `template_id`
- **AiTask** — `user_id`, `application_id?`, `type`, `status`, `result_ref`, `error_message`
- **Education** — `user_id`, `school`, `degree`, `major`, `graduation_date`
- **JobExperience** — `user_id`, `title`, `company`, `start_date`, `end_date`
- **Bullet** — `user_id`, `experience_id?`, `project_id?`, `text`, `tags[]`, `priority`

## Version Control

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `refactor:` code restructuring (no behavior change)
- `test:` adding/updating tests
- `docs:` documentation changes
- `chore:` maintenance tasks

### Branch Naming

- `feature/short-description`
- `fix/issue-description`
- `refactor/what-changed`

## Directory Map

```
app/                     # Next.js App Router
├── (auth)/              # Login, signup, forgot-password pages
├── (main)/              # Dashboard, jobs, profile, settings pages
├── (onboarding)/        # Onboarding flow (basics → preferences → resume)
├── api/                 # API routes — pattern: api/<resource>/route.ts
└── auth/callback/       # Auth0 callback handler

components/              # React components grouped by domain
lib/                     # Shared utilities, clients, and business logic
inngest/                 # Background job client + function definitions
prompts/                 # AI prompt templates (markdown files)
prisma/                  # Schema + migrations + seed script
services/                # External microservices
__tests__/helpers/       # Test factories, mocks, barrel export
```

## Key Dependencies

### Production

| Package                 | Version  | Purpose                      |
| ----------------------- | -------- | ---------------------------- |
| `next`                  | ^15.1.0  | React framework (App Router) |
| `react` / `react-dom`   | ^19.0.0  | UI library                   |
| `@prisma/client`        | ^7.1.0   | Database ORM                 |
| `@auth0/nextjs-auth0`   | ^4.13.2  | Authentication               |
| `openai`                | ^6.10.0  | OpenAI API client            |
| `@anthropic-ai/sdk`     | ^0.74.0  | Anthropic Claude API client  |
| `inngest`               | ^3.47.0  | Background job processing    |
| `@aws-sdk/client-s3`    | ^3.948.0 | File storage                 |
| `@react-pdf/renderer`   | ^4.3.1   | PDF generation               |
| `@tanstack/react-query` | ^5.90.12 | Data fetching/caching        |
| `react-hook-form`       | ^7.68.0  | Form state management        |
| `zod`                   | ^4.1.13  | Schema validation            |
| `tailwindcss`           | ^4.1.18  | Utility-first CSS            |
| `sonner`                | ^2.0.7   | Toast notifications          |
| `react-markdown`        | ^10.1.0  | Markdown rendering           |
| `lucide-react`          | ^0.560.0 | Icon library                 |
| `date-fns`              | ^4.1.0   | Date utilities               |

### Development

| Package                  | Version | Purpose                  |
| ------------------------ | ------- | ------------------------ |
| `typescript`             | ^5      | Type checking            |
| `vitest`                 | ^4.0.15 | Unit/integration testing |
| `@vitest/coverage-v8`    | ^4.0.18 | Code coverage            |
| `@testing-library/react` | ^16.3.0 | Component testing        |
| `@playwright/test`       | ^1.57.0 | E2E testing              |
| `eslint`                 | ^9.39.1 | Linting (flat config)    |
| `prettier`               | ^3.7.4  | Code formatting          |
| `prisma`                 | ^7.1.0  | Database tooling         |
| `husky`                  | ^9.1.7  | Git hooks                |
| `lint-staged`            | ^16.2.7 | Pre-commit linting       |

## Deep-Dive References

For implementation details beyond what's in this file, consult these resources:

- **Design system**: `DESIGN-REQUIREMENTS.md` — authoritative spec for colors, typography, components, page layouts
- **Claude Code skills**: `.claude/skills/*/SKILL.md` — task-specific patterns for API routes, AI tasks, S3, PDF generation, components, and design system usage
