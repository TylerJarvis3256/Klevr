'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Mail, Lock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface UserData {
  email: string
  auth0_id: string
  created_at: string
}

export default function AccountPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    try {
      setIsLoading(true)
      const res = await fetch('/api/profile')
      if (!res.ok) throw new Error('Failed to fetch user data')
      const data = await res.json()
      setUser(data.user)
    } catch (error) {
      console.error('Error fetching user:', error)
      toast.error('Failed to load account information')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      toast.error('Please type the confirmation text exactly')
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch('/api/settings/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete account')
      }

      toast.success('Account deleted successfully. Redirecting...')

      // Sign out and redirect to home
      setTimeout(() => {
        window.location.href = '/api/auth/logout'
      }, 1500)
    } catch (error: any) {
      toast.error(error.message)
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent-teal" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <p className="text-center text-secondary/70">Failed to load account information</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Account Information */}
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <h2 className="font-lora text-2xl font-semibold text-secondary mb-6">
          Account Information
        </h2>

        <div className="space-y-6">
          {/* Email */}
          <div>
            <label className="text-sm font-medium text-secondary/70 mb-2 block">
              Email Address
            </label>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-accent-teal/10 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-accent-teal" />
              </div>
              <Input
                value={user.email}
                disabled
                className="bg-secondary/5 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-secondary/60 mt-2">
              Your email is managed by Auth0 and cannot be changed here
            </p>
          </div>

          {/* Account Created */}
          <div>
            <label className="text-sm font-medium text-secondary/70 mb-2 block">
              Account Created
            </label>
            <p className="text-secondary">
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Password Management */}
      <div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-12 w-12 rounded-xl bg-accent-orange/10 flex items-center justify-center flex-shrink-0">
            <Lock className="h-6 w-6 text-accent-orange" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-secondary mb-1">Password & Security</h3>
            <p className="text-sm text-secondary/70 mb-4">
              Your password is managed securely through Auth0. To change your password, sign out and use the "Forgot Password" link on the login page.
            </p>
            <div className="flex gap-3">
              <a href="/auth/logout">
                <Button variant="outline" className="rounded-full">
                  Sign Out to Change Password
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-status-error/20 shadow-card p-8">
        <div className="flex items-start gap-3 mb-6">
          <AlertTriangle className="h-6 w-6 text-status-error shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-status-error mb-1">Danger Zone</h3>
            <p className="text-sm text-secondary/70">
              Permanently delete your account and all associated data
            </p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <Button
            onClick={() => setShowDeleteConfirm(true)}
            variant="destructive"
            className="rounded-full"
          >
            Delete Account
          </Button>
        ) : (
          <div className="space-y-4 p-4 rounded-xl bg-status-error/5 border border-status-error/20">
            <div>
              <p className="text-sm font-medium text-status-error mb-2">
                This action cannot be undone. This will permanently delete:
              </p>
              <ul className="text-sm text-secondary/70 space-y-1 ml-4 list-disc">
                <li>All your job applications and notes</li>
                <li>Generated resumes and cover letters</li>
                <li>Your profile and preferences</li>
                <li>All usage history and AI tasks</li>
              </ul>
            </div>

            <div>
              <label className="text-sm font-medium text-secondary block mb-2">
                Type <span className="font-mono text-status-error">DELETE MY ACCOUNT</span> to
                confirm
              </label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="font-mono"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE MY ACCOUNT' || isDeleting}
                variant="destructive"
                className="rounded-full"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Confirm Delete Account'
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmation('')
                }}
                variant="outline"
                disabled={isDeleting}
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
