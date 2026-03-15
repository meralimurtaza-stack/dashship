import { type FC } from 'react'

export type WorkflowStep = 'upload' | 'review' | 'plan' | 'build' | 'publish'

interface WorkflowStepperProps {
  currentStep: WorkflowStep
  completedSteps: WorkflowStep[]
  onStepClick?: (step: WorkflowStep) => void
}

const steps: { key: WorkflowStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'review', label: 'Review' },
  { key: 'plan', label: 'Plan' },
  { key: 'build', label: 'Build' },
  { key: 'publish', label: 'Publish' },
]

const CheckIcon: FC = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const WorkflowStepper: FC<WorkflowStepperProps> = ({
  currentStep,
  completedSteps,
  onStepClick,
}) => {
  const currentIndex = steps.findIndex((s) => s.key === currentStep)

  return (
    <div className="h-10 border-b border-ds-border bg-ds-surface flex items-center justify-center px-4 shrink-0">
      <div className="flex items-center gap-1">
        {steps.map((step, i) => {
          const isCompleted = completedSteps.includes(step.key)
          const isCurrent = step.key === currentStep
          const isFuture = !isCompleted && !isCurrent && i > currentIndex
          const isClickable = !isCurrent && (isCompleted || !isFuture)

          return (
            <div key={step.key} className="flex items-center">
              {i > 0 && (
                <div
                  className={`w-8 h-px mx-1 transition-colors ${
                    isCompleted || isCurrent ? 'bg-ds-accent' : 'bg-ds-border'
                  }`}
                />
              )}
              <button
                onClick={() => isClickable && onStepClick?.(step.key)}
                disabled={!isClickable}
                className={`
                  relative flex items-center gap-1.5 px-3 py-2.5 font-mono text-xs transition-all
                  ${isCurrent
                    ? 'text-ds-text font-medium'
                    : isCompleted
                    ? 'text-ds-text hover:opacity-70 cursor-pointer'
                    : 'text-ds-text-dim cursor-default'}
                `}
              >
                {isCompleted && !isCurrent && <CheckIcon />}
                <span>{step.label}</span>
                {isCurrent && (
                  <div className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-ds-accent" />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WorkflowStepper
