'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { OnboardingStepper } from '@/components/onboarding/stepper'
import { MultiSelect } from '@/components/ui/multi-select'
import { LocationInput } from '@/components/forms/location-input'
import { toast } from 'sonner'

const JOB_TYPES = [
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'FULL_TIME', label: 'Full-Time' },
  { value: 'PART_TIME', label: 'Part-Time' },
  { value: 'CONTRACT', label: 'Contract' },
]

const preferencesSchema = z.object({
  job_types: z.array(z.string()).min(1, 'Select at least one job type'),
  preferred_locations: z.array(z.string()).min(1, 'Add at least one location'),
})

type PreferencesFormData = z.infer<typeof preferencesSchema>

export default function OnboardingPreferencesPage() {
  const router = useRouter()
  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      job_types: [],
      preferred_locations: [],
    },
  })

  async function onSubmit(data: PreferencesFormData) {
    try {
      const res = await fetch('/api/profile/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }

      router.push('/onboarding/resume-upload')
    } catch (error) {
      toast.error('Failed to save preferences. Please try again.')
    }
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="container max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <h2 className="font-lora text-3xl font-bold text-secondary">Klevr</h2>
        </div>

        <OnboardingStepper currentStep={2} totalSteps={4} />

        <div className="mt-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-card border border-secondary/10 p-8 md:p-10">
          <h1 className="font-lora text-3xl font-bold mb-2 text-secondary">What are you looking for?</h1>
          <p className="text-base text-secondary/80 mb-8">
            Help us understand your job preferences.
          </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="job_types"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Types</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={JOB_TYPES}
                      selected={field.value}
                      onChange={field.onChange}
                      placeholder="Select job types..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferred_locations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Locations</FormLabel>
                  <FormControl>
                    <LocationInput
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between gap-4 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/onboarding/basics')}
              >
                Back
              </Button>
              <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Next Step'}
              </Button>
            </div>
          </form>
        </Form>
        </div>
      </div>
    </div>
  )
}
