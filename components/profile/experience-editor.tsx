'use client'

import { useState } from 'react'
import { Plus, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { BulletEditor } from './bullet-editor'
import type { JobExperience, Bullet } from '@/types/models'

type ExperienceWithBullets = JobExperience & { Bullets: Bullet[] }

interface ExperienceEditorProps {
  experiences: ExperienceWithBullets[]
  onAdd: (data: Partial<JobExperience>) => Promise<void>
  onUpdate: (id: string, data: Partial<JobExperience>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddBullet: (experienceId: string, data: Partial<Bullet>) => Promise<void>
  onUpdateBullet: (id: string, data: Partial<Bullet>) => Promise<void>
  onDeleteBullet: (id: string) => Promise<void>
}

export function ExperienceEditor({
  experiences,
  onAdd,
  onUpdate,
  onDelete,
  onAddBullet,
  onUpdateBullet,
  onDeleteBullet,
}: ExperienceEditorProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [suggestingFor, setSuggestingFor] = useState<string | null>(null)
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false)
  const [suggestions, setSuggestions] = useState<
    Array<{
      text: string
      tags: string[]
      category: string
      priority: number
      selected: boolean
    }>
  >([])
  const [currentExperienceId, setCurrentExperienceId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
    key_metrics: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onAdd(formData)
    setIsAdding(false)
    setFormData({
      title: '',
      company: '',
      location: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: '',
      key_metrics: '',
    })
  }

  const handleSuggestBullets = async (experience: ExperienceWithBullets) => {
    setSuggestingFor(experience.id)
    setCurrentExperienceId(experience.id)

    try {
      const res = await fetch('/api/profile/bullets/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: experience.description || `${experience.title} at ${experience.company}`,
          experienceContext: {
            title: experience.title,
            company: experience.company,
            description: experience.description,
          },
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error('Failed to generate suggestions', {
          description: error.error || 'Unknown error occurred',
        })
        return
      }

      const data = await res.json()
      setSuggestions(
        data.suggestions.map(
          (s: { text: string; tags: string[]; category: string; priority: number }) => ({
            ...s,
            selected: false,
          })
        )
      )
      setShowSuggestionsModal(true)
    } catch (error) {
      console.error('Suggestion error:', error)
      toast.error('Failed to generate suggestions', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setSuggestingFor(null)
    }
  }

  const handleToggleSuggestion = (index: number) => {
    setSuggestions(prev => prev.map((s, i) => (i === index ? { ...s, selected: !s.selected } : s)))
  }

  const handleAddSelectedSuggestions = async () => {
    if (!currentExperienceId) return

    const selectedSuggestions = suggestions.filter(s => s.selected)
    if (selectedSuggestions.length === 0) {
      toast.error('Please select at least one suggestion')
      return
    }

    try {
      for (const suggestion of selectedSuggestions) {
        await onAddBullet(currentExperienceId, {
          text: suggestion.text,
          tags: suggestion.tags,
          ai_category: suggestion.category,
          priority: suggestion.priority,
        })
      }
      toast.success(
        `Added ${selectedSuggestions.length} bullet${selectedSuggestions.length > 1 ? 's' : ''}`
      )
      setShowSuggestionsModal(false)
      setSuggestions([])
      setCurrentExperienceId(null)
    } catch {
      toast.error('Failed to add bullets')
    }
  }

  return (
    <div className="space-y-4">
      {experiences.map(exp => (
        <div key={exp.id} className="border border-secondary/20 rounded-2xl p-6 bg-white">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="font-lora font-semibold text-lg">{exp.title}</h3>
              <p className="text-secondary/70">{exp.company}</p>
              <p className="text-secondary/60 text-sm">
                {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}
                {exp.location && ` • ${exp.location}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
              >
                {expandedId === exp.id ? 'Collapse' : 'Expand'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(exp.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {expandedId === exp.id && (
            <div className="mt-4 pt-4 border-t border-secondary/10">
              {/* Key Metrics */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Key Metrics</label>
                <textarea
                  value={exp.key_metrics || ''}
                  onChange={e => onUpdate(exp.id, { key_metrics: e.target.value })}
                  className="w-full px-3 py-2 border border-secondary/20 rounded-lg text-sm"
                  rows={2}
                  placeholder="e.g., Reduced API latency by 40%, Served 10K+ daily users"
                />
                <p className="text-xs text-secondary/50 mt-1">
                  Raw metrics the AI will weave into your resume bullets
                </p>
              </div>

              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Bullet Points</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestBullets(exp)}
                  disabled={suggestingFor === exp.id}
                  className="text-accent-teal border-accent-teal/30"
                >
                  {suggestingFor === exp.id ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Suggest Bullets
                    </>
                  )}
                </Button>
              </div>
              <BulletEditor
                bullets={exp.Bullets}
                onAdd={data => onAddBullet(exp.id, data)}
                onUpdate={onUpdateBullet}
                onDelete={onDeleteBullet}
                contextType="experience"
                contextId={exp.id}
              />
            </div>
          )}
        </div>
      ))}

      {isAdding ? (
        <form
          onSubmit={handleSubmit}
          className="border border-accent-orange/30 rounded-2xl p-6 bg-white"
        >
          <h4 className="font-lora font-semibold mb-4">Add Experience</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company *</label>
              <input
                type="text"
                required
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <input
                type="text"
                required
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                placeholder="e.g., Jan 2023"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="text"
                value={formData.end_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                disabled={formData.is_current}
                className="w-full px-3 py-2 border border-secondary/20 rounded-lg"
                placeholder="e.g., May 2024"
              />
              <label className="flex items-center mt-1">
                <input
                  type="checkbox"
                  checked={formData.is_current}
                  onChange={e => setFormData({ ...formData, is_current: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">Currently working here</span>
              </label>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Key Metrics</label>
            <textarea
              value={formData.key_metrics}
              onChange={e => setFormData({ ...formData, key_metrics: e.target.value })}
              className="w-full px-3 py-2 border border-secondary/20 rounded-lg text-sm"
              rows={2}
              placeholder="e.g., Reduced API latency by 40%, Served 10K+ daily users"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button type="submit" className="bg-accent-orange">
              Add Experience
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
          Add Experience
        </Button>
      )}

      {/* Bullet Suggestions Modal */}
      <Dialog open={showSuggestionsModal} onOpenChange={setShowSuggestionsModal}>
        <DialogContent className="bg-primary max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-lora text-secondary">AI Bullet Suggestions</DialogTitle>
            <DialogDescription className="text-secondary/80">
              Select the bullets you&apos;d like to add to this experience.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                onClick={() => handleToggleSuggestion(index)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  suggestion.selected
                    ? 'border-accent-orange bg-accent-orange/10'
                    : 'border-secondary/20 bg-white hover:border-accent-orange/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={suggestion.selected}
                    onChange={() => handleToggleSuggestion(index)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-secondary">{suggestion.text}</p>
                    {suggestion.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {suggestion.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 bg-accent-teal/10 text-accent-teal rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSuggestionsModal(false)}
              className="border-secondary/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedSuggestions}
              className="bg-accent-orange hover:bg-accent-orange/90"
            >
              Add Selected ({suggestions.filter(s => s.selected).length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
