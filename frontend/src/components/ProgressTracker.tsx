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

const statusIcons: Record<string, string> = {
  analysis: '🔍',
  reading: '📖',
  generation: '✍️',
  quality: '✅',
};

export default function ProgressTracker({ steps }: ProgressTrackerProps) {
  const completedCount = steps.filter(s => s.status === 'complete').length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="w-full max-w-md glass rounded-2xl p-6 relative overflow-hidden">
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-800">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Agent Pipeline</h3>
        <span className="text-xs text-zinc-500">{completedCount}/{steps.length}</span>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`relative flex gap-3.5 transition-all duration-300 ${step.status === 'pending' ? 'opacity-40' : 'opacity-100'
              }`}
          >
            {/* Connector Line */}
            {index !== steps.length - 1 && (
              <div className={`absolute left-[15px] top-9 bottom-[-12px] w-[1.5px] transition-colors duration-500 ${step.status === 'complete' ? 'bg-emerald-500/40' : 'bg-zinc-800'
                }`} />
            )}

            {/* Status Indicator */}
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center shrink-0 z-10 text-sm font-medium transition-all duration-300
              ${step.status === 'complete'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : step.status === 'running'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50 animate-pulse-ring'
                  : step.status === 'error'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-zinc-800/50 text-zinc-600 border border-zinc-700/50'}
            `}>
              {step.status === 'complete' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : step.status === 'error' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : step.status === 'running' ? (
                <span className="text-base">{statusIcons[step.id] || '⚡'}</span>
              ) : (
                <span className="text-xs">{index + 1}</span>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className={`text-sm font-medium ${step.status === 'running' ? 'text-emerald-400' :
                  step.status === 'complete' ? 'text-white' :
                    step.status === 'error' ? 'text-red-400' :
                      'text-zinc-500'
                }`}>
                {step.label}
              </p>
              {step.message && (
                <p className={`text-xs mt-0.5 truncate ${step.status === 'error' ? 'text-red-400/70' : 'text-zinc-500'
                  }`}>
                  {step.message}
                </p>
              )}
            </div>

            {/* Running indicator */}
            {step.status === 'running' && (
              <div className="flex items-center gap-0.5 pt-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '200ms' }}></span>
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '400ms' }}></span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
