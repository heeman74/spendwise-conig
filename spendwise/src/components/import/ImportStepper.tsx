'use client';

interface Step {
  label: string;
  key: string;
}

const STEPS: Step[] = [
  { label: 'Upload', key: 'upload' },
  { label: 'Parse', key: 'parse' },
  { label: 'Preview', key: 'preview' },
  { label: 'Import', key: 'import' },
  { label: 'Done', key: 'done' },
];

interface ImportStepperProps {
  currentStep: string;
}

export default function ImportStepper({ currentStep }: ImportStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isCurrent ? 'bg-primary-600 text-white' : ''}
                  ${isFuture ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : ''}
                `}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`
                  text-xs mt-1 font-medium
                  ${isCurrent ? 'text-primary-600 dark:text-primary-400' : ''}
                  ${isCompleted ? 'text-green-600 dark:text-green-400' : ''}
                  ${isFuture ? 'text-gray-400 dark:text-gray-500' : ''}
                `}
              >
                {step.label}
              </span>
            </div>

            {index < STEPS.length - 1 && (
              <div
                className={`
                  flex-1 h-0.5 mx-2 mt-[-12px]
                  ${index < currentIndex ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
