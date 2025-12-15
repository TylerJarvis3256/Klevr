'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Note } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Edit2, Trash2, Save, X, StickyNote, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface NotesListProps {
  notes: Note[]
  applicationId: string
}

export function NotesList({ notes, applicationId }: NotesListProps) {
  const router = useRouter()
  const [newNoteContent, setNewNoteContent] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!newNoteContent.trim()) {
      toast.error('Note content cannot be empty')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          content: newNoteContent,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create note')
      }

      toast.success('Note created')
      setNewNoteContent('')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) {
      toast.error('Note content cannot be empty')
      return
    }

    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update note')
      }

      toast.success('Note updated')
      setEditingId(null)
      setEditContent('')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete note')
      }

      toast.success('Note deleted')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-lora text-2xl font-semibold text-secondary">Notes</h2>
      </div>

      {/* Create new note */}
      <div className="mb-6">
        <Textarea
          placeholder="Add a note about this application (e.g., recruiter name, interview dates, follow-up tasks)..."
          value={newNoteContent}
          onChange={e => setNewNoteContent(e.target.value)}
          rows={3}
          className="mb-3"
        />
        <Button
          onClick={handleCreate}
          disabled={isCreating || !newNoteContent.trim()}
          size="sm"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <StickyNote className="h-4 w-4 mr-2" />
              Add Note
            </>
          )}
        </Button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="text-center py-8 border border-secondary/10 rounded-xl bg-primary/20">
          <StickyNote className="h-8 w-8 text-secondary/40 mx-auto mb-2" />
          <p className="text-sm text-secondary/60">No notes yet</p>
          <p className="text-xs text-secondary/50 mt-1">
            Add notes to track important details about this application
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div
              key={note.id}
              className="border border-secondary/10 rounded-xl p-4 hover:bg-primary/10 transition-colors"
            >
              {editingId === note.id ? (
                // Edit mode
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSaveEdit(note.id)}
                      size="sm"
                      variant="default"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      size="sm"
                      variant="outline"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-secondary/80 whitespace-pre-wrap flex-1">
                      {note.content}
                    </p>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        onClick={() => handleStartEdit(note)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit note</span>
                      </Button>
                      <Button
                        onClick={() => handleDelete(note.id)}
                        disabled={deletingId === note.id}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingId === note.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">Delete note</span>
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-secondary/60 mt-2">
                    {formatDate(note.created_at)}
                    {note.updated_at.getTime() !== note.created_at.getTime() && (
                      <span className="ml-2">(edited)</span>
                    )}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
