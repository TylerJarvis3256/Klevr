# Stage 3: Job Management

**Stage:** 3 of 14
**Dependencies:** Stage 2 (User Profile & Onboarding)
**Estimated Effort:** Major feature implementation

---

## Overview

This stage implements the core job and application management functionality. Users can manually add jobs, view job details, track application status, and perform basic CRUD operations.

### Goals

- Implement manual job creation flow
- Build job detail page with full information display
- Create jobs list view with filtering and search
- Implement application status tracking
- Build status transition UI
- Create basic job validation

---

## 1. Data Flow Architecture

```
User adds job (title, company, description, URL, location)
    ↓
API validates and creates Job record
    ↓
API creates linked Application record (status: PLANNED)
    ↓
API triggers fit assessment job (async)
    ↓
User redirected to job detail page
```

---

## 2. API Routes

### 2.1 Create Job

**Route:** `POST /api/jobs`

**File:** `/app/api/jobs/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { inngest } from '@/lib/inngest'

const createJobSchema = z.object({
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company name is required'),
  job_description_raw: z.string().min(1, 'Job description is required'),
  job_url: z.string().url().optional().or(z.literal('')),
  location: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createJobSchema.parse(body)

    // Validate at least description OR URL is provided
    if (!data.job_description_raw && !data.job_url) {
      return NextResponse.json(
        { error: 'Either job description or job URL is required' },
        { status: 400 }
      )
    }

    // Check if user has confirmed resume
    const profile = await prisma.profile.findUnique({
      where: { user_id: user.id },
      select: { parsed_resume_confirmed_at: true },
    })

    if (!profile?.parsed_resume_confirmed_at) {
      return NextResponse.json(
        { error: 'Please complete your profile and confirm your resume first' },
        { status: 400 }
      )
    }

    // Create job and application in transaction
    const result = await prisma.$transaction(async tx => {
      const job = await tx.job.create({
        data: {
          user_id: user.id,
          title: data.title,
          company: data.company,
          job_description_raw: data.job_description_raw,
          job_url: data.job_url || null,
          location: data.location || null,
        },
      })

      const application = await tx.application.create({
        data: {
          user_id: user.id,
          job_id: job.id,
          status: 'PLANNED',
        },
      })

      return { job, application }
    })

    // Trigger fit assessment asynchronously
    await inngest.send({
      name: 'job/assess-fit',
      data: {
        userId: user.id,
        applicationId: result.application.id,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const fitBucket = searchParams.get('fit_bucket')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {
      user_id: user.id,
    }

    if (status) {
      where.status = status
    }

    if (fitBucket) {
      where.fit_bucket = fitBucket
    }

    if (search) {
      where.OR = [
        { job: { title: { contains: search, mode: 'insensitive' } } },
        { job: { company: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        include: {
          job: true,
        },
        orderBy: { updated_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.application.count({ where }),
    ])

    return NextResponse.json({
      applications,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 2.2 Get Job Detail

**Route:** `GET /api/jobs/[id]`

**File:** `/app/api/jobs/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const job = await prisma.job.findFirst({
      where: {
        id: params.id,
        user_id: user.id,
      },
      include: {
        applications: {
          include: {
            generated_documents: {
              orderBy: { created_at: 'desc' },
            },
            notes: {
              orderBy: { created_at: 'desc' },
            },
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, company, job_description_raw, job_url, location } = body

    const job = await prisma.job.updateMany({
      where: {
        id: params.id,
        user_id: user.id,
      },
      data: {
        ...(title && { title }),
        ...(company && { company }),
        ...(job_description_raw && { job_description_raw }),
        ...(job_url !== undefined && { job_url }),
        ...(location !== undefined && { location }),
      },
    })

    if (job.count === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deleted = await prisma.job.deleteMany({
      where: {
        id: params.id,
        user_id: user.id,
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 2.3 Update Application Status

**Route:** `PATCH /api/applications/[id]/status`

**File:** `/app/api/applications/[id]/status/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { ApplicationStatus } from '@prisma/client'

const updateStatusSchema = z.object({
  status: z.enum(['PLANNED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED']),
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = updateStatusSchema.parse(body)

    // Set applied_at timestamp when moving to APPLIED status
    const updateData: any = { status }
    if (status === 'APPLIED') {
      updateData.applied_at = new Date()
    }

    const application = await prisma.application.updateMany({
      where: {
        id: params.id,
        user_id: user.id,
      },
      data: updateData,
    })

    if (application.count === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error updating application status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## 3. Pages

### 3.1 Add Job Page

**File:** `/app/(main)/jobs/new/page.tsx`

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from '@/components/ui/use-toast'

const jobSchema = z.object({
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company name is required'),
  job_description_raw: z.string().min(10, 'Job description is required'),
  job_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  location: z.string().optional(),
})

type JobFormData = z.infer<typeof jobSchema>

export default function NewJobPage() {
  const router = useRouter()
  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      company: '',
      job_description_raw: '',
      job_url: '',
      location: '',
    },
  })

  async function onSubmit(data: JobFormData) {
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create job')
      }

      const { job } = await res.json()

      toast({
        title: 'Job added successfully!',
        description: 'We\'re analyzing the fit for this role.',
      })

      router.push(`/jobs/${job.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add job',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Add a Job</h1>
        <p className="text-gray-600">
          Paste the job description and we'll assess how well it fits your profile.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Title *</FormLabel>
                <FormControl>
                  <Input placeholder="Software Engineering Intern" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company *</FormLabel>
                <FormControl>
                  <Input placeholder="Google" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Mountain View, CA" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="job_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Posting URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://example.com/careers/job-123"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Link to the job posting (optional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="job_description_raw"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Description *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Paste the full job description here..."
                    className="min-h-[300px] font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Copy and paste the complete job description
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/jobs')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Adding...' : 'Add Job'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
```

### 3.2 Job Detail Page

**File:** `/app/(main)/jobs/[id]/page.tsx`

```typescript
import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { JobHeader } from '@/components/jobs/job-header'
import { JobDescription } from '@/components/jobs/job-description'
import { FitAssessment } from '@/components/jobs/fit-assessment'
import { CompanyResearch } from '@/components/jobs/company-research'
import { DocumentsList } from '@/components/jobs/documents-list'
import { NotesList } from '@/components/jobs/notes-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface JobDetailPageProps {
  params: { id: string }
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const user = await getCurrentUser()
  if (!user) return null

  const job = await prisma.job.findFirst({
    where: {
      id: params.id,
      user_id: user.id,
    },
    include: {
      applications: {
        include: {
          generated_documents: {
            orderBy: { created_at: 'desc' },
          },
          notes: {
            orderBy: { created_at: 'desc' },
          },
        },
      },
    },
  })

  if (!job) {
    notFound()
  }

  const application = job.applications[0]

  return (
    <div className="container max-w-5xl py-8">
      <JobHeader job={job} application={application} />

      <Tabs defaultValue="description" className="mt-8">
        <TabsList>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="fit">Fit & Insights</TabsTrigger>
          <TabsTrigger value="company">Company Research</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-6">
          <JobDescription job={job} />
        </TabsContent>

        <TabsContent value="fit" className="mt-6">
          <FitAssessment application={application} />
        </TabsContent>

        <TabsContent value="company" className="mt-6">
          <CompanyResearch application={application} company={job.company} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsList
            documents={application.generated_documents}
            applicationId={application.id}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <NotesList notes={application.notes} applicationId={application.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### 3.3 Jobs List Page

**File:** `/app/(main)/jobs/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { JobsTable } from '@/components/jobs/jobs-table'
import { Plus, Search } from 'lucide-react'

export default function JobsListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [fitBucket, setFitBucket] = useState(searchParams.get('fit_bucket') || 'all')

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', { search, status, fitBucket }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status !== 'all') params.set('status', status)
      if (fitBucket !== 'all') params.set('fit_bucket', fitBucket)

      const res = await fetch(`/api/jobs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch jobs')
      return res.json()
    },
  })

  function updateFilters() {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status !== 'all') params.set('status', status)
    if (fitBucket !== 'all') params.set('fit_bucket', fitBucket)

    router.push(`/jobs?${params}`)
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="font-heading text-3xl font-bold">Jobs</h1>
        <Link href="/jobs/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Job
          </Button>
        </Link>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search jobs or companies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && updateFilters()}
            className="pl-10"
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PLANNED">Planned</SelectItem>
            <SelectItem value="APPLIED">Applied</SelectItem>
            <SelectItem value="INTERVIEW">Interview</SelectItem>
            <SelectItem value="OFFER">Offer</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={fitBucket} onValueChange={setFitBucket}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Fit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fits</SelectItem>
            <SelectItem value="EXCELLENT">Excellent Fit</SelectItem>
            <SelectItem value="GOOD">Good Fit</SelectItem>
            <SelectItem value="FAIR">Fair Fit</SelectItem>
            <SelectItem value="POOR">Poor Fit</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={updateFilters}>Apply Filters</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : data?.applications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No jobs found. Add your first job to get started!</p>
          <Link href="/jobs/new">
            <Button>Add Your First Job</Button>
          </Link>
        </div>
      ) : (
        <JobsTable applications={data?.applications || []} />
      )}
    </div>
  )
}
```

---

## 4. Components

### 4.1 Job Header

**File:** `components/jobs/job-header.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ExternalLink, MapPin, Pencil, Trash2 } from 'lucide-react'
import type { Job, Application } from '@prisma/client'
import { toast } from '@/components/ui/use-toast'

interface JobHeaderProps {
  job: Job
  application: Application
}

const STATUS_LABELS = {
  PLANNED: 'Planned',
  APPLIED: 'Applied',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
}

const FIT_COLORS = {
  EXCELLENT: 'bg-green-100 text-green-800',
  GOOD: 'bg-blue-100 text-blue-800',
  FAIR: 'bg-yellow-100 text-yellow-800',
  POOR: 'bg-red-100 text-red-800',
}

export function JobHeader({ job, application }: JobHeaderProps) {
  const router = useRouter()
  const [status, setStatus] = useState(application.status)

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await fetch(`/api/applications/${application.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update status')

      setStatus(newStatus as any)
      toast({ title: 'Status updated successfully' })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this job?')) return

    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')

      toast({ title: 'Job deleted successfully' })
      router.push('/jobs')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete job',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="border-b pb-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="font-heading text-3xl font-bold mb-2">{job.title}</h1>
          <div className="flex items-center gap-4 text-gray-600 mb-4">
            <span className="text-lg font-medium">{job.company}</span>
            {job.location && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{job.location}</span>
                </div>
              </>
            )}
            {job.job_url && (
              <>
                <span>•</span>
                <a
                  href={job.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-accent-teal hover:underline"
                >
                  View Posting
                  <ExternalLink className="w-4 h-4" />
                </a>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {application.fit_bucket && (
              <Badge className={FIT_COLORS[application.fit_bucket]}>
                {application.fit_bucket.charAt(0) + application.fit_bucket.slice(1).toLowerCase()} Fit
              </Badge>
            )}

            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="icon">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 4.2 Jobs Table

**File:** `components/jobs/jobs-table.tsx`

```typescript
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import type { Application, Job } from '@prisma/client'

interface JobsTableProps {
  applications: (Application & { job: Job })[]
}

export function JobsTable({ applications }: JobsTableProps) {
  return (
    <div className="border rounded-lg">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Job Title</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Company</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Status</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Fit</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Updated</th>
          </tr>
        </thead>
        <tbody>
          {applications.map(app => (
            <tr key={app.id} className="border-t hover:bg-gray-50">
              <td className="px-6 py-4">
                <Link href={`/jobs/${app.job.id}`} className="text-accent-teal hover:underline">
                  {app.job.title}
                </Link>
              </td>
              <td className="px-6 py-4">{app.job.company}</td>
              <td className="px-6 py-4">
                <Badge variant="outline">{app.status}</Badge>
              </td>
              <td className="px-6 py-4">
                {app.fit_bucket ? <Badge>{app.fit_bucket}</Badge> : <span className="text-gray-400">Analyzing...</span>}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {formatDate(app.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## 5. Verification Checklist

- [ ] Can create jobs with all required fields
- [ ] Job creation validates title + company + description
- [ ] Application automatically created with PLANNED status
- [ ] Job detail page displays all information
- [ ] Status dropdown updates application status
- [ ] Jobs list displays with filters
- [ ] Search works for title and company
- [ ] Status filter works
- [ ] Fit bucket filter works
- [ ] Can delete jobs
- [ ] All queries scoped by user_id
- [ ] Error handling for missing jobs

---

## 6. Next Steps

Proceed to **Stage 4: AI Infrastructure** to set up Inngest and async AI task processing.
