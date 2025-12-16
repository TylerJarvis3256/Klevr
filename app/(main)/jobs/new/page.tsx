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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const JOB_SOURCES = [
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'INDEED', label: 'Indeed' },
  { value: 'GLASSDOOR', label: 'Glassdoor' },
  { value: 'HANDSHAKE', label: 'Handshake' },
  { value: 'COMPANY_WEBSITE', label: 'Company Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'OTHER', label: 'Other' },
] as const

const jobSchema = z.object({
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company name is required'),
  location: z.string().optional(),
  job_source: z.enum([
    'LINKEDIN',
    'INDEED',
    'GLASSDOOR',
    'HANDSHAKE',
    'COMPANY_WEBSITE',
    'REFERRAL',
    'OTHER',
  ], { message: 'Please select where you found this job' }),
  job_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  job_description_raw: z.string().min(10, 'Job description is required'),
})

type JobFormData = z.infer<typeof jobSchema>

export default function NewJobPage() {
  const router = useRouter()
  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      company: '',
      location: '',
      job_source: undefined,
      job_url: '',
      job_description_raw: '',
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

      toast.success('Job added successfully!', {
        description: "We're analyzing the fit for this role.",
        action: {
          label: 'Add Another',
          onClick: () => {
            form.reset()
            router.push('/jobs/new')
          },
        },
        duration: 5000,
      })

      router.push(`/jobs/${job.id}`)
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to add job',
      })
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="font-lora text-4xl font-bold text-secondary mb-2">Add a Job</h1>
        <p className="text-secondary/80">
          Paste the job description and we'll assess how well it fits your profile.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
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
              name="job_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Where did you find this job? *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a source" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {JOB_SOURCES.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                variant="outline"
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
    </div>
  )
}
