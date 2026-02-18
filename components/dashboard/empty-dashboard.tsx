'use client'

import { EmptyState } from '@/components/ui/empty-state'
import { Inbox } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function EmptyDashboard() {
  const router = useRouter()

  return (
    <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-12">
      <EmptyState
        icon={Inbox}
        title="No applications yet"
        description="Add your first job to start tracking your path to hired."
        action={{
          label: 'Add Your First Job',
          onClick: () => router.push('/jobs/new'),
          variant: 'cta',
        }}
      />
    </div>
  )
}
