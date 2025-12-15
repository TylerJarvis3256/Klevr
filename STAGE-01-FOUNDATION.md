# Stage 1: Foundation & Setup

**Stage:** 1 of 14
**Dependencies:** None
**Estimated Effort:** Foundation work

---

## Overview

This stage establishes the foundational infrastructure for Klevr. All subsequent stages depend on this foundation being properly configured.

### Goals

- Set up Next.js 14 project with App Router
- Configure TypeScript in strict mode
- Set up Prisma with Supabase PostgreSQL
- Integrate Auth0 for authentication
- Configure development tooling (ESLint, Prettier, Husky)
- Establish project structure and conventions
- Set up environment management

---

## 1. Project Scaffolding

### 1.1 Initialize Next.js Project

```bash
npx create-next-app@latest klevr-career-assistant --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd klevr-career-assistant
```

**Configuration selections:**

- ✅ TypeScript
- ✅ ESLint
- ✅ Tailwind CSS
- ✅ App Router
- ✅ Import alias (`@/*`)
- ❌ `src/` directory (use root-level organization)

### 1.2 Install Core Dependencies

```bash
# UI & Styling
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-popover
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# Data Fetching
npm install @tanstack/react-query @tanstack/react-query-devtools

# Database & ORM
npm install @prisma/client
npm install -D prisma

# Authentication
npm install @auth0/nextjs-auth0

# AI & Background Jobs
npm install openai
npm install inngest

# File Storage
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# PDF Generation
npm install @react-pdf/renderer

# Email
npm install resend

# Utilities
npm install date-fns
```

### 1.3 Install Development Dependencies

```bash
# Code Quality
npm install -D eslint-config-prettier prettier
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Git Hooks
npm install -D husky lint-staged

# Testing
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test

# Types
npm install -D @types/node @types/react @types/react-dom
```

---

## 2. TypeScript Configuration

### 2.1 Update `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    },
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Key Settings:**

- `strict: true` - Enables all strict type checking
- `noUnusedLocals: true` - Prevents unused variables
- `noUnusedParameters: true` - Prevents unused function parameters
- `forceConsistentCasingInFileNames: true` - Enforces consistent file naming

---

## 3. Database Setup (Prisma + Supabase)

### 3.1 Initialize Prisma

```bash
npx prisma init
```

This creates:

- `prisma/schema.prisma`
- `.env` with `DATABASE_URL`

### 3.2 Configure Supabase Connection

**Steps:**

1. Create a Supabase project at https://supabase.com
2. Navigate to Project Settings → Database
3. Copy the connection string (use "Transaction pooling" mode for production)
4. Update `.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"
```

**Note:** Use `DIRECT_URL` for migrations, `DATABASE_URL` for queries with connection pooling.

### 3.3 Define Prisma Schema

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============================================
// ENUMS
// ============================================

enum ApplicationStatus {
  PLANNED
  APPLIED
  INTERVIEW
  OFFER
  REJECTED
}

enum FitBucket {
  EXCELLENT
  GOOD
  FAIR
  POOR
}

enum DocumentType {
  RESUME
  COVER_LETTER
}

enum AiTaskType {
  JOB_SCORING
  RESUME_GENERATION
  COVER_LETTER_GENERATION
  COMPANY_RESEARCH
}

enum AiTaskStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
}

// ============================================
// MODELS
// ============================================

model User {
  id         String   @id @default(cuid())
  auth0_id   String   @unique
  email      String   @unique
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  // Relations
  profile      Profile?
  jobs         Job[]
  applications Application[]
  ai_tasks     AiTask[]

  @@index([auth0_id])
  @@index([email])
}

model Profile {
  id                            String    @id @default(cuid())
  user_id                       String    @unique
  full_name                     String?
  school                        String?
  major                         String?
  graduation_year               Int?
  resume_file_url               String?
  resume_file_name              String?
  resume_uploaded_at            DateTime?
  parsed_resume                 Json?     // Structured resume data
  parsed_resume_confirmed_at    DateTime? // Required for AI features
  job_types                     String[]  // ["INTERNSHIP", "FULL_TIME", etc.]
  preferred_locations           String[]  // ["San Francisco", "Remote", etc.]
  created_at                    DateTime  @default(now())
  updated_at                    DateTime  @updatedAt

  // Relations
  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
}

