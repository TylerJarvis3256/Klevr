'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Bell, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const settingsNav = [
  { name: 'Account', href: '/settings/account', icon: User },
  { name: 'Notifications', href: '/settings/notifications', icon: Bell },
  { name: 'Usage', href: '/settings/usage', icon: BarChart3 },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="font-lora text-4xl font-bold text-secondary mb-2">Settings</h1>
        <p className="text-secondary/80">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <nav className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-4 space-y-1">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                    isActive
                      ? 'bg-accent-teal/10 text-accent-teal border-l-4 border-accent-teal'
                      : 'text-secondary/70 hover:bg-primary/60 hover:text-secondary'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Content Area */}
        <div className="lg:col-span-3">{children}</div>
      </div>
    </div>
  )
}
