'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Education } from '@/types/models'

interface EducationEditorProps {
  education: Education[]
  onAdd: (data: Partial<Education>) => Promise<void>
  onUpdate: (id: string, data: Partial<Education>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function EducationEditor({ education, onAdd, onUpdate, onDelete }: EducationEditorProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    school: '',
    degree: '',
    major: '',
    graduation_date: '',
    gpa: '',
    location: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingId) {
      await onUpdate(editingId, formData)
      setEditingId(null)
    } else {
      await onAdd(formData)
      setIsAdding(false)
    }

    // Reset form
    setFormData({
      school: '',
      degree: '',
      major: '',
      graduation_date: '',
      gpa: '',
      location: '',
    })
  }

  const handleEdit = (edu: Education) => {
    setEditingId(edu.id)
    setIsAdding(true)
    setFormData({
      school: edu.school,
      degree: edu.degree,
      major: edu.major || '',
      graduation_date: edu.graduation_date,
      gpa: edu.gpa || '',
      location: edu.location || '',
    })
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({
      school: '',
      degree: '',
      major: '',
      graduation_date: '',
      gpa: '',
      location: '',
    })
  }

  return (
    <div className="space-y-4">
      {/* Education List */}
      {education.map(edu => (
        <div key={edu.id} className="border border-secondary/20 rounded-2xl p-6 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-secondary/40" />
                <h3 className="font-lora font-semibold text-lg">{edu.degree}</h3>
              </div>
              <p className="text-secondary/70 mt-1">{edu.school}</p>
              {edu.major && <p className="text-secondary/70 text-sm">Major: {edu.major}</p>}
              <p className="text-secondary/60 text-sm mt-1">
                {edu.graduation_date}
                {edu.gpa && ` • GPA: ${edu.gpa}`}
                {edu.location && ` • ${edu.location}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(edu)}
                className="text-accent-teal"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(edu.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Add/Edit Form */}
      {isAdding ? (
        <form
          onSubmit={handleSubmit}
          className="border border-accent-orange/30 rounded-2xl p-6 bg-white"
        >
          <h4 className="font-lora font-semibold mb-4">
            {editingId ? 'Edit Education' : 'Add Education'}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">School *</label>
              <input
                type="text"
                required
                value={formData.school}
                onChange={e => setFormData({ ...formData, school: e.target.value })}
                className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Degree *</label>
              <input
                type="text"
                required
                value={formData.degree}
                onChange={e => setFormData({ ...formData, degree: e.target.value })}
                className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                placeholder="e.g., Bachelor of Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Major</label>
              <input
                type="text"
                value={formData.major}
                onChange={e => setFormData({ ...formData, major: e.target.value })}
                className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                placeholder="e.g., Computer Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Graduation Date *</label>
              <input
                type="text"
                required
                value={formData.graduation_date}
                onChange={e => setFormData({ ...formData, graduation_date: e.target.value })}
                className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                placeholder="e.g., May 2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">GPA</label>
              <input
                type="text"
                value={formData.gpa}
                onChange={e => setFormData({ ...formData, gpa: e.target.value })}
                className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                placeholder="e.g., 3.8"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                placeholder="e.g., Boston, MA"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button type="submit" className="bg-accent-orange hover:bg-accent-orange/90">
              {editingId ? 'Update' : 'Add'} Education
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
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
          Add Education
        </Button>
      )}
    </div>
  )
}
