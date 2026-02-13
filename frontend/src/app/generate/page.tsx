'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProgressTracker from '@/components/ProgressTracker';
import ReadmePreview from '@/components/ReadmePreview';

function GenerateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const repoUrl = searchParams.get('repo');
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [readme, setReadme] = useState('');
  const [quality, setQuality] = useState<any>(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const [steps, setSteps] = useState([
    { id: 'analysis', label: 'Analyzing Repository', status: 'pending' as const, message: 'Waiting to start...' },
    { id: 'reading', label: 'Reading Code', status: 'pending' as const, message: 'Waiting for analysis...' },
    { id: 'generation', label: 'Generating Documentation', status: 'pending' as const, message: 'Waiting for code...' },
    { id: 'quality', label: 'Quality Check', status: 'pending' as const, message: 'Finalizing...' },
  ]);

  // Timer
  useEffect(() => {
    if (!started || complete || error) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [started, complete, error]);

  const updateStep = (id: string, status: any, message?: string) => {
    setSteps(prev => prev.map(s => {
      if (s.id === id) return { ...s, status, message: message || s.message };
      if (status === 'running' && prev.findIndex(p => p.id === s.id) < prev.findIndex(p => p.id === id)) {
        return { ...s, status: 'complete' };
      }
      return s;
    }));
  };

  useEffect(() => {
    if (!repoUrl || started) return;

    const startGeneration = async () => {
      setStarted(true);
      setError('');

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({ repoUrl }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Server returned ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('event: ')) {
              const type = lines[i].replace('event: ', '').trim();
              const dataLine = lines[i + 1];
              if (dataLine?.startsWith('data: ')) {
                const dataStr = dataLine.replace('data: ', '').trim();
                i++;
                try {
                  const data = JSON.parse(dataStr);

                  if (type === 'progress') {
                    updateStep(data.step, data.status, data.message);
                  } else if (type === 'result') {
                    setReadme(data.readme);
                    setQuality(data.quality);
                    setComplete(true);
                    setSteps(prev => prev.map(s => ({ ...s, status: 'complete' })));
                  } else if (type === 'error') {
                    setError(data.message);
                    setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s));
                  }
                } catch (e) {
                  console.error("SSE parse error:", e, dataStr);
                }
              }
            }
          }
        }

      } catch (err: any) {
        setError(err.message || 'Something went wrong');
        setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error', message: err.message } : s));
      }
    };

    startGeneration();
  }, [repoUrl, started]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Extract repo name from URL
  const repoName = repoUrl ? decodeURIComponent(repoUrl).split('/').slice(-2).join('/') : '';

  if (!repoUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-24 gap-4 text-center">
        <span className="text-5xl">💀</span>
        <h2 className="text-xl font-bold text-white">No repository URL provided</h2>
        <button onClick={() => router.push('/')} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm transition">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-6 md:p-10 max-w-[1600px] mx-auto w-full animate-fade-in-up">
      {/* Left Panel */}
      <div className="w-full lg:w-[340px] space-y-5 shrink-0">
        {/* Repo info */}
        <div className="glass rounded-2xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Resurrecting</p>
          <p className="text-white font-semibold text-sm truncate">{repoName}</p>
          {started && !complete && !error && (
            <p className="text-xs text-zinc-500 mt-2">Elapsed: {formatTime(elapsed)}</p>
          )}
          {complete && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <p className="text-xs text-emerald-400">Complete in {formatTime(elapsed)}</p>
            </div>
          )}
        </div>

        <ProgressTracker steps={steps} />

        {quality && (
          <div className="glass rounded-2xl p-5 animate-fade-in-up">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Quality Report</p>
            <div className="flex items-end gap-3 mb-3">
              <div className="text-3xl font-bold text-emerald-400">{quality.score}</div>
              <div className="text-zinc-500 text-sm pb-0.5">/100</div>
            </div>
            {/* Score bar */}
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-emerald-500 to-cyan-500"
                style={{ width: `${quality.score}%` }}
              />
            </div>
            {quality.suggestions?.length > 0 && (
              <ul className="text-xs text-zinc-500 space-y-1.5">
                {quality.suggestions.slice(0, 3).map((s: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-zinc-600 shrink-0">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-5 bg-red-950/30 border border-red-500/20 animate-fade-in">
            <p className="text-xs text-red-400 uppercase tracking-wider mb-2 font-medium">Error</p>
            <p className="text-sm text-red-300/80 leading-relaxed">{error}</p>
            <button
              onClick={() => { setStarted(false); setError(''); setSteps(s => s.map(st => ({ ...st, status: 'pending' as const }))); setElapsed(0); }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-500/20 text-red-400 text-xs hover:bg-red-900/50 transition"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Preview */}
      <div className="w-full lg:flex-1 min-w-0">
        {readme ? (
          <ReadmePreview content={readme} />
        ) : (
          <div className="h-[700px] border border-dashed border-zinc-800/50 rounded-2xl flex items-center justify-center bg-zinc-950/30">
            <div className="text-center space-y-4">
              {error ? (
                <>
                  <div className="text-5xl">💀</div>
                  <p className="text-zinc-500 text-sm">Generation failed</p>
                </>
              ) : (
                <>
                  <div className="text-5xl animate-float">🧟‍♂️</div>
                  <p className="text-zinc-500 text-sm">Resurrecting your documentation...</p>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" style={{ animationDelay: '300ms' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" style={{ animationDelay: '600ms' }}></span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-24">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-spin-slow">⚙️</div>
          <p className="text-zinc-500 text-sm">Loading...</p>
        </div>
      </div>
    }>
      <GenerateContent />
    </Suspense>
  )
}
