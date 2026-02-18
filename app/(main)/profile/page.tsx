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
import { EducationEditor } from '@/components/profile/education-editor'
import { ExperienceEditor } from '@/components/profile/experience-editor'
import { ProjectEditor } from '@/components/profile/project-editor'
import { ResumeList } from '@/components/profile/resume-list'
import { ResumeUploader } from '@/components/profile/resume-uploader'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Education, JobExperience, Bullet, Project } from '@prisma/client'

type ExperienceWithBullets = JobExperience & { Bullets: Bullet[] }
type ProjectWithBullets = Project & { Bullets: Bullet[] }

interface ResumeUpload {
  id: string
  file_name: string
  file_type: string
  file_size: number
  uploaded_at: string
  parsed_at: string | null
  parsing_error: string | null
  source: string
}

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
  const [projects, setProjects] = useState<ProjectWithBullets[]>([])
  const [education, setEducation] = useState<Education[]>([])
  const [experiences, setExperiences] = useState<ExperienceWithBullets[]>([])
  const [resumes, setResumes] = useState<ResumeUpload[]>([])
  const [isLoadingResumes, setIsLoadingResumes] = useState(true)

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

  // Load profile data function (extracted for reuse)
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
        }

        // Load education
        const educationRes = await fetch('/api/profile/education')
        if (educationRes.ok) {
          const educationData = await educationRes.json()
          setEducation(educationData.education || [])
        }

        // Load experiences (with bullets)
        const experiencesRes = await fetch('/api/profile/experiences')
        if (experiencesRes.ok) {
          const experiencesData = await experiencesRes.json()
          setExperiences(experiencesData.experiences || [])
        }

        // Load projects (with bullets)
        const projectsRes = await fetch('/api/profile/projects')
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json()
          setProjects(projectsData.projects || [])
        }
      } catch (error) {
        toast.error('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
  }

  useEffect(() => {
    loadProfile()
    loadResumes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Project handlers
  async function handleAddProject(data: Partial<Project>) {
    try {
      const res = await fetch('/api/profile/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to add project')

      const { project: newProject } = await res.json()
      setProjects([...projects, { ...newProject, Bullets: [] }])
      toast.success('Project added successfully')
    } catch (error) {
      toast.error('Failed to add project')
    }
  }

  async function handleUpdateProject(id: string, data: Partial<Project>) {
    try {
      const res = await fetch(`/api/profile/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to update project')

      // Reload projects to get updated data
      const projectsRes = await fetch('/api/profile/projects')
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json()
        setProjects(projectsData.projects || [])
      }

      toast.success('Project updated successfully')
    } catch (error) {
      toast.error('Failed to update project')
    }
  }

  async function handleDeleteProject(id: string) {
    try {
      const res = await fetch(`/api/profile/projects/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete project')

      setProjects(projects.filter((p) => p.id !== id))
      toast.success('Project deleted successfully')
    } catch (error) {
      toast.error('Failed to delete project')
    }
  }

  // Project bullet handlers
  async function handleAddProjectBullet(projectId: string, data: Partial<Bullet>) {
    try {
      const res = await fetch(`/api/profile/projects/${projectId}/bullets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to add bullet')

      const { bullet: newBullet } = await res.json()
      setProjects(
        projects.map((proj) =>
          proj.id === projectId
            ? { ...proj, Bullets: [...proj.Bullets, newBullet] }
            : proj
        )
      )
      toast.success('Bullet added successfully')
    } catch (error) {
      toast.error('Failed to add bullet')
    }
  }

  // Education handlers
  async function handleAddEducation(data: Partial<Education>) {
    try {
      const res = await fetch('/api/profile/education', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to add education')

      const { education: newEducation } = await res.json()
      setEducation([...education, newEducation])
      toast.success('Education added successfully')
    } catch (error) {
      toast.error('Failed to add education')
    }
  }

  async function handleUpdateEducation(id: string, data: Partial<Education>) {
    try {
      const res = await fetch(`/api/profile/education/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to update education')

      const { education: updatedEducation } = await res.json()
      setEducation(education.map((e) => (e.id === id ? updatedEducation : e)))
      toast.success('Education updated successfully')
    } catch (error) {
      toast.error('Failed to update education')
    }
  }

  async function handleDeleteEducation(id: string) {
    try {
      const res = await fetch(`/api/profile/education/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete education')

      setEducation(education.filter((e) => e.id !== id))
      toast.success('Education deleted successfully')
    } catch (error) {
      toast.error('Failed to delete education')
    }
  }

  // Experience handlers
  async function handleAddExperience(data: Partial<JobExperience>) {
    try {
      const res = await fetch('/api/profile/experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to add experience')

      const { experience: newExperience } = await res.json()
      setExperiences([...experiences, { ...newExperience, Bullets: [] }])
      toast.success('Experience added successfully')
    } catch (error) {
      toast.error('Failed to add experience')
    }
  }

  async function handleUpdateExperience(id: string, data: Partial<JobExperience>) {
    try {
      const res = await fetch(`/api/profile/experiences/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to update experience')

      const { experience: updatedExperience } = await res.json()
      setExperiences(
        experiences.map((e) =>
          e.id === id ? { ...updatedExperience, Bullets: e.Bullets } : e
        )
      )
      toast.success('Experience updated successfully')
    } catch (error) {
      toast.error('Failed to update experience')
    }
  }

  async function handleDeleteExperience(id: string) {
    try {
      const res = await fetch(`/api/profile/experiences/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete experience')

      setExperiences(experiences.filter((e) => e.id !== id))
      toast.success('Experience deleted successfully')
    } catch (error) {
      toast.error('Failed to delete experience')
    }
  }

  // Bullet handlers (for experience bullets)
  async function handleAddBullet(experienceId: string, data: Partial<Bullet>) {
    try {
      const res = await fetch(`/api/profile/experiences/${experienceId}/bullets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to add bullet')

      const { bullet: newBullet } = await res.json()
      setExperiences(
        experiences.map((exp) =>
          exp.id === experienceId
            ? { ...exp, Bullets: [...exp.Bullets, newBullet] }
            : exp
        )
      )
      toast.success('Bullet added successfully')
    } catch (error) {
      toast.error('Failed to add bullet')
    }
  }

  async function handleUpdateBullet(id: string, data: Partial<Bullet>) {
    try {
      const res = await fetch(`/api/profile/bullets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error('Failed to update bullet')

      const { bullet: updatedBullet } = await res.json()

      // Update in experiences
      setExperiences(
        experiences.map((exp) => ({
          ...exp,
          Bullets: exp.Bullets.map((b) => (b.id === id ? updatedBullet : b)),
        }))
      )

      // Update in projects
      setProjects(
        projects.map((proj) => ({
          ...proj,
          Bullets: proj.Bullets.map((b) => (b.id === id ? updatedBullet : b)),
        }))
      )

      toast.success('Bullet updated successfully')
    } catch (error) {
      toast.error('Failed to update bullet')
    }
  }

  async function handleDeleteBullet(id: string) {
    try {
      const res = await fetch(`/api/profile/bullets/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete bullet')

      // Remove from experiences
      setExperiences(
        experiences.map((exp) => ({
          ...exp,
          Bullets: exp.Bullets.filter((b) => b.id !== id),
        }))
      )

      // Remove from projects
      setProjects(
        projects.map((proj) => ({
          ...proj,
          Bullets: proj.Bullets.filter((b) => b.id !== id),
        }))
      )

      toast.success('Bullet deleted successfully')
    } catch (error) {
      toast.error('Failed to delete bullet')
    }
  }

  // Resume management functions
  async function loadResumes() {
    try {
      setIsLoadingResumes(true)
      const res = await fetch('/api/profile/resumes')
      if (res.ok) {
        const data = await res.json()
        setResumes(data.resumes || [])
      }
    } catch (error) {
      console.error('Failed to load resumes:', error)
    } finally {
      setIsLoadingResumes(false)
    }
  }

  async function handleDeleteResume(id: string) {
    try {
      const res = await fetch(`/api/profile/resumes/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete resume')

      toast.success('Resume deleted successfully')
      loadResumes() // Refresh list
    } catch (error) {
      toast.error('Failed to delete resume')
    }
  }

  async function handleDownloadResume(id: string) {
    try {
      const res = await fetch(`/api/profile/resumes/${id}`)

      if (!res.ok) throw new Error('Failed to get download URL')

      const { downloadUrl } = await res.json()
      window.open(downloadUrl, '_blank')
    } catch (error) {
      toast.error('Failed to download resume')
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

        {/* Education */}
        <section className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
          <div className="mb-6">
            <h2 className="font-lora text-2xl font-semibold text-secondary mb-1">Education</h2>
            <p className="text-sm text-secondary/70">
              Add your educational background and academic achievements
            </p>
          </div>
          <EducationEditor
            education={education}
            onAdd={handleAddEducation}
            onUpdate={handleUpdateEducation}
            onDelete={handleDeleteEducation}
          />
        </section>

        {/* Work Experience */}
        <section className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
          <div className="mb-6">
            <h2 className="font-lora text-2xl font-semibold text-secondary mb-1">Work Experience</h2>
            <p className="text-sm text-secondary/70">
              Add your professional experience with detailed bullet points
            </p>
          </div>
          <ExperienceEditor
            experiences={experiences}
            onAdd={handleAddExperience}
            onUpdate={handleUpdateExperience}
            onDelete={handleDeleteExperience}
            onAddBullet={handleAddBullet}
            onUpdateBullet={handleUpdateBullet}
            onDeleteBullet={handleDeleteBullet}
          />
        </section>

        {/* Projects */}
        <section className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
          <div className="mb-6">
            <h2 className="font-lora text-2xl font-semibold text-secondary mb-1">Projects</h2>
            <p className="text-sm text-secondary/70">
              Showcase your work, technical achievements, and key accomplishments
            </p>
          </div>
          <ProjectEditor
            projects={projects}
            onAdd={handleAddProject}
            onUpdate={handleUpdateProject}
            onDelete={handleDeleteProject}
            onAddBullet={handleAddProjectBullet}
            onUpdateBullet={handleUpdateBullet}
            onDeleteBullet={handleDeleteBullet}
          />
        </section>

        {/* Resumes Section */}
        <section className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
          <div className="mb-6">
            <h2 className="font-lora text-2xl font-semibold text-secondary mb-1">Resumes</h2>
            <p className="text-sm text-secondary/70">
              Upload multiple resumes to build a comprehensive profile
            </p>
          </div>

          {isLoadingResumes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent-teal" />
            </div>
          ) : (
            <>
              <ResumeList
                resumes={resumes}
                onDelete={handleDeleteResume}
                onDownload={handleDownloadResume}
              />

              <div className="mt-6 pt-6 border-t border-secondary/10">
                <ResumeUploader onSuccess={loadResumes} />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