model Job {
  id                      String    @id @default(cuid())
  user_id                 String
  title                   String
  company                 String
  location                String?
  job_url                 String?
  job_description_raw     String    @db.Text
  job_description_parsed  Json?     // Structured job data (skills, requirements, etc.)
  created_at              DateTime  @default(now())
  updated_at              DateTime  @updatedAt

  // Relations
  user         User          @relation(fields: [user_id], references: [id], onDelete: Cascade)
  applications Application[]

  @@index([user_id])
  @@index([company])
  @@index([created_at])
}

model Application {
  id                   String             @id @default(cuid())
  user_id              String
  job_id               String
  status               ApplicationStatus  @default(PLANNED)
  applied_at           DateTime?
  fit_bucket           FitBucket?
  fit_score            Float?             // 0-1, for internal ranking
  score_explanation    String?            @db.Text
  matching_skills      String[]
  missing_skills       String[]
  company_research     Json?              // LLM-generated company insights
  created_at           DateTime           @default(now())
  updated_at           DateTime           @updatedAt

  // Relations
  user                User               @relation(fields: [user_id], references: [id], onDelete: Cascade)
  job                 Job                @relation(fields: [job_id], references: [id], onDelete: Cascade)
  generated_documents GeneratedDocument[]
  notes               Note[]
  ai_tasks            AiTask[]

  @@index([user_id])
  @@index([job_id])
  @@index([status])
  @@index([fit_bucket])
  @@index([created_at])
}

model GeneratedDocument {
  id              String        @id @default(cuid())
  application_id  String
  type            DocumentType
  storage_url     String        // S3 key
  structured_data Json?         // JSON representation of content
  prompt_version  String        // Required: e.g., "resume-v1.2.0"
  model_used      String        // e.g., "gpt-4o-2024-05-13"
  tokens_used     Int?
  created_at      DateTime      @default(now())

  // Relations
  application Application @relation(fields: [application_id], references: [id], onDelete: Cascade)

  @@index([application_id])
  @@index([type])
  @@index([created_at])
}

model Note {
  id             String   @id @default(cuid())
  application_id String
  content        String   @db.Text
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  // Relations
  application Application @relation(fields: [application_id], references: [id], onDelete: Cascade)

  @@index([application_id])
  @@index([created_at])
}

