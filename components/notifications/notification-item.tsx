'use client'

import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Bell, ExternalLink } from 'lucide-react'
import type { Notification } from '@prisma/client'

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const isUnread = !notification.read_at

  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(notification.id)
    }
  }

  return (
    <div
      className={`
        p-4 border-b border-secondary/10 hover:bg-primary/30 transition-colors
        ${isUnread ? 'bg-accent-teal/5' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            ${isUnread ? 'bg-accent-teal text-primary' : 'bg-secondary/10 text-secondary/50'}
          `}
        >
          <Bell className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4
              className={`text-sm font-medium ${isUnread ? 'text-secondary' : 'text-secondary/70'}`}
            >
              {notification.title}
            </h4>
            {isUnread && (
              <div className="flex-shrink-0 w-2 h-2 bg-accent-teal rounded-full" />
            )}
          </div>

          <p className="text-sm text-secondary/70 mb-2">{notification.body}</p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary/50">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </span>

            {notification.link_url && (
              <Link
                href={notification.link_url}
                className="text-xs text-accent-teal hover:underline flex items-center gap-1"
                onClick={e => e.stopPropagation()}
              >
                View
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
