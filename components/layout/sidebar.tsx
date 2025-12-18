'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, Search, User, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Discover', href: '/jobs/discover', icon: Search },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-secondary/10 lg:bg-white">
      <div className="flex flex-col flex-grow overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-secondary/10">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/logos/logo-2-transparent.png"
              alt="Klevr Logo"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="font-lora text-2xl font-bold text-secondary">Klevr</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            // For /jobs route, only highlight if exactly on /jobs, not on sub-routes like /jobs/discover
            const isActive = item.href === '/jobs'
              ? pathname === '/jobs'
              : pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
                  isActive
                    ? 'bg-accent-teal text-white'
                    : 'text-secondary/70 hover:bg-primary/60 hover:text-secondary'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
