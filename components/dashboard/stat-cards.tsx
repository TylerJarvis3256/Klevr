import { Briefcase, TrendingUp, UserCheck } from 'lucide-react'
import type { DashboardStats } from '@/lib/dashboard-stats'

interface StatCardsProps {
  stats: DashboardStats
}

export function StatCards({ stats }: StatCardsProps) {
  const statItems = [
    {
      label: 'Applications This Month',
      value: stats.applicationsThisMonth,
      icon: Briefcase,
      color: 'accent-teal' as const,
    },
    {
      label: 'Response Rate',
      value: `${stats.responseRate}%`,
      icon: TrendingUp,
      color: 'accent-orange' as const,
    },
    {
      label: 'Active Interviews',
      value: stats.activeInterviews,
      icon: UserCheck,
      color: 'success' as const,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {statItems.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className="bg-white rounded-2xl border border-secondary/10 shadow-card p-6 transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-secondary/70 mb-1">{stat.label}</p>
                <p className="font-lora text-3xl font-bold text-secondary">{stat.value}</p>
              </div>
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                  stat.color === 'accent-teal'
                    ? 'bg-accent-teal/10'
                    : stat.color === 'accent-orange'
                      ? 'bg-accent-orange/10'
                      : 'bg-success/10'
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${
                    stat.color === 'accent-teal'
                      ? 'text-accent-teal'
                      : stat.color === 'accent-orange'
                        ? 'text-accent-orange'
                        : 'text-success'
                  }`}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
