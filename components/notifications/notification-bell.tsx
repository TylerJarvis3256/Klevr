'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { NotificationCenter } from './notification-center'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const failureCountRef = useRef(0)
  const maxFailures = 3

  useEffect(() => {
    fetchUnreadCount()

    // Only set up polling if we haven't failed too many times
    const interval = setInterval(() => {
      if (failureCountRef.current < maxFailures) {
        fetchUnreadCount()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  async function fetchUnreadCount() {
    try {
      const res = await fetch('/api/notifications/unread-count', {
        // Add timeout and credentials
        signal: AbortSignal.timeout(10000), // 10 second timeout
        credentials: 'include', // Ensure cookies are sent
      })

      if (res.status === 401) {
        // User not authenticated - stop polling
        failureCountRef.current = maxFailures
        return
      }

      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.unreadCount || 0)
        failureCountRef.current = 0 // Reset failure count on success
      } else {
        // Other error - increment failure count
        failureCountRef.current++
        if (failureCountRef.current >= maxFailures) {
          console.warn('NotificationBell: Stopped polling after repeated failures')
        }
      }
    } catch (error) {
      // Network error or timeout - increment failure count
      failureCountRef.current++

      // Only log if we haven't exceeded max failures (reduce console spam)
      if (failureCountRef.current < maxFailures) {
        console.debug('NotificationBell: Failed to fetch unread count (will retry)')
      } else {
        console.warn('NotificationBell: Stopped polling after repeated failures')
      }
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-primary/50"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-secondary" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent-orange text-primary text-xs font-medium flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[400px] p-0 border-0 shadow-lg"
        sideOffset={8}
      >
        <NotificationCenter onClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}
