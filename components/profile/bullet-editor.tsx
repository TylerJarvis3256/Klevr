'use client'

import { useState } from 'react'
import { Plus, Trash2, Star, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type { Bullet } from '@prisma/client'

interface BulletEditorProps {
  bullets: Bullet[]
  onAdd: (data: Partial<Bullet>) => Promise<void>
  onUpdate: (id: string, data: Partial<Bullet>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  contextType?: 'experience' | 'project' | 'profile'
  contextId?: string
}

export function BulletEditor({ bullets, onAdd, onUpdate, onDelete }: BulletEditorProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newBullet, setNewBullet] = useState('')
  const [enhancing, setEnhancing] = useState<string | null>(null)
  const [showSuggestionModal, setShowSuggestionModal] = useState(false)
  const [currentSuggestion, setCurrentSuggestion] = useState<{
    bulletId: string
    originalText: string
    enhancedText: string
    suggestedTags: string[]
    suggestedCategory: string
    suggestedPriority: number
  } | null>(null)

  const handleAdd = async () => {
    if (!newBullet.trim()) return
    await onAdd({ text: newBullet })
    setNewBullet('')
    setIsAdding(false)
  }

  const toggleFavorite = async (bullet: Bullet) => {
    await onUpdate(bullet.id, { is_favorite: !bullet.is_favorite })
  }

  const handleEnhance = async (bullet: Bullet) => {
    setEnhancing(bullet.id)
    try {
      const res = await fetch(`/api/profile/bullets/${bullet.id}/ai-enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error('Failed to enhance bullet', {
          description: error.error || 'Unknown error occurred',
        })
        return
      }

      const data = await res.json()
      setCurrentSuggestion({
        bulletId: bullet.id,
        originalText: data.enhanced.originalText,
        enhancedText: data.enhanced.enhancedText,
        suggestedTags: data.enhanced.suggestedTags,
        suggestedCategory: data.enhanced.suggestedCategory,
        suggestedPriority: data.enhanced.suggestedPriority,
      })
      setShowSuggestionModal(true)
    } catch (error) {
      console.error('Enhancement error:', error)
      toast.error('Failed to enhance bullet', {
        description: 'An unexpected error occurred',
      })
    } finally {
      setEnhancing(null)
    }
  }

  const handleAcceptSuggestion = async () => {
    if (!currentSuggestion) return

    try {
      await onUpdate(currentSuggestion.bulletId, {
        text: currentSuggestion.enhancedText,
        tags: currentSuggestion.suggestedTags,
        ai_category: currentSuggestion.suggestedCategory,
        priority: currentSuggestion.suggestedPriority,
      })
      toast.success('Bullet enhanced successfully!')
      setShowSuggestionModal(false)
      setCurrentSuggestion(null)
    } catch {
      toast.error('Failed to update bullet')
    }
  }

  const handleRejectSuggestion = () => {
    setShowSuggestionModal(false)
    setCurrentSuggestion(null)
  }

  return (
    <div className="space-y-2">
      {bullets.map(bullet => (
        <div key={bullet.id} className="flex items-start gap-2 p-3 bg-primary/20 rounded-lg">
          <button onClick={() => toggleFavorite(bullet)} className="mt-0.5 flex-shrink-0">
            <Star
              className={`h-4 w-4 ${
                bullet.is_favorite ? 'fill-accent-orange text-accent-orange' : 'text-secondary/40'
              }`}
            />
          </button>
          <div className="flex-1">
            <p className="text-sm">{bullet.text}</p>
            {bullet.tags && bullet.tags.length > 0 && (
              <div className="flex gap-1 mt-1">
                {bullet.tags.map(tag => (
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
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-accent-teal"
              title="AI Enhance"
              onClick={() => handleEnhance(bullet)}
              disabled={enhancing === bullet.id}
            >
              {enhancing === bullet.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-600"
              onClick={() => onDelete(bullet.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}

      {isAdding ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newBullet}
            onChange={e => setNewBullet(e.target.value)}
            placeholder="Enter bullet point..."
            className="flex-1 px-3 py-2 border border-secondary/20 rounded-lg text-sm"
            autoFocus
          />
          <Button size="sm" onClick={handleAdd} className="bg-accent-orange">
            Add
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full border-dashed"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Bullet
        </Button>
      )}

      {/* AI Enhancement Suggestion Modal */}
      <AlertDialog open={showSuggestionModal} onOpenChange={setShowSuggestionModal}>
        <AlertDialogContent className="bg-primary">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-lora text-secondary">
              AI Enhancement Suggestion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-secondary/80">
              Review the AI-enhanced version of your bullet point.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {currentSuggestion && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-secondary/60 mb-1">Original:</p>
                <p className="text-sm text-secondary/80 bg-white/50 p-3 rounded-lg">
                  {currentSuggestion.originalText}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-secondary/60 mb-1">Enhanced:</p>
                <p className="text-sm text-secondary bg-white p-3 rounded-lg font-medium">
                  {currentSuggestion.enhancedText}
                </p>
              </div>
              {currentSuggestion.suggestedTags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-secondary/60 mb-1">Suggested Tags:</p>
                  <div className="flex gap-1 flex-wrap">
                    {currentSuggestion.suggestedTags.map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-accent-teal/10 text-accent-teal rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleRejectSuggestion} className="border-secondary/20">
              Keep Original
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAcceptSuggestion}
              className="bg-accent-orange hover:bg-accent-orange/90"
            >
              Use Enhanced Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