model AiTask {
  id             String        @id @default(cuid())
  user_id        String
  application_id String?
  type           AiTaskType
  status         AiTaskStatus  @default(PENDING)
  result_ref     String?       // Reference to result (e.g., document ID, application ID)
  error_message  String?       @db.Text
  created_at     DateTime      @default(now())
  updated_at     DateTime      @updatedAt
  started_at     DateTime?
  completed_at   DateTime?

  // Relations
  user        User         @relation(fields: [user_id], references: [id], onDelete: Cascade)
  application Application? @relation(fields: [application_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([application_id])
  @@index([type])
  @@index([status])
  @@index([created_at])
}

model UsageTracking {
  id         String   @id @default(cuid())
  user_id    String
  month      String   // Format: "YYYY-MM"
  fit_count  Int      @default(0)
  resume_count Int    @default(0)
  cover_letter_count Int @default(0)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@unique([user_id, month])
  @@index([user_id])
  @@index([month])
}
```

### 3.4 Run Initial Migration

```bash
npx prisma migrate dev --name init
```

This will:

1. Create the database schema
2. Generate Prisma Client
3. Create `prisma/migrations/` directory

### 3.5 Create Prisma Client Singleton

Create `lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## 4. Auth0 Configuration

### 4.1 Create Auth0 Application

1. Go to https://auth0.com and create an account
2. Create a new application (Regular Web Application)
3. Configure settings:
   - **Allowed Callback URLs:** `http://localhost:3000/auth/callback, https://yourdomain.com/auth/callback`
   - **Allowed Logout URLs:** `http://localhost:3000, https://yourdomain.com`
   - **Allowed Web Origins:** `http://localhost:3000, https://yourdomain.com`

### 4.2 Enable Google OAuth (Optional for MVP)

1. Navigate to Authentication → Social
2. Enable Google OAuth provider
3. Configure credentials from Google Cloud Console

### 4.3 Configure Environment Variables

Add to `.env.local`:

```env
# Auth0
AUTH0_SECRET='use [openssl rand -hex 32] to generate a 32-byte secret'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://your-tenant.us.auth0.com'
AUTH0_CLIENT_ID='your_client_id'
AUTH0_CLIENT_SECRET='your_client_secret'
AUTH0_AUDIENCE='your_api_identifier' # Optional, for API
```

### 4.4 Create Auth0 API Route Handler

Create `app/api/auth/[auth0]/route.ts`:

```typescript
import { handleAuth } from '@auth0/nextjs-auth0'

export const GET = handleAuth()
```

### 4.5 Create Auth Utilities

Create `lib/auth.ts`:

```typescript
import { getSession, withApiAuthRequired, withPageAuthRequired } from '@auth0/nextjs-auth0'
import { prisma } from './prisma'

/**
 * Get the current authenticated user from the database
 * Requires Auth0 session to exist
 */
export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.user) return null

  const auth0Id = session.user.sub
  const email = session.user.email

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { auth0_id: auth0Id },
    include: { profile: true },
  })

  if (!user && email) {
    // Create user on first login
    user = await prisma.user.create({
      data: {
        auth0_id: auth0Id,
        email: email,
      },
      include: { profile: true },
    })
  }

  return user
}

/**
 * Protect API routes - requires authentication
 */
export { withApiAuthRequired }

/**
 * Protect pages - requires authentication
 */
export { withPageAuthRequired }
```

### 4.6 Create Auth Middleware

Create `middleware.ts` in root:

```typescript
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge'

export default withMiddlewareAuthRequired()

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/jobs/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/onboarding/:path*',
  ],
}
```

---

## 5. Project Structure

### 5.1 Create Directory Structure

```bash
mkdir -p app/{auth,api,\(auth\),\(main\),\(onboarding\)}
mkdir -p components/{ui,forms,jobs,layout}
mkdir -p lib
mkdir -p inngest/functions
mkdir -p prompts/{resume,cover-letter,scoring,research}
mkdir -p public/{images,fonts}
```

### 5.2 Final Structure

```
klevr-career-assistant/
├── app/
│   ├── (auth)/                 # Auth pages (login, signup)
│   ├── (main)/                 # Main app (requires auth)
│   │   ├── dashboard/
│   │   ├── jobs/
│   │   ├── profile/
│   │   └── settings/
│   ├── (onboarding)/           # Onboarding flow
│   │   ├── basics/
│   │   ├── preferences/
│   │   ├── resume-upload/
│   │   └── resume-review/
│   ├── api/                    # API routes
│   │   ├── auth/
│   │   ├── jobs/
│   │   ├── ai/
│   │   └── documents/
│   ├── auth/
│   │   └── callback/
│   ├── legal/
│   │   ├── privacy/
│   │   └── terms/
│   ├── layout.tsx
│   └── page.tsx                # Landing page
├── components/
│   ├── ui/                     # shadcn components
│   ├── forms/                  # Form components
│   ├── jobs/                   # Job-specific components
│   └── layout/                 # Layout components
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   ├── openai.ts
│   ├── s3.ts
│   ├── inngest.ts
│   └── utils.ts
├── inngest/
│   ├── client.ts
│   └── functions/
├── prompts/
│   ├── resume/
│   ├── cover-letter/
│   ├── scoring/
│   └── research/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── .env.local
├── .eslintrc.json
├── .prettierrc
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 6. Development Tooling

### 6.1 ESLint Configuration

Update `.eslintrc.json`:

```json
{
  "extends": ["next/core-web-vitals", "plugin:@typescript-eslint/recommended", "prettier"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

### 6.2 Prettier Configuration

Create `.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

Create `.prettierignore`:

```
node_modules
.next
out
build
dist
*.lock
.env*
```

### 6.3 Husky & Lint-Staged

Initialize Husky:

```bash
npx husky install
npm set-script prepare "husky install"
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## 7. Tailwind & shadcn/ui Setup

### 7.1 Configure Tailwind

Update `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#EEEBD9',
        secondary: '#282427',
        'accent-orange': '#EE7B30',
        'accent-teal': '#2292A4',
        border: '#E5E7EB',
        input: '#D1D5DB',
        background: '#FFFFFF',
        foreground: '#282427',
        error: '#DC2626',
        warning: '#F59E0B',
        success: '#16A34A',
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
        heading: ['Lora', 'serif'],
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '10px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

### 7.2 Initialize shadcn/ui

```bash
npx shadcn-ui@latest init
```

Configuration:

- Style: Default
- Base color: Neutral
- CSS variables: Yes

### 7.3 Install Core shadcn Components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add form
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add badge
```

---

## 8. Environment Management

### 8.1 Create `.env.example`

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth0
AUTH0_SECRET=""
AUTH0_BASE_URL="http://localhost:3000"
AUTH0_ISSUER_BASE_URL=""
AUTH0_CLIENT_ID=""
AUTH0_CLIENT_SECRET=""

# OpenAI
OPENAI_API_KEY=""

# AWS S3
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
AWS_S3_BUCKET=""

# Inngest
INNGEST_EVENT_KEY=""
INNGEST_SIGNING_KEY=""

# Resend
RESEND_API_KEY=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 8.2 Update `.gitignore`

```
# dependencies
node_modules
.pnp
.pnp.js

# testing
coverage

# next.js
.next
out

# production
build
dist

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# vercel
.vercel

# prisma
prisma/migrations/*_dev.sql
prisma/dev.db
prisma/dev.db-journal

# typescript
*.tsbuildinfo
next-env.d.ts
```

---

## 9. NPM Scripts

Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "prepare": "husky install"
  }
}
```

---

## 10. Utility Functions

### 10.1 Create `lib/utils.ts`

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Get current month string (YYYY-MM)
 */
export function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
```

---

## 11. Testing Setup

### 11.1 Configure Vitest

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

Create `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

### 11.2 Configure Playwright

```bash
npx playwright install
```

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 12. Landing Page Placeholder

Create `app/page.tsx`:

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-2xl text-center">
        <h1 className="font-heading text-5xl font-bold mb-6">
          Get hired faster with an AI career copilot
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Score job postings, tailor your resume and cover letters, and track every application
          in one clean dashboard.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/api/auth/login">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/api/auth/login">
            <Button variant="secondary" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
```

---

## 13. Verification Checklist

Before proceeding to Stage 2, verify:

- [ ] Next.js app runs with `npm run dev`
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Prettier formats correctly (`npm run format`)
- [ ] Prisma generates client successfully
- [ ] Database connection works (test with Prisma Studio)
- [ ] Auth0 login/logout flow works
- [ ] Environment variables are properly set
- [ ] Git hooks run on commit
- [ ] All dependencies installed without errors
- [ ] Project structure matches specification

---

## 14. Common Issues & Solutions

### Issue: Prisma Client not found

**Solution:** Run `npx prisma generate`

### Issue: Auth0 callback fails

**Solution:** Check callback URL configuration in Auth0 dashboard matches `AUTH0_BASE_URL/auth/callback`

### Issue: TypeScript errors in shadcn components

**Solution:** Ensure `components.json` has correct alias configuration

### Issue: Tailwind classes not applying

**Solution:** Check `content` paths in `tailwind.config.ts` include all component directories

### Issue: Environment variables not loading

**Solution:** Restart dev server after changing `.env.local`

---

## 15. Next Steps

Once this stage is complete, proceed to:

- **Stage 2: User Profile & Onboarding** - Build the onboarding flow and resume parsing

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Auth0 Next.js SDK](https://auth0.com/docs/quickstart/webapp/nextjs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
