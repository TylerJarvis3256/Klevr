# Stages 8-14: Complete Implementation Guide

**Overview Document** - Detailed guides for remaining stages

---

## Stage 8: Dashboard & Pipeline

### Overview
Build the main dashboard with pipeline view, stats, and filters.

### Key Deliverables
1. **Dashboard Layout** (`/dashboard`)
   - Stat cards (applications this month, response rate, active interviews)
   - Pipeline Kanban view (columns for each status)
   - Application cards with fit badges
   - Mobile-responsive tabs

2. **Stats Calculation**
   ```typescript
   // lib/dashboard-stats.ts
   export async function getDashboardStats(userId: string) {
     const applications = await prisma.application.findMany({
       where: { user_id: userId },
     })

     const thisMonth = getCurrentMonth()
     const thisMonthApps = applications.filter(app =>
       format(app.created_at, 'yyyy-MM') === thisMonth
     )

     const applied = applications.filter(a => a.status !== 'PLANNED')
     const responses = applications.filter(a =>
       ['INTERVIEW', 'OFFER'].includes(a.status)
     )

     return {
       applicationsThisMonth: thisMonthApps.length,
       responseRate: applied.length > 0 ? (responses.length / applied.length) * 100 : 0,
       activeInterviews: applications.filter(a => a.status === 'INTERVIEW').length,
     }
   }
   ```

3. **Pipeline Component**
   ```typescript
   // components/dashboard/pipeline.tsx
   - Columns: Planned, Applied, Interview, Offer, Rejected
   - Drag-and-drop with @dnd-kit (desktop)
   - Status dropdown (mobile)
   - Application cards show: title, company, fit badge, last updated
   ```

4. **Filters**
   - Stage filter (All / Active only)
   - Fit bucket filter
   - Search bar
   - URL query persistence

### Implementation Notes
- Use `@dnd-kit/core` for drag-and-drop
- Store filter state in URL params
- Persist filter preferences in localStorage
- Mobile: tabs instead of columns

---

## Stage 9: Document Management

### Overview
S3 file access, presigned URLs, document downloads.

### Key Deliverables

1. **Presigned URL Generation**
   ```typescript
   // app/api/documents/[id]/download/route.ts
   export async function GET(req, { params }) {
     const user = await getCurrentUser()
     const document = await prisma.generatedDocument.findFirst({
       where: {
         id: params.id,
         application: { user_id: user.id },
       },
     })

     if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 })

     const downloadUrl = await generateDownloadUrl(document.storage_url, 900) // 15 min

     return NextResponse.json({
       url: downloadUrl,
       expires_in: 900,
     })
   }
   ```

2. **Document Viewer Component**
   ```typescript
   // components/documents/document-viewer.tsx
   - List all generated documents
   - Show type, version, created date
   - "View" button (opens in new tab)
   - "Download" button
   - Auto-refresh expired URLs
   ```

3. **Document Versioning**
   - Store prompt_version in GeneratedDocument
   - Allow regeneration with newer prompts
   - Show version history

---

## Stage 10: Notes & Bulk Operations

### Overview
Application notes and bulk actions on jobs list.

### Key Deliverables

1. **Notes CRUD**
   ```typescript
   // API routes
   POST /api/notes - Create note
   PATCH /api/notes/[id] - Update note
   DELETE /api/notes/[id] - Delete note

   // Component
   - Text area for new note
   - List of notes with timestamps
   - Edit/delete actions
   ```

2. **Bulk Operations**
   ```typescript
   // components/jobs/jobs-table.tsx
   - Multi-select checkboxes
   - Bulk actions toolbar (appears when items selected)
   - Actions:
     - Bulk status update
     - Bulk delete
     - Bulk archive (future)

   // API
   POST /api/applications/bulk-update
   {
     "applicationIds": ["id1", "id2"],
     "action": "update_status",
     "data": { "status": "APPLIED" }
   }
   ```

---

## Stage 11: Settings & Usage

### Overview
Account settings, notification preferences, AI usage dashboard.

### Key Deliverables

1. **Account Settings** (`/settings/account`)
   - Email display (readonly - from Auth0)
   - Password change (link to Auth0)
   - OAuth connections
   - Account deletion

   ```typescript
   // Account deletion endpoint
   POST /api/settings/delete-account
   - Soft-delete user (set deleted_at)
   - Anonymize data
   - Schedule hard delete after 30 days
   ```

