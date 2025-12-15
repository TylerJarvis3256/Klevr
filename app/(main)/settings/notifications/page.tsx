'use client'

import { Bell, Mail, MessageSquare, Calendar } from 'lucide-react'

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <h2 className="font-lora text-2xl font-semibold text-secondary mb-2">
          Notification Preferences
        </h2>
        <p className="text-secondary/70">
          Manage how and when you receive notifications (coming soon)
        </p>
      </div>

      {/* Coming Soon Placeholders */}
      <div className="space-y-4">
        {[
          {
            icon: Mail,
            title: 'Email Notifications',
            description: 'Receive email updates about your job applications',
            comingSoon: true,
          },
          {
            icon: Bell,
            title: 'Application Updates',
            description: 'Get notified when your application status changes',
            comingSoon: true,
          },
          {
            icon: Calendar,
            title: 'Weekly Summary',
            description: 'Receive a weekly summary of your job search activity',
            comingSoon: true,
          },
          {
            icon: MessageSquare,
            title: 'AI Task Completion',
            description: 'Get notified when AI-generated documents are ready',
            comingSoon: true,
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.title}
              className="bg-white rounded-2xl border border-secondary/10 shadow-card p-6 opacity-60"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-accent-teal/10 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-accent-teal" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary">{item.title}</h3>
                    <p className="text-sm text-secondary/60">{item.description}</p>
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-full bg-secondary/10 text-xs font-semibold text-secondary/60 uppercase tracking-wide">
                  Coming Soon
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info Card */}
      <div className="bg-accent-teal/5 rounded-2xl border border-accent-teal/20 p-6">
        <h3 className="font-semibold text-secondary mb-2">Notification Features</h3>
        <p className="text-sm text-secondary/70 leading-relaxed">
          Email and push notification settings will be available in a future update. For now, you
          can track all your updates directly in the dashboard and jobs pages.
        </p>
      </div>
    </div>
  )
}
