'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { NotificationItem } from './notification-item'
import { Loader2, Bell, CheckCheck } from 'lucide-react'
import type { Notification } from '@prisma/client'

interface NotificationCenterProps {
  onClose?: () => void
}

export function NotificationCenter({ onClose: _onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    try {
      setIsLoading(true)
      const res = await fetch('/api/notifications?limit=50')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleMarkAsRead(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      })

      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read_at: new Date() } : n))
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  async function handleMarkAllAsRead() {
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      })

      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date() })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg border border-secondary/10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary/10">
        <h2 className="font-lora text-xl font-bold text-secondary">Notifications</h2>
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            variant="ghost"
            size="sm"
            className="text-accent-teal hover:text-accent-teal/80"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent-teal" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="You're all caught up! New notifications will appear here."
            />
          </div>
        ) : (
          <div>
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