2. **Notification Preferences** (`/settings/notifications`)
   - Email for application updates (future)
   - Weekly summary emails (future)
   - For MVP: Basic structure only

3. **Usage Dashboard** (`/settings/usage`)
   ```typescript
   // Display current month usage
   - Resume generations: 12 / 30
   - Cover letters: 8 / 30
   - Job assessments: 45 / 200

   // Visual progress bars
   - Warning at 80% threshold
   - Reset date display
   ```

---

## Stage 12: UI/UX Polish

### Overview
Mobile responsiveness, empty states, loading states, accessibility.

### Key Deliverables

1. **Mobile Responsiveness**
   - Pipeline: tabs instead of columns
   - Navigation: hamburger menu
   - Forms: stack vertically
   - Tables: card view on mobile

2. **Empty States**
   ```typescript
   // components/ui/empty-state.tsx
   - Icon
   - Message
   - CTA button

   // Examples:
   - No jobs yet → "Add your first job"
   - No documents → "Generate tailored resume"
   - No notes → "Add notes about this application"
   ```

3. **Loading States**
   - Skeleton loaders
   - Spinner components
   - Optimistic updates

4. **Error Handling**
   - Toast notifications
   - Form validation messages
   - API error boundaries
   - Retry buttons

5. **Accessibility**
   - Semantic HTML
   - ARIA labels
   - Keyboard navigation
   - Focus management
   - Color contrast (WCAG AA)

---

## Stage 13: Testing & QA

### Overview
Comprehensive testing strategy.

### Test Categories

1. **Unit Tests** (Vitest)
   ```typescript
   // lib/__tests__/fit-scorer.test.ts
   describe('calculateFitScore', () => {
     it('should return EXCELLENT for perfect match', () => {
       const score = calculateFitScore(mockResume, mockJob, mockPrefs)
       expect(score.fit_bucket).toBe('EXCELLENT')
       expect(score.fit_score).toBeGreaterThan(0.8)
     })
   })

   // Test coverage for:
   - Fit scoring algorithm
   - Skills matching
   - Resume parsing
   - Utility functions
   ```

2. **Integration Tests**
   ```typescript
   // app/api/__tests__/jobs.test.ts
   describe('POST /api/jobs', () => {
     it('should create job and application', async () => {
       const res = await POST(mockRequest)
       expect(res.status).toBe(201)
       // Verify DB records created
     })

     it('should reject without resume confirmation', async () => {
       // Test authorization and validation
     })
   })
   ```

3. **E2E Tests** (Playwright)
   ```typescript
   // e2e/onboarding.spec.ts
   test('complete onboarding flow', async ({ page }) => {
     await page.goto('/onboarding/basics')
     await page.fill('[name="full_name"]', 'Test User')
     // ... complete all steps
     await expect(page).toHaveURL('/dashboard')
   })

   // e2e/job-application.spec.ts
   test('add job and view fit assessment', async ({ page }) => {
     // Create job
     // Wait for fit assessment
     // Verify fit badge appears
   })
   ```

4. **Test Coverage Goals**
   - Unit tests: >80% for lib/
   - Integration: All API routes
   - E2E: Critical user flows
   - Permissions: User data isolation

---

## Stage 14: Deployment & DevOps

### Overview
Production deployment, monitoring, CI/CD.

### Key Deliverables

1. **Vercel Configuration**
   ```json
   // vercel.json
   {
     "buildCommand": "npm run build",
     "devCommand": "npm run dev",
     "installCommand": "npm install",
     "framework": "nextjs",
     "regions": ["iad1"]
   }
   ```

2. **Environment Variables**
   - Set in Vercel dashboard
   - Separate staging/production
   - Use Vercel CLI for preview deployments

3. **CI/CD Pipeline** (GitHub Actions)
   ```yaml
   # .github/workflows/ci.yml
   name: CI
   on: [pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
         - run: npm ci
         - run: npm run lint
         - run: npm run typecheck
         - run: npm run test

   # .github/workflows/deploy.yml
   name: Deploy
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: amondnet/vercel-action@v25
   ```

