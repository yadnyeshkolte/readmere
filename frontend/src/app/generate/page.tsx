'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProgressTracker from '@/components/ProgressTracker';
import ReadmePreview from '@/components/ReadmePreview';
import Link from 'next/link';

function GenerateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const repoUrl = searchParams.get('repo');
  const userPrompt = searchParams.get('prompt') || '';
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [readme, setReadme] = useState('');
  const [quality, setQuality] = useState<any>(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [improving, setImproving] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  type StepStatus = 'pending' | 'running' | 'complete' | 'error';
  interface Step { id: string; label: string; status: StepStatus; message: string; }

  const [steps, setSteps] = useState<Step[]>([
    { id: 'analysis', label: 'Analyzing Repository', status: 'pending', message: 'Waiting to start...' },
    { id: 'reading', label: 'Reading Code', status: 'pending', message: 'Waiting for analysis...' },
    { id: 'generation', label: 'Generating Documentation', status: 'pending', message: 'Waiting for code...' },
    { id: 'quality', label: 'Quality Check', status: 'pending', message: 'Finalizing...' },
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
        const body: any = { repoUrl };
        if (userPrompt) body.userPrompt = userPrompt;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify(body),
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

  const handleImprove = async () => {
    if (!readme || improving) return;
    setImproving(true);

    try {
      const suggestions = quality?.suggestions?.join(', ') || 'Improve overall quality';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/generate/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readme, suggestions }),
      });

      if (!response.ok) throw new Error('Improve request failed');

      const result = await response.json();
      setReadme(result.readme);
      setQuality(result.quality);
    } catch (err: any) {
      console.error("Improve error:", err);
    } finally {
      setImproving(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const repoName = repoUrl ? decodeURIComponent(repoUrl).split('/').slice(-2).join('/') : '';

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const barColor = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-cyan-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-orange-500';
  };

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
      <div className="w-full lg:w-[360px] space-y-5 shrink-0">
        {/* Repo info */}
        <div className="glass rounded-2xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Resurrecting</p>
          <p className="text-white font-semibold text-sm truncate">{repoName}</p>
          {userPrompt && (
            <p className="text-xs text-emerald-400/60 mt-1 truncate" title={userPrompt}>
              ✨ Custom: {userPrompt}
            </p>
          )}
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
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Quality Report</p>
              <Link
                href="/score"
                className="text-[10px] text-zinc-600 hover:text-emerald-400 transition-colors underline underline-offset-2"
              >
                How is this scored?
              </Link>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <div className={`text-3xl font-bold ${scoreColor(quality.score)}`}>{quality.score}</div>
              <div className="text-zinc-500 text-sm pb-0.5">/100</div>
            </div>
            {/* Score bar */}
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-4">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${barColor(quality.score)}`}
                style={{ width: `${quality.score}%` }}
              />
            </div>

            {/* Category Breakdown */}
            {quality.categories && (
              <>
                <button
                  onClick={() => setShowCategories(!showCategories)}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-2 w-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showCategories ? 'rotate-90' : ''}`}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  Score Breakdown
                </button>
                {showCategories && (
                  <div className="space-y-2.5 animate-fade-in mb-3">
                    {Object.entries(quality.categories).map(([key, cat]: [string, any]) => (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-zinc-400">{cat.label}</span>
                          <span className={`font-medium ${scoreColor(cat.score)}`}>{cat.score}</span>
                        </div>
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${barColor(cat.score)}`}
                            style={{ width: `${cat.score}%` }}
                          />
                        </div>
                        {cat.detail && <p className="text-[10px] text-zinc-600 mt-0.5">{cat.detail}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {quality.suggestions?.length > 0 && (
              <ul className="text-xs text-zinc-500 space-y-1.5 mb-3">
                {quality.suggestions.slice(0, 3).map((s: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-zinc-600 shrink-0">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Improve Score Button */}
            {quality.score < 95 && (
              <button
                onClick={handleImprove}
                disabled={improving}
                className="w-full py-2 rounded-lg text-xs font-medium transition-all duration-300 border
                  bg-emerald-950/30 border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/40 hover:border-emerald-500/40
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {improving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Improving...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    ✨ Improve Score
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-2xl p-5 bg-red-950/30 border border-red-500/20 animate-fade-in">
            <p className="text-xs text-red-400 uppercase tracking-wider mb-2 font-medium">Error</p>
            <p className="text-sm text-red-300/80 leading-relaxed">{error}</p>
            <button
              onClick={() => { setStarted(false); setError(''); setSteps(s => s.map(st => ({ ...st, status: 'pending' as StepStatus }))); setElapsed(0); }}
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
