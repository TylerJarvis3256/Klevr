import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getDashboardStats } from '@/lib/dashboard-stats'
import { StatCards } from '@/components/dashboard/stat-cards'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { Pipeline } from '@/components/dashboard/pipeline'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { FitBucket, ApplicationStatus } from '@prisma/client'

interface DashboardPageProps {
  searchParams: Promise<{
    search?: string
    fit?: string
    status?: string
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const params = await searchParams

  // Fetch profile
  const profile = await prisma.profile.findUnique({
    where: { user_id: user.id },
  })

  // Fetch stats
  const stats = await getDashboardStats(user.id)

  // Fetch applications with jobs
  const applications = await prisma.application.findMany({
    where: { user_id: user.id },
    include: {
      Job: true,
    },
    orderBy: {
      updated_at: 'desc',
    },
  })

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-lora text-4xl font-bold text-secondary mb-2">
            Welcome back, {firstName}!
          </h1>
          <p className="text-secondary/80">Here's your application overview</p>
        </div>
        <Link href="/jobs/new">
          <Button size="lg" variant="cta">
            <Plus className="h-5 w-5 mr-2" />
            Add Job
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <StatCards stats={stats} />

      {/* Filters */}
      <FilterBar />

      {/* Pipeline */}
      {applications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-12 text-center">
          <h3 className="font-lora text-2xl font-semibold text-secondary mb-2">
            No applications yet
          </h3>
          <p className="text-secondary/70 mb-6">
            Add your first job to start tracking your path to hired.
          </p>
          <Link href="/jobs/new">
            <Button size="lg" variant="cta">
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Job
            </Button>
          </Link>
        </div>
      ) : (
        <Pipeline
          applications={applications}
          searchQuery={params.search}
          fitFilter={(params.fit as FitBucket) || 'ALL'}
          statusFilter={(params.status as ApplicationStatus | 'ALL' | 'ACTIVE') || 'ALL'}
        />
      )}
    </div>
  )
}