4. **Database Migrations**
   ```bash
   # Production migration workflow
   1. Test migration in staging
   2. Backup production DB
   3. Run: npx prisma migrate deploy
   4. Verify deployment
   ```

5. **Monitoring Setup**

   **Sentry** (Error Tracking)
   ```typescript
   // sentry.client.config.ts
   import * as Sentry from '@sentry/nextjs'

   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 0.1,
   })
   ```

   **Plausible/PostHog** (Analytics)
   ```typescript
   // Track events
   plausible('Job Created', {
     props: { source: 'manual', has_description: true }
   })
   ```

6. **Logging**
   ```typescript
   // lib/logger.ts
   import pino from 'pino'

   export const logger = pino({
     level: process.env.LOG_LEVEL || 'info',
     transport: {
       target: 'pino-pretty',
       options: { colorize: true },
     },
   })

   // Usage
   logger.info({ userId, jobId }, 'Job created')
   logger.error({ error }, 'AI generation failed')
   ```

7. **Backup & Recovery**
   - Supabase daily backups (automatic)
   - S3 versioning enabled
   - Recovery playbook documented

8. **Runbook**
   ```markdown
   # Production Runbook

   ## Common Issues

   ### AI Task Stuck in PENDING
   1. Check Inngest dashboard
   2. Verify event was sent
   3. Check function logs
   4. Manual retry if needed

   ### High Error Rate
   1. Check Sentry dashboard
   2. Identify error patterns
   3. Rollback if critical
   4. Fix and redeploy

   ## Deployment Checklist
   - [ ] Run migrations in staging
   - [ ] Test critical flows
   - [ ] Merge to main
   - [ ] Monitor Vercel deployment
   - [ ] Check Sentry for new errors
   - [ ] Verify key metrics
   ```

---

## Final Verification Checklist

### Functionality
- [ ] User can complete onboarding
- [ ] Resume parsing works
- [ ] Jobs can be created
- [ ] Fit assessment generates
- [ ] Resumes generate
- [ ] Cover letters generate
- [ ] Company research generates
- [ ] Documents download
- [ ] Pipeline view works
- [ ] Filters persist
- [ ] Notes CRUD works
- [ ] Bulk operations work
- [ ] Usage limits enforced
- [ ] Settings work

### Security
- [ ] All queries scoped by user_id
- [ ] Auth middleware protects routes
- [ ] Input validation on all endpoints
- [ ] Presigned URLs expire
- [ ] No data leakage between users
- [ ] Rate limiting implemented
- [ ] CORS configured

### Performance
- [ ] Page load < 2s
- [ ] AI tasks complete < 60s
- [ ] Database queries optimized
- [ ] Images optimized
- [ ] Bundle size reasonable

### UX
- [ ] Mobile responsive
- [ ] Empty states present
- [ ] Loading states clear
- [ ] Error messages helpful
- [ ] Accessible (WCAG AA)
- [ ] Keyboard navigation works

### DevOps
- [ ] CI/CD pipeline working
- [ ] Monitoring active
- [ ] Logs aggregated
- [ ] Backups configured
- [ ] Runbook documented

---

## Post-MVP Roadmap

### Phase 2 Features
1. AI job recommendations
2. Interview preparation
3. Conversational AI chatbot
4. AI strengths/weaknesses analysis
5. Advanced analytics
6. Export functionality

### Phase 3 Infrastructure
1. Real-time multi-device sync
2. Websocket notifications
3. Advanced caching
4. CDN for static assets
5. Advanced rate limiting

### Phase 4 Scale
1. Microservices architecture (if needed)
2. Dedicated AI processing cluster
3. Advanced monitoring
4. A/B testing framework

---

## Success Metrics Tracking

### Technical Metrics
- Uptime: Target 99.9%
- P95 response time: < 2s
- AI task success rate: > 95%
- Error rate: < 1%

### Product Metrics
- Onboarding completion: > 70%
- Jobs per active user: 5+
- Document generation rate: > 60%
- 7-day retention: > 50%
- 30-day retention: > 30%

---

## Conclusion

This completes the comprehensive implementation plan for Klevr v1. Each stage builds on previous stages, and the critical path ensures core features are delivered first. Following this plan ensures a systematic, thorough implementation with quality at every step.

**Ready to implement? Start with Stage 1 and proceed sequentially!**
