'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Application, Job, FitBucket } from '@prisma/client'
import { Building2, MapPin, Edit2, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { toast } from 'sonner'

interface ApplicationCardProps {
  application: Application & {
    Job: Job
  }
  isDragging?: boolean
  dragHandleProps?: any
}

export function ApplicationCard({
  application,
  isDragging = false,
  dragHandleProps,
}: ApplicationCardProps) {
  const router = useRouter()
  const { Job: job } = application
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fit badge styling
  const getFitBadgeStyles = (fitBucket: FitBucket | null) => {
    if (!fitBucket) {
      return {
        bg: 'bg-secondary/10',
        border: 'border-secondary/20',
        text: 'text-secondary/70',
        label: 'Not Scored',
      }
    }

    switch (fitBucket) {
      case FitBucket.EXCELLENT:
        return {
          bg: 'bg-success/10',
          border: 'border-success/20',
          text: 'text-success',
          label: 'Excellent Fit',
        }
      case FitBucket.GOOD:
        return {
          bg: 'bg-accent-teal/10',
          border: 'border-accent-teal/20',
          text: 'text-accent-teal',
          label: 'Good Fit',
        }
      case FitBucket.FAIR:
        return {
          bg: 'bg-warning/10',
          border: 'border-warning/20',
          text: 'text-warning',
          label: 'Fair Fit',
        }
      case FitBucket.POOR:
        return {
          bg: 'bg-error/10',
          border: 'border-error/20',
          text: 'text-error',
          label: 'Poor Fit',
        }
    }
  }

  const fitStyles = getFitBadgeStyles(application.fit_bucket)

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/jobs/${job.id}`)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete application')
      }

      toast.success('Application deleted successfully')
      setDeleteDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error('Failed to delete application')
      setIsDeleting(false)
    }
  }

  const handleCardClick = () => {
    router.push(`/jobs/${job.id}`)
  }

  return (
    <>
      <div
        className={`relative bg-white rounded-xl border border-secondary/10 p-4 transition-all duration-200 hover:shadow-md hover:border-accent-teal/30 group ${
          isDragging ? 'shadow-xl rotate-2' : ''
        }`}
      >
        {/* Drag Handle */}
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="h-5 w-5 text-secondary/30" />
          </div>
        )}

        {/* Header with Action Buttons */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              onClick={handleCardClick}
              className="font-semibold text-secondary group-hover:text-accent-teal transition-colors line-clamp-1 flex-1 cursor-pointer"
            >
              {job.title}
            </h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleEdit}
                onPointerDown={(e) => e.stopPropagation()}
                title="View job details"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-error hover:text-error hover:bg-error/10"
                onClick={handleDeleteClick}
                onPointerDown={(e) => e.stopPropagation()}
                title="Delete job"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div
            onClick={handleCardClick}
            className="flex items-center gap-2 text-sm text-secondary/70 cursor-pointer"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{job.company}</span>
          </div>
          {job.location && (
            <div
              onClick={handleCardClick}
              className="flex items-center gap-2 text-xs text-secondary/60 mt-1 cursor-pointer"
            >
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{job.location}</span>
            </div>
          )}
        </div>

        {/* Fit Badge */}
        <div className="mb-3">
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full ${fitStyles.bg} border ${fitStyles.border}`}
          >
            <span className={`text-xs font-semibold ${fitStyles.text}`}>{fitStyles.label}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-secondary/60">
          Updated {formatDistanceToNow(application.updated_at, { addSuffix: true })}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Application"
        description={`Are you sure you want to delete the application for "${job.title}" at ${job.company}? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </>
  )
}
