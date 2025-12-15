'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ParsedResume } from '@/lib/resume-parser'

const resumeSchema = z.object({
  personal: z.object({
    name: z.string().nullable().optional(),
    email: z.string().email().nullable().optional().or(z.literal('')),
    phone: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    linkedin: z.string().url().nullable().optional().or(z.literal('')),
    github: z.string().url().nullable().optional().or(z.literal('')),
    website: z.string().url().nullable().optional().or(z.literal('')),
  }),
  education: z.array(z.object({
    school: z.string().min(1, 'School is required'),
    degree: z.string().nullable().optional(),
    major: z.string().nullable().optional(),
    graduationDate: z.string().nullable().optional(),
    gpa: z.string().nullable().optional(),
  })),
  experience: z.array(z.object({
    title: z.string().min(1, 'Title is required'),
    company: z.string().min(1, 'Company is required'),
    location: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    current: z.boolean(),
    bullets: z.array(z.string()),
  })),
  projects: z.array(z.object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().nullable().optional(),
    technologies: z.array(z.string()),
    url: z.string().url().nullable().optional().or(z.literal('')),
  })),
  skills: z.object({
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    tools: z.array(z.string()),
    other: z.array(z.string()),
  }),
  certifications: z.array(z.object({
    name: z.string().min(1, 'Certification name is required'),
    issuer: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
  })),
})

type ResumeFormData = z.infer<typeof resumeSchema>

interface ResumeEditorProps {
  initialData: ParsedResume | null
  onSubmit: (data: ParsedResume) => Promise<void>
  submitLabel?: string
}

export function ResumeEditor({ initialData, onSubmit, submitLabel = 'Save Resume' }: ResumeEditorProps) {
  const form = useForm<ResumeFormData>({
    resolver: zodResolver(resumeSchema),
    defaultValues: initialData || {
      personal: {},
      education: [],
      experience: [],
      projects: [],
      skills: { languages: [], frameworks: [], tools: [], other: [] },
      certifications: [],
    },
  })

  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({
    control: form.control,
    name: 'education',
  })

  const { fields: _experienceFields, append: _appendExperience, remove: _removeExperience } = useFieldArray({
    control: form.control,
    name: 'experience',
  })

  const { fields: _projectFields, append: _appendProject, remove: _removeProject } = useFieldArray({
    control: form.control,
    name: 'projects',
  })

  const { fields: _certificationFields, append: _appendCertification, remove: _removeCertification } = useFieldArray({
    control: form.control,
    name: 'certifications',
  })

  const handleSubmit = async (data: ResumeFormData) => {
    await onSubmit(data as ParsedResume)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Personal Information */}
        <section className="bg-white border border-secondary/10 rounded-card p-6">
          <h2 className="text-xl font-lora font-semibold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="personal.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personal.email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personal.phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personal.location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personal.linkedin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder="https://linkedin.com/in/..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personal.github"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GitHub</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder="https://github.com/..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* Education */}
        <section className="bg-white border border-secondary/10 rounded-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-lora font-semibold">Education</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => appendEducation({ school: '', degree: '', major: '', graduationDate: '', gpa: '' })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Education
            </Button>
          </div>
          <div className="space-y-4">
            {educationFields.map((field, index) => (
              <div key={field.id} className="border border-secondary/20 rounded-lg p-4 relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => removeEducation(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`education.${index}.school`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`education.${index}.degree`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Degree</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`education.${index}.major`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Major</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`education.${index}.graduationDate`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Graduation Date</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} placeholder="May 2025" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
