'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Plus, Pencil, Trash2, ExternalLink, Github } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  technologies: z.array(z.string()),
  date_range: z.string().max(100).optional().or(z.literal('')),
  url: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'Must be a valid URL',
    }),
  github_link: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'Must be a valid URL',
    }),
})

type ProjectFormData = z.infer<typeof projectSchema>

export interface Project {
  id: string
  name: string
  description: string | null
  technologies: string[]
  date_range: string | null
  url: string | null
  github_link: string | null
  display_order: number
}

interface ProjectsInputProps {
  value: Project[]
  onChange: (projects: Project[]) => void
  className?: string
}

export function ProjectsInput({ value: projects, onChange, className }: ProjectsInputProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [techInput, setTechInput] = useState('')

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      technologies: [],
      date_range: '',
      url: '',
      github_link: '',
    },
  })

  const openAddDialog = () => {
    setEditingProject(null)
    form.reset({
      name: '',
      description: '',
      technologies: [],
      date_range: '',
      url: '',
      github_link: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (project: Project) => {
    setEditingProject(project)
    form.reset({
      name: project.name,
      description: project.description || '',
      technologies: project.technologies,
      date_range: project.date_range || '',
      url: project.url || '',
      github_link: project.github_link || '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = (data: ProjectFormData) => {
    if (editingProject) {
      // Update existing project
      const updated = projects.map((p) =>
        p.id === editingProject.id
          ? { ...p, ...data }
          : p
      )
      onChange(updated)
    } else {
      // Add new project
      const newProject: Project = {
        id: `temp-${Date.now()}`,
        name: data.name,
        description: data.description || null,
        technologies: data.technologies,
        date_range: data.date_range || null,
        url: data.url || null,
        github_link: data.github_link || null,
        display_order: projects.length,
      }
      onChange([...projects, newProject])
    }
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    onChange(projects.filter((p) => p.id !== id))
  }

  const handleAddTech = () => {
    const trimmed = techInput.trim()
    if (!trimmed) return

    const currentTechs = form.getValues('technologies')
    const isDuplicate = currentTechs.some(
      (tech) => tech.toLowerCase() === trimmed.toLowerCase()
    )

    if (!isDuplicate) {
      form.setValue('technologies', [...currentTechs, trimmed])
      setTechInput('')
    }
  }

  const handleRemoveTech = (tech: string) => {
    const currentTechs = form.getValues('technologies')
    form.setValue(
      'technologies',
      currentTechs.filter((t) => t !== tech)
    )
  }

  const handleTechKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTech()
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Projects List */}
      {projects.length > 0 && (
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-secondary/10 shadow-card p-6 transition-all duration-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-lora text-lg font-semibold text-secondary mb-1">
                    {project.name}
                  </h4>
                  {project.date_range && (
                    <p className="text-sm text-secondary/70">{project.date_range}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(project)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(project.id)}
                  >
                    <Trash2 className="h-4 w-4 text-error" />
                  </Button>
                </div>
              </div>

              {project.description && (
                <p className="text-secondary/80 text-sm mb-3 leading-relaxed">
                  {project.description}
                </p>
              )}

              {project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {project.technologies.map((tech) => (
                    <div
                      key={tech}
                      className="px-3 py-1 rounded-full bg-accent-teal/10 border border-accent-teal/20 text-xs font-medium text-accent-teal"
                    >
                      {tech}
                    </div>
                  ))}
                </div>
              )}

              {(project.url || project.github_link) && (
                <div className="flex items-center gap-4 pt-3 border-t border-secondary/10">
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-accent-teal hover:text-accent-teal/80 transition-colors inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Live Demo
                    </a>
                  )}
                  {project.github_link && (
                    <a
                      href={project.github_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-accent-teal hover:text-accent-teal/80 transition-colors inline-flex items-center gap-1"
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-8 bg-white rounded-2xl border border-secondary/10">
          <p className="text-secondary/70 mb-4">
            No projects added yet. Showcase your work to stand out!
          </p>
        </div>
      )}

      {/* Add Project Button */}
      <Button
        type="button"
        variant="outline"
        onClick={openAddDialog}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Project
      </Button>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-lora text-2xl">
              {editingProject ? 'Edit Project' : 'Add Project'}
            </DialogTitle>
            <DialogDescription>
              {editingProject
                ? 'Update your project details below.'
                : 'Add a project to showcase your work and skills.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., E-Commerce Platform" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what you built and its impact..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Briefly describe the project, your role, and key achievements
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="technologies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technologies</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            value={techInput}
                            onChange={(e) => setTechInput(e.target.value)}
                            onKeyDown={handleTechKeyDown}
                            placeholder="e.g., React, Node.js, MongoDB"
                          />
                          <Button
                            type="button"
                            onClick={handleAddTech}
                            disabled={!techInput.trim()}
                            size="icon"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {field.value.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {field.value.map((tech) => (
                              <div
                                key={tech}
                                className="inline-flex items-center gap-1 bg-primary text-secondary px-3 py-1.5 rounded-full text-sm font-medium"
                              >
                                {tech}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTech(tech)}
                                  className="ml-1 hover:bg-secondary/20 rounded-full p-0.5 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Add technologies and tools used in this project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_range"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Range</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Jan 2023 - May 2023" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      When did you work on this project?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Link to live demo or project website
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="github_link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GitHub Link</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://github.com/username/repo"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Link to GitHub repository
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? 'Saving...'
                    : editingProject
                    ? 'Save Changes'
                    : 'Add Project'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
