'use client'

import { useState } from 'react'
import { Application, ApplicationStatus, Job, FitBucket } from '@prisma/client'
import { DndContext, DragEndEvent, DragOverlay, closestCorners, useDraggable, useDroppable } from '@dnd-kit/core'
import { ApplicationCard } from './application-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type ApplicationWithJob = Application & { Job: Job }

interface PipelineProps {
  applications: ApplicationWithJob[]
  searchQuery?: string
  fitFilter?: FitBucket | 'ALL'
  statusFilter?: ApplicationStatus | 'ALL' | 'ACTIVE'
}

const STATUS_COLUMNS = [
  { status: ApplicationStatus.PLANNED, label: 'Planned', color: 'secondary' },
  { status: ApplicationStatus.APPLIED, label: 'Applied', color: 'accent-teal' },
  { status: ApplicationStatus.INTERVIEW, label: 'Interview', color: 'accent-orange' },
  { status: ApplicationStatus.OFFER, label: 'Offer', color: 'success' },
  { status: ApplicationStatus.REJECTED, label: 'Rejected', color: 'error' },
] as const

// Draggable card wrapper
function DraggableCard({ application }: { application: ApplicationWithJob }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: application.id,
    data: { application },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <ApplicationCard
        application={application}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

// Droppable column wrapper
function DroppableColumn({
  status,
  children,
}: {
  status: ApplicationStatus
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 space-y-3 min-h-[200px] p-2 rounded-lg transition-colors ${
        isOver ? 'bg-accent-teal/5 ring-2 ring-accent-teal/20' : ''
      }`}
    >
      {children}
    </div>
  )
}

export function Pipeline({ applications, searchQuery, fitFilter, statusFilter }: PipelineProps) {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(null)

  // Filter applications
  const filteredApplications = applications.filter(app => {
    // Search filter
    if (
      searchQuery &&
      !app.Job.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !app.Job.company.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    // Fit filter
    if (fitFilter && fitFilter !== 'ALL') {
      if (app.fit_bucket !== fitFilter) {
        return false
      }
    }

    // Status filter
    if (statusFilter) {
      if (statusFilter === 'ACTIVE' && app.status === ApplicationStatus.REJECTED) {
        return false
      } else if (statusFilter !== 'ALL' && statusFilter !== 'ACTIVE' && app.status !== statusFilter) {
        return false
      }
    }

    return true
  })

  // Group applications by status
  const applicationsByStatus = STATUS_COLUMNS.reduce(
    (acc, { status }) => {
      acc[status] = filteredApplications.filter(app => app.status === status)
      return acc
    },
    {} as Record<ApplicationStatus, ApplicationWithJob[]>
  )

  // Handle drag start
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const applicationId = active.id as string
    const newStatus = over.id as ApplicationStatus

    // If dropped on the same column, do nothing
    const application = applications.find(app => app.id === applicationId)
    if (application?.status === newStatus) return

    try {
      const response = await fetch(`/api/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update application status')
      }

      toast.success('Application status updated')
      router.refresh()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  // Find active application for drag overlay
  const activeApplication = activeId
    ? applications.find(app => app.id === activeId)
    : null

  return (
    <>
      {/* Desktop View - Kanban Board */}
      <div className="hidden lg:block">
        <DndContext
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-5 gap-4">
            {STATUS_COLUMNS.map(({ status, label, color }) => {
              const columnApps = applicationsByStatus[status]

              return (
                <div key={status} className="flex flex-col">
                  {/* Column Header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-secondary">{label}</h3>
                      <span className="text-sm text-secondary/60">{columnApps.length}</span>
                    </div>
                    <div className={`h-1 rounded-full bg-${color}/20`}></div>
                  </div>

                  {/* Droppable Column */}
                  <DroppableColumn status={status}>
                    {columnApps.length === 0 ? (
                      <div className="text-center py-8 text-sm text-secondary/50">
                        No applications
                      </div>
                    ) : (
                      columnApps.map(app => <DraggableCard key={app.id} application={app} />)
                    )}
                  </DroppableColumn>
                </div>
              )
            })}
          </div>

          <DragOverlay>
            {activeApplication ? (
              <div className="rotate-3 scale-105">
                <ApplicationCard application={activeApplication} isDragging={true} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Mobile View - Tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue={ApplicationStatus.PLANNED} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            {STATUS_COLUMNS.map(({ status, label }) => (
              <TabsTrigger key={status} value={status} className="text-xs">
                {label}
                <span className="ml-1 text-secondary/50">
                  ({applicationsByStatus[status].length})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {STATUS_COLUMNS.map(({ status }) => {
            const columnApps = applicationsByStatus[status]

            return (
              <TabsContent key={status} value={status} className="space-y-3">
                {columnApps.length === 0 ? (
                  <div className="text-center py-12 text-sm text-secondary/50">
                    No applications in {status.toLowerCase()}
                  </div>
                ) : (
                  columnApps.map(app => <ApplicationCard key={app.id} application={app} />)
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </>
  )
}
