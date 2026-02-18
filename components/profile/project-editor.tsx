'use client'

import { useState } from 'react'
import { Plus, Trash2, ExternalLink, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BulletEditor } from './bullet-editor'
import type { Project } from '@prisma/client'
import type { Bullet } from '@/types/models'

type ProjectWithBullets = Project & { Bullets: Bullet[] }

interface ProjectEditorProps {
  projects: ProjectWithBullets[]
  onAdd: (data: Partial<Project>) => Promise<void>
  onUpdate: (id: string, data: Partial<Project>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddBullet: (projectId: string, data: Partial<Bullet>) => Promise<void>
  onUpdateBullet: (id: string, data: Partial<Bullet>) => Promise<void>
  onDeleteBullet: (id: string) => Promise<void>
}

export function ProjectEditor({
  projects,
  onAdd,
  onUpdate,
  onDelete,
  onAddBullet,
  onUpdateBullet,
  onDeleteBullet,
}: ProjectEditorProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [techInput, setTechInput] = useState('')
  const [editTechInput, setEditTechInput] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    technologies: [] as string[],
    date_range: '',
    url: '',
    github_link: '',
  })

  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    technologies: [] as string[],
    date_range: '',
    url: '',
    github_link: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onAdd(formData)
    setIsAdding(false)
    setFormData({
      name: '',
      description: '',
      technologies: [],
      date_range: '',
      url: '',
      github_link: '',
    })
    setTechInput('')
  }

  const handleAddTech = () => {
    const trimmed = techInput.trim()
    if (!trimmed) return

    const isDuplicate = formData.technologies.some(
      tech => tech.toLowerCase() === trimmed.toLowerCase()
    )

    if (!isDuplicate) {
      setFormData({ ...formData, technologies: [...formData.technologies, trimmed] })
      setTechInput('')
    }
  }

  const handleRemoveTech = (tech: string) => {
    setFormData({
      ...formData,
      technologies: formData.technologies.filter(t => t !== tech),
    })
  }

  const handleTechKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTech()
    }
  }

  const startEditing = (proj: ProjectWithBullets) => {
    setEditingId(proj.id)
    setEditFormData({
      name: proj.name,
      description: proj.description || '',
      technologies: proj.technologies || [],
      date_range: proj.date_range || '',
      url: proj.url || '',
      github_link: proj.github_link || '',
    })
    setEditTechInput('')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    await onUpdate(editingId, editFormData)
    setEditingId(null)
  }

  const handleAddEditTech = () => {
    const trimmed = editTechInput.trim()
    if (!trimmed) return

    const isDuplicate = editFormData.technologies.some(
      tech => tech.toLowerCase() === trimmed.toLowerCase()
    )

    if (!isDuplicate) {
      setEditFormData({ ...editFormData, technologies: [...editFormData.technologies, trimmed] })
      setEditTechInput('')
    }
  }

  const handleRemoveEditTech = (tech: string) => {
    setEditFormData({
      ...editFormData,
      technologies: editFormData.technologies.filter(t => t !== tech),
    })
  }

  const handleEditTechKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddEditTech()
    }
  }

  return (
    <div className="space-y-4">
      {projects.map(proj => (
        <div key={proj.id} className="border border-secondary/20 rounded-2xl p-6 bg-white">
          {editingId === proj.id ? (
            <form onSubmit={handleEditSubmit}>
              <h4 className="font-lora font-semibold mb-4">Edit Project</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={editFormData.description}
                    onChange={e =>
                      setEditFormData({ ...editFormData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Technologies</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={editTechInput}
                      onChange={e => setEditTechInput(e.target.value)}
                      onKeyDown={handleEditTechKeyDown}
                      className="flex-1 px-3 py-2 border border-secondary/20 rounded-lg text-sm"
                      placeholder="e.g., React, Node.js"
                    />
                    <Button
                      type="button"
                      onClick={handleAddEditTech}
                      disabled={!editTechInput.trim()}
                      size="sm"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  {editFormData.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editFormData.technologies.map(tech => (
                        <span
                          key={tech}
                          className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-primary text-secondary rounded-full"
                        >
                          {tech}
                          <button
                            type="button"
                            onClick={() => handleRemoveEditTech(tech)}
                            className="hover:bg-secondary/20 rounded-full p-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date Range</label>
                  <input
                    type="text"
                    value={editFormData.date_range}
                    onChange={e => setEditFormData({ ...editFormData, date_range: e.target.value })}
                    className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                    placeholder="e.g., Jan 2023 - May 2023"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Live Demo URL</label>
                    <input
                      type="url"
                      value={editFormData.url}
                      onChange={e => setEditFormData({ ...editFormData, url: e.target.value })}
                      className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">GitHub Link</label>
                    <input
                      type="url"
                      value={editFormData.github_link}
                      onChange={e =>
                        setEditFormData({ ...editFormData, github_link: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit" className="bg-accent-teal hover:bg-accent-teal/90">
                  Save Changes
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-lora font-semibold text-lg">{proj.name}</h3>
                  {proj.date_range && (
                    <p className="text-secondary/60 text-sm mt-1">{proj.date_range}</p>
                  )}
                  {proj.description && (
                    <p className="text-secondary/80 text-sm mt-2 leading-relaxed">
                      {proj.description}
                    </p>
                  )}
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {proj.technologies.map(tech => (
                        <span
                          key={tech}
                          className="text-xs px-3 py-1 bg-accent-teal/10 text-accent-teal rounded-full border border-accent-teal/20"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  {(proj.url || proj.github_link) && (
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-secondary/10">
                      {proj.url && (
                        <a
                          href={proj.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-accent-teal hover:text-accent-teal/80 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Live Demo
                        </a>
                      )}
                      {proj.github_link && (
                        <a
                          href={proj.github_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-accent-teal hover:text-accent-teal/80 inline-flex items-center gap-1"
                        >
                          <Github className="h-3 w-3" />
                          GitHub
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {editingId !== proj.id && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(proj)}
                        className="text-accent-teal"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(expandedId === proj.id ? null : proj.id)}
                      >
                        {expandedId === proj.id ? 'Collapse' : 'Expand'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(proj.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {expandedId === proj.id && editingId !== proj.id && (
                <div className="mt-4 pt-4 border-t border-secondary/10">
                  <h4 className="font-medium mb-2">Key Bullet Points</h4>
                  <p className="text-xs text-secondary/60 mb-3">
                    Highlight your key accomplishments and technical achievements for this project
                  </p>
                  <BulletEditor
                    bullets={proj.Bullets}
                    onAdd={data => onAddBullet(proj.id, data)}
                    onUpdate={onUpdateBullet}
                    onDelete={onDeleteBullet}
                    contextType="project"
                    contextId={proj.id}
                  />
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {isAdding ? (
        <form
          onSubmit={handleSubmit}
          className="border border-accent-orange/30 rounded-2xl p-6 bg-white"
        >
          <h4 className="font-lora font-semibold mb-4">Add Project</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                placeholder="e.g., E-Commerce Platform"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                rows={3}
                placeholder="Describe what you built and its impact..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Technologies</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={techInput}
                  onChange={e => setTechInput(e.target.value)}
                  onKeyDown={handleTechKeyDown}
                  className="flex-1 px-3 py-2 border border-secondary/20 rounded-lg text-sm"
                  placeholder="e.g., React, Node.js"
                />
                <Button
                  type="button"
                  onClick={handleAddTech}
                  disabled={!techInput.trim()}
                  size="sm"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {formData.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.technologies.map(tech => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-primary text-secondary rounded-full"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(tech)}
                        className="hover:bg-secondary/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <input
                type="text"
                value={formData.date_range}
                onChange={e => setFormData({ ...formData, date_range: e.target.value })}
                className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                placeholder="e.g., Jan 2023 - May 2023"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Live Demo URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={e => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">GitHub Link</label>
                <input
                  type="url"
                  value={formData.github_link}
                  onChange={e => setFormData({ ...formData, github_link: e.target.value })}
                  className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                  placeholder="https://github.com/..."
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button type="submit" className="bg-accent-orange hover:bg-accent-orange/90">
              Add Project
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          onClick={() => setIsAdding(true)}
          variant="outline"
          className="w-full border-dashed border-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      )}
    </div>
  )
}
