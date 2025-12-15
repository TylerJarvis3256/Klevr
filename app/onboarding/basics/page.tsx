'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { OnboardingStepper } from '@/components/onboarding/stepper'
import { toast } from 'sonner'

const basicsSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  school: z.string().min(1, 'School is required'),
  major: z.string().min(1, 'Major is required'),
  graduation_year: z.number().int().min(2020).max(2035, 'Invalid graduation year'),
})

type BasicsFormData = z.infer<typeof basicsSchema>

export default function OnboardingBasicsPage() {
  const router = useRouter()
  const form = useForm<BasicsFormData>({
    resolver: zodResolver(basicsSchema),
    defaultValues: {
      full_name: '',
      school: '',
      major: '',
      graduation_year: new Date().getFullYear() + 1,
    },
  })

  async function onSubmit(data: BasicsFormData) {
    try {
      const res = await fetch('/api/profile/basics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save')
      }

      router.push('/onboarding/preferences')
    } catch (error) {
      toast.error('Failed to save your information. Please try again.')
    }
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="container max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <h2 className="font-lora text-3xl font-bold text-secondary">Klevr</h2>
        </div>

        <OnboardingStepper currentStep={1} totalSteps={4} />

        <div className="mt-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-card border border-secondary/10 p-8 md:p-10">
          <h1 className="font-lora text-3xl font-bold mb-2 text-secondary">Let's start with the basics</h1>
          <p className="text-base text-secondary/80 mb-8">
            Tell us a bit about yourself so we can personalize your experience.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="school"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School / University</FormLabel>
                  <FormControl>
                    <Input placeholder="Stanford University" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="major"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Major / Field of Study</FormLabel>
                  <FormControl>
                    <Input placeholder="Computer Science" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="graduation_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Graduation Year</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="2025"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

              <div className="flex justify-end gap-4 pt-4">
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
