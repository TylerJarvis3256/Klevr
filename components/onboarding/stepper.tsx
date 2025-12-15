import { cn } from '@/lib/utils'

interface OnboardingStepperProps {
  currentStep: number
  totalSteps: number
}

export function OnboardingStepper({ currentStep, totalSteps }: OnboardingStepperProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const stepNumber = i + 1
        const isCompleted = stepNumber < currentStep
        const isCurrent = stepNumber === currentStep

        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                isCompleted && 'bg-accent-teal text-white shadow-md',
                isCurrent && 'bg-accent-orange text-white shadow-lg scale-110',
                !isCompleted && !isCurrent && 'bg-white border-2 border-secondary/30 text-secondary'
              )}
            >
              {stepNumber}
            </div>
            {stepNumber < totalSteps && (
              <div
                className={cn(
                  'h-1 w-12 rounded-full transition-all duration-300',
                  stepNumber < currentStep ? 'bg-accent-teal' : 'bg-secondary/20'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
