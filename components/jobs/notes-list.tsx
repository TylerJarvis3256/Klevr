import type { Note } from '@prisma/client'

interface NotesListProps {
  notes: Note[]
  applicationId: string
}

export function NotesList({ notes }: NotesListProps) {
  // TODO: Implement in Stage 10 - Notes & Bulk Operations
  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-lora text-2xl font-semibold text-secondary">Notes</h2>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-secondary/70 mb-2">No notes yet</p>
          <p className="text-sm text-secondary/60">
            Notes feature will be available after implementing Stage 10
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div
              key={note.id}
              className="border border-secondary/10 rounded-xl p-4"
            >
              <p className="text-secondary/80">{note.content}</p>
              <p className="text-xs text-secondary/60 mt-2">{note.created_at.toString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
