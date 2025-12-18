'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2 } from 'lucide-react'

const saveSearchSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  schedule_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  day_of_week: z.number().min(1).max(7).optional(),
  day_of_month: z.number().min(1).max(31).optional(),
  notify_in_app: z.boolean(),
  notify_email: z.boolean(),
})

type SaveSearchFormData = z.infer<typeof saveSearchSchema>

interface SavedSearch {
  id: string
  name: string
  frequency: string
  created_at: string
}

interface SaveSearchModalProps {
  open: boolean
  onClose: () => void
  searchParams: {
    what?: string
    where?: string
    salary_min?: number
    full_time?: boolean
    permanent?: boolean
    sort_by?: string
  }
}

export function SaveSearchModal({ open, onClose, searchParams }: SaveSearchModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [existingSearches, setExistingSearches] = useState<SavedSearch[]>([])
  const [isAtMax, setIsAtMax] = useState(false)
  const [selectedSearchToReplace, setSelectedSearchToReplace] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SaveSearchFormData>({
    resolver: zodResolver(saveSearchSchema),
    defaultValues: {
      name: '',
      frequency: 'WEEKLY',
      schedule_time: '08:00',
      notify_in_app: true,
      notify_email: true,
    },
  })

  const frequency = watch('frequency')

  // Fetch existing searches when modal opens
  useEffect(() => {
    if (open) {
      fetchExistingSearches()
    }
  }, [open])

  async function fetchExistingSearches() {
    try {
      const res = await fetch('/api/saved-searches')
      if (res.ok) {
        const data = await res.json()
        setExistingSearches(data.searches || [])
        setIsAtMax(data.searches?.length >= 3)
      }
    } catch (error) {
      console.error('Error fetching saved searches:', error)
    }
  }

  async function onSubmit(data: SaveSearchFormData) {
    setIsLoading(true)

    try {
      const payload = {
        name: data.name,
        query_config: {
          what: searchParams.what,
          where: searchParams.where,
          salary_min: searchParams.salary_min,
          full_time: searchParams.full_time ? 1 : undefined,
          permanent: searchParams.permanent ? 1 : undefined,
          sort_by: searchParams.sort_by || 'date',
        },
        frequency: data.frequency,
        schedule_time: data.schedule_time,
        day_of_week: data.frequency === 'WEEKLY' ? data.day_of_week : undefined,
        day_of_month: data.frequency === 'MONTHLY' ? data.day_of_month : undefined,
        user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notify_in_app: data.notify_in_app,
        notify_email: data.notify_email,
      }

      let res: Response

      if (isAtMax && selectedSearchToReplace) {
        // Replace existing search
        res = await fetch(`/api/saved-searches/${selectedSearchToReplace}/replace`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        // Create new search
        res = await fetch('/api/saved-searches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        onClose()
        router.refresh()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to save search')
      }
    } catch (error) {
      console.error('Error saving search:', error)
      alert('Failed to save search')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save This Search</DialogTitle>
          <DialogDescription>
            Get notified when new jobs matching your criteria are posted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {isAtMax && (
            <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-lg p-4">
              <p className="text-sm font-medium text-secondary mb-3">
                You have 3 saved searches (maximum). Choose one to replace:
              </p>
              <RadioGroup
                value={selectedSearchToReplace || ''}
                onValueChange={setSelectedSearchToReplace}
                className="space-y-2"
              >
                {existingSearches.map(search => (
                  <div key={search.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={search.id} id={search.id} />
                    <Label htmlFor={search.id} className="cursor-pointer">
                      {search.name} ({search.frequency})
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Search Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Senior Developer in Boston"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <Select
                value={watch('frequency')}
                onValueChange={value => setValue('frequency', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule_time">Time *</Label>
              <Select
                value={watch('schedule_time')}
                onValueChange={value => setValue('schedule_time', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00">8:00 AM</SelectItem>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                  <SelectItem value="11:00">11:00 AM</SelectItem>
                  <SelectItem value="12:00">12:00 PM</SelectItem>
                  <SelectItem value="13:00">1:00 PM</SelectItem>
                  <SelectItem value="14:00">2:00 PM</SelectItem>
                  <SelectItem value="15:00">3:00 PM</SelectItem>
                  <SelectItem value="16:00">4:00 PM</SelectItem>
                  <SelectItem value="17:00">5:00 PM</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {frequency === 'WEEKLY' && (
            <div className="space-y-2">
              <Label htmlFor="day_of_week">Day of Week *</Label>
              <Select
                value={watch('day_of_week')?.toString() || '1'}
                onValueChange={value => setValue('day_of_week', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                  <SelectItem value="7">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {frequency === 'MONTHLY' && (
            <div className="space-y-2">
              <Label htmlFor="day_of_month">Day of Month *</Label>
              <Select
                value={watch('day_of_month')?.toString() || '1'}
                onValueChange={value => setValue('day_of_month', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-4">
            <Label>Notifications</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="notify_in_app" className="cursor-pointer">
                In-app notifications
              </Label>
              <Switch
                id="notify_in_app"
                checked={watch('notify_in_app')}
                onCheckedChange={checked => setValue('notify_in_app', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="notify_email" className="cursor-pointer">
                Email notifications
              </Label>
              <Switch
                id="notify_email"
                checked={watch('notify_email')}
                onCheckedChange={checked => setValue('notify_email', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (isAtMax && !selectedSearchToReplace)}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAtMax ? 'Replace & Save' : 'Save Search'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
