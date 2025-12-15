'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FitBadge } from './fit-badge'
import { Trash2, Loader2, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import type { Application, Job, ApplicationStatus } from '@prisma/client'

interface JobsTableProps {
  applications: (Application & { Job: Job })[]
  onUpdate?: () => void
}

const STATUS_COLORS = {
  PLANNED: 'bg-secondary/10 text-secondary border-secondary/20',
  APPLIED: 'bg-accent-teal/10 text-accent-teal border-accent-teal/20',
  INTERVIEW: 'bg-accent-orange/10 text-accent-orange border-accent-orange/20',
  OFFER: 'bg-status-success/10 text-status-success border-status-success/20',
  REJECTED: 'bg-status-error/10 text-status-error border-status-error/20',
}

export function JobsTable({ applications, onUpdate }: JobsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus | ''>('')

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedIds(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(applications.map(app => app.id)))
    }
  }

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return

    setIsUpdatingStatus(true)
    try {
      const response = await fetch('/api/applications/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationIds: Array.from(selectedIds),
          action: 'update_status',
          data: { status: bulkStatus },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update applications')
      }

      const result = await response.json()
      toast.success(`Updated ${result.count} application(s) to ${bulkStatus}`)
      setSelectedIds(new Set())
      setBulkStatus('')
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.size} application(s)? This will also delete all related notes and documents.`
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/applications/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationIds: Array.from(selectedIds),
          action: 'delete',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete applications')
      }

      const result = await response.json()
      toast.success(`Deleted ${result.count} application(s)`)
      setSelectedIds(new Set())
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const selectedCount = selectedIds.size

  return (
    <div className="space-y-4">
      {/* Bulk Actions Toolbar */}
      {selectedCount > 0 && (
        <div className="bg-accent-teal/10 border border-accent-teal/30 rounded-xl p-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-accent-teal" aria-hidden="true" />
            <span className="font-medium text-secondary">
              {selectedCount} selected
            </span>
          </div>

          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <Select
              value={bulkStatus}
              onValueChange={value => setBulkStatus(value as ApplicationStatus)}
            >
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Update status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANNED">Planned</SelectItem>
                <SelectItem value="APPLIED">Applied</SelectItem>
                <SelectItem value="INTERVIEW">Interview</SelectItem>
                <SelectItem value="OFFER">Offer</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleBulkStatusUpdate}
              disabled={!bulkStatus || isUpdatingStatus || isDeleting}
              size="sm"
            >
              {isUpdatingStatus ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Apply Status'
              )}
            </Button>

            <Button
              onClick={handleBulkDelete}
              disabled={isDeleting || isUpdatingStatus}
              variant="destructive"
              size="sm"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </>
              )}
            </Button>
          </div>

          <Button onClick={() => setSelectedIds(new Set())} variant="ghost" size="sm">
            Clear Selection
          </Button>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-2xl border border-secondary/10 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary/30 border-b border-secondary/10">
              <tr>
                <th className="px-6 py-3 w-12">
                  <Checkbox
                    checked={selectedCount === applications.length && applications.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all applications"
                  />
                </th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-secondary">
                  Job Title
                </th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-secondary">
                  Company
                </th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-secondary">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-secondary">
                  Fit
                </th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-secondary">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr
                  key={app.id}
                  className="border-b border-secondary/10 last:border-0 hover:bg-primary/20 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Checkbox
                      checked={selectedIds.has(app.id)}
                      onCheckedChange={() => toggleSelection(app.id)}
                      aria-label={`Select ${app.Job.title} at ${app.Job.company}`}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/jobs/${app.Job.id}`}
                      className="text-accent-teal hover:text-accent-teal/80 font-medium transition-colors"
                    >
                      {app.Job.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-secondary/80">{app.Job.company}</td>
                  <td className="px-6 py-4">
                    <Badge className={STATUS_COLORS[app.status]}>
                      {app.status.charAt(0) + app.status.slice(1).toLowerCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {app.fit_bucket ? (
                      <FitBadge fitBucket={app.fit_bucket} />
                    ) : (
                      <span className="text-sm text-secondary/60">Analyzing...</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary/70">
                    {formatDate(app.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {applications.map(app => (
          <div
            key={app.id}
            className="bg-white rounded-2xl border border-secondary/10 shadow-card p-4"
          >
            <div className="flex items-start gap-3 mb-3">
              <Checkbox
                checked={selectedIds.has(app.id)}
                onCheckedChange={() => toggleSelection(app.id)}
                aria-label={`Select ${app.Job.title} at ${app.Job.company}`}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/jobs/${app.Job.id}`}
                  className="text-accent-teal hover:text-accent-teal/80 font-medium transition-colors block mb-1"
                >
                  {app.Job.title}
                </Link>
                <p className="text-sm text-secondary/70 mb-2">{app.Job.company}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={STATUS_COLORS[app.status]}>
                    {app.status.charAt(0) + app.status.slice(1).toLowerCase()}
                  </Badge>
                  {app.fit_bucket ? (
                    <FitBadge fitBucket={app.fit_bucket} />
                  ) : (
                    <span className="text-xs text-secondary/60">Analyzing...</span>
                  )}
                </div>
                <p className="text-xs text-secondary/60 mt-2">
                  Updated {formatDate(app.updated_at)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
