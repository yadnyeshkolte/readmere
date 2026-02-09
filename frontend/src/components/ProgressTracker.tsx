'use client';

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  message?: string;
}

interface ProgressTrackerProps {
  steps: Step[];
}

export default function ProgressTracker({ steps }: ProgressTrackerProps) {
  return (
    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4 text-white">Generation Progress</h3>
      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={step.id} className="relative flex gap-4">
             {/* Connector Line */}
            {index !== steps.length - 1 && (
              <div className="absolute left-[15px] top-8 bottom-[-24px] w-[2px] bg-zinc-800" />
            )}
            
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10
              ${step.status === 'complete' ? 'bg-emerald-500 text-black' : 
                step.status === 'running' ? 'bg-emerald-900 text-emerald-400 ring-2 ring-emerald-500 animate-pulse' : 
                step.status === 'error' ? 'bg-red-500 text-white' :
                'bg-zinc-800 text-zinc-500'}
            `}>
              {step.status === 'complete' ? '✓' : index + 1}
            </div>
            
            <div className="flex-1">
              <p className={`font-medium ${
                step.status === 'pending' ? 'text-zinc-500' : 'text-white'
              }`}>
                {step.label}
              </p>
              {step.message && (
                <p className="text-sm text-zinc-400 mt-1">{step.message}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
