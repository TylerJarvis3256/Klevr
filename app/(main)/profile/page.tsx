'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { MultiSelect } from '@/components/ui/multi-select'
import { LocationInput } from '@/components/forms/location-input'
import { SkillsInput } from '@/components/forms/skills-input'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const JOB_TYPES = [
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'FULL_TIME', label: 'Full-Time' },
  { value: 'PART_TIME', label: 'Part-Time' },
  { value: 'CONTRACT', label: 'Contract' },
]

const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  school: z.string().min(1, 'School is required'),
  major: z.string().min(1, 'Major is required'),
  graduation_year: z.number().int().min(2020).max(2035),
  job_types: z.array(z.string()).min(1, 'Select at least one job type'),
  preferred_locations: z.array(z.string()).min(1, 'Add at least one location'),
  skills: z.array(z.string()),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [resumeInfo, setResumeInfo] = useState<any>(null)

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      school: '',
      major: '',
      graduation_year: new Date().getFullYear() + 1,
      job_types: [],
      preferred_locations: [],
      skills: [],
    },
  })

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile')
        if (!res.ok) {
          throw new Error('Failed to load profile')
        }

        const data = await res.json()
        if (data.profile) {
          form.reset({
            full_name: data.profile.full_name || '',
            school: data.profile.school || '',
            major: data.profile.major || '',
            graduation_year: data.profile.graduation_year || new Date().getFullYear() + 1,
            job_types: data.profile.job_types || [],
            preferred_locations: data.profile.preferred_locations || [],
            skills: data.profile.skills || [],
          })
          setResumeInfo({
            fileName: data.profile.resume_file_name,
            uploadedAt: data.profile.resume_uploaded_at,
            isConfirmed: !!data.profile.parsed_resume_confirmed_at,
          })
        }
      } catch (error) {
        toast.error('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [form])

  async function onSubmitBasics(data: ProfileFormData) {
    try {
      const res = await fetch('/api/profile/basics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.full_name,
          school: data.school,
          major: data.major,
          graduation_year: data.graduation_year,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update')
      }

      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  async function onSubmitPreferences(data: ProfileFormData) {
    try {
      const res = await fetch('/api/profile/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_types: data.job_types,
          preferred_locations: data.preferred_locations,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update')
      }

      toast.success('Preferences updated successfully')
    } catch (error) {
      toast.error('Failed to update preferences')
    }
  }

  async function onSubmitSkills(data: ProfileFormData) {
    try {
      const res = await fetch('/api/profile/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills: data.skills,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to update')
      }

      toast.success('Skills updated successfully')
    } catch (error) {
      toast.error('Failed to update skills')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-accent-teal" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="font-lora text-4xl font-bold text-secondary mb-2">Profile</h1>
        <p className="text-secondary/80">Manage your personal information and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <section className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
          <h2 className="font-lora text-2xl font-semibold text-secondary mb-6">Basic Information</h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitBasics)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="school"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School / University</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="major"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Major / Field of Study</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="graduation_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Graduation Year</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </section>

        {/* Job Preferences */}
        <section className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
          <h2 className="font-lora text-2xl font-semibold text-secondary mb-6">Job Preferences</h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitPreferences)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="job_types"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Types</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={JOB_TYPES}
                        selected={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_locations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Locations</FormLabel>
                    <FormControl>
                      <LocationInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </form>
          </Form>
        </section>

        {/* Skills */}
        <section className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
          <h2 className="font-lora text-2xl font-semibold text-secondary mb-6">Skills</h2>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitSkills)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Skills</FormLabel>
                    <FormControl>
                      <SkillsInput
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Skills'}
                </Button>
              </div>
            </form>
          </Form>
        </section>

        {/* Resume Information */}
        <section className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
          <h2 className="font-lora text-2xl font-semibold text-secondary mb-4">Resume</h2>
          {resumeInfo?.fileName ? (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">File:</span> {resumeInfo.fileName}
              </p>
              {resumeInfo.uploadedAt && (
                <p className="text-sm text-secondary/70">
                  Uploaded on {new Date(resumeInfo.uploadedAt).toLocaleDateString()}
                </p>
              )}
              <p className="text-sm">
                <span className="font-medium">Status:</span>{' '}
                {resumeInfo.isConfirmed ? (
                  <span className="text-status-success">Confirmed</span>
                ) : (
                  <span className="text-status-warning">Not Confirmed</span>
                )}
              </p>
            </div>
          ) : (
            <p className="text-secondary/70">No resume uploaded</p>
          )}
        </section>
      </div>
    </div>
  )
}
