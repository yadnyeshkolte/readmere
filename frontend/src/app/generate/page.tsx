'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProgressTracker from '@/components/ProgressTracker';
import ReadmePreview from '@/components/ReadmePreview';
import DiffView from '@/components/DiffView';
import Link from 'next/link';

// Confetti component — CSS-only, no external deps
function Confetti() {
  const colors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: `${Math.random() * 2}s`,
    size: `${6 + Math.random() * 8}px`,
    duration: `${2 + Math.random() * 2}s`,
  }));

  return (
    <div className="confetti-container">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

// Toast notification
function Toast({ message, show, type = 'success' }: { message: string; show: boolean; type?: 'success' | 'info' }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 toast-enter">
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium
        ${type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' : 'bg-zinc-900/90 border-zinc-700/30 text-zinc-200'}`}>
        {type === 'success' ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
        )}
        {message}
      </div>
    </div>
  );
}

// Animated stat card
function StatCard({ icon, label, value, delay }: { icon: string; label: string; value: string; delay: string }) {
  return (
    <div className="animate-counter-pop glass rounded-xl px-3 py-2.5 text-center min-w-[80px]" style={{ animationDelay: delay }}>
      <div className="text-lg mb-0.5">{icon}</div>
      <div className="text-white font-bold text-sm">{value}</div>
      <div className="text-zinc-500 text-[10px] uppercase tracking-wider">{label}</div>
    </div>
  );
}

// README Stats bar
function ReadmeStats({ content }: { content: string }) {
  const words = content.split(/\s+/).filter(Boolean).length;
  const sections = (content.match(/^#{1,3}\s/gm) || []).length;
  const codeBlocks = (content.match(/```/g) || []).length / 2;
  const readingTime = Math.max(1, Math.ceil(words / 200));
  const badges = (content.match(/!\[.*?\]\(https:\/\/img\.shields\.io/g) || []).length;

  return (
    <div className="glass rounded-2xl p-4 animate-fade-in-up">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2.5">README Stats</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">📝</span>
          <span className="text-zinc-300">{words.toLocaleString()} words</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">📑</span>
          <span className="text-zinc-300">{sections} sections</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">💻</span>
          <span className="text-zinc-300">{Math.floor(codeBlocks)} code blocks</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">⏱️</span>
          <span className="text-zinc-300">{readingTime} min read</span>
        </div>
        {badges > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">🏷️</span>
            <span className="text-zinc-300">{badges} badges</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">📏</span>
          <span className="text-zinc-300">{content.split('\n').length} lines</span>
        </div>
      </div>
    </div>
  );
}

// PR Modal
function PRModal({ show, onClose, repoUrl, readme }: { show: boolean; onClose: () => void; repoUrl: string; readme: string }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ prUrl: string; prNumber: number } | null>(null);
  const [error, setError] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [show]);

  if (!show) return null;

  const handleCreate = async () => {
    if (!token.trim()) {
      setError('Please enter a GitHub token with repo write access');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/generate/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, readme, githubToken: token }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to create PR');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-6 max-w-md w-full space-y-4 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">Create Pull Request</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition">✕</button>
        </div>

        {result ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              PR #{result.prNumber} created!
            </div>
            <a
              href={result.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 rounded-lg text-center text-sm font-medium bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-500 hover:to-cyan-500 transition-all"
            >
              Open PR on GitHub →
            </a>
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Enter a GitHub Personal Access Token with <code className="text-emerald-400 bg-emerald-950/30 px-1 rounded">repo</code> scope to create a PR with the generated README.
            </p>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-emerald-400 transition-colors w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showGuide ? 'rotate-90' : ''}`}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
              How to get a GitHub Personal Access Token
            </button>

            {showGuide && (
              <div className="animate-fade-in rounded-lg bg-zinc-900/80 border border-zinc-700/40 p-3 space-y-2 text-[11px] text-zinc-400">
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">GitHub &rarr; Settings &rarr; Developer Settings &rarr; Personal Access Tokens</a></li>
                  <li>Click <span className="text-white font-medium">&quot;Generate new token (classic)&quot;</span></li>
                  <li>Give it a name like <code className="text-emerald-400 bg-emerald-950/30 px-1 rounded">README Resurrector</code></li>
                  <li>Under scopes, check <code className="text-emerald-400 bg-emerald-950/30 px-1 rounded">repo</code> (Full control of private repositories)</li>
                  <li>Click <span className="text-white font-medium">&quot;Generate token&quot;</span> at the bottom</li>
                  <li>Copy the token (starts with <code className="text-emerald-400 bg-emerald-950/30 px-1 rounded">ghp_</code>) and paste it below</li>
                </ol>
                <p className="text-zinc-600 text-[10px] mt-1">⚠️ Make sure to copy the token immediately &mdash; GitHub only shows it once!</p>
              </div>
            )}

            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={e => { setToken(e.target.value); setError(''); }}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700/50 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all text-sm font-mono"
            />

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex items-start gap-1.5 text-[10px] text-zinc-500 bg-zinc-900/50 rounded-lg px-3 py-2">
              <span className="text-zinc-600 mt-0.5">🔒</span>
              <span>Your token is only used for this request and is never stored. It&apos;s sent directly to GitHub&apos;s API over HTTPS.</span>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading || !token.trim()}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-300 border
                bg-emerald-950/30 border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/40 hover:border-emerald-500/40
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating PR...
                </span>
              ) : '🚀 Create PR'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function GenerateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const repoUrl = searchParams.get('repo');
  const userPrompt = searchParams.get('prompt') || '';
  const style = searchParams.get('style') || 'standard';
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [readme, setReadme] = useState('');
  const [quality, setQuality] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [originalReadme, setOriginalReadme] = useState('');
  const [previousReadme, setPreviousReadme] = useState('');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [improving, setImproving] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [improvePrompt, setImprovePrompt] = useState('');
  const [showImproveInput, setShowImproveInput] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'diff' | 'improve-diff'>('preview');
  const [showPRModal, setShowPRModal] = useState(false);

  type StepStatus = 'pending' | 'running' | 'complete' | 'error';
  interface Step { id: string; label: string; status: StepStatus; message: string; }

  const [steps, setSteps] = useState<Step[]>([
    { id: 'analysis', label: 'Analyzing Repository', status: 'pending', message: 'Waiting to start...' },
    { id: 'insights', label: 'Gathering Insights', status: 'pending', message: 'Waiting for analysis...' },
    { id: 'reading', label: 'Reading Code', status: 'pending', message: 'Waiting for insights...' },
    { id: 'generation', label: 'Generating Documentation', status: 'pending', message: 'Waiting for code...' },
    { id: 'quality', label: 'Quality Check', status: 'pending', message: 'Finalizing...' },
  ]);

  const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

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

  // Persist state to sessionStorage for navigation resilience
  useEffect(() => {
    if (complete && readme && repoUrl) {
      try {
        sessionStorage.setItem('readmere_generate_state', JSON.stringify({
          repoUrl, readme, quality, metadata, originalReadme, previousReadme, elapsed, complete: true,
        }));
      } catch (e) { /* sessionStorage full */ }
    }
  }, [complete, readme, quality, metadata, originalReadme, previousReadme, elapsed, repoUrl]);

  useEffect(() => {
    if (!repoUrl || started) return;

    // Restore from session storage if available (e.g. after navigating to score page and back)
    const saved = sessionStorage.getItem('readmere_generate_state');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.repoUrl === repoUrl && data.complete) {
          setReadme(data.readme || '');
          setQuality(data.quality || null);
          setMetadata(data.metadata || null);
          setOriginalReadme(data.originalReadme || '');
          setPreviousReadme(data.previousReadme || '');
          setElapsed(data.elapsed || 0);
          setComplete(true);
          setStarted(true);
          setSteps(prev => prev.map(s => ({ ...s, status: 'complete' as StepStatus })));
          return;
        }
      } catch (e) {
        // Invalid session data, continue with generation
      }
    }

    const startGeneration = async () => {
      setStarted(true);
      setError('');

      try {
        const body: any = { repoUrl, style };
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

          // SSE events are separated by double newlines
          const events = buffer.split('\n\n');
          // Keep the last part (may be incomplete)
          buffer = events.pop() || '';

          for (const eventBlock of events) {
            const lines = eventBlock.split('\n');
            let type = '';
            let dataStr = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                type = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                dataStr += (dataStr ? '\n' : '') + line.slice(6);
              }
            }

            if (!type || !dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              if (type === 'progress') {
                updateStep(data.step, data.status, data.message);
              } else if (type === 'result') {
                setReadme(data.readme);
                setQuality(data.quality);
                setMetadata(data.metadata);
                if (data.originalReadme) {
                  setOriginalReadme(data.originalReadme);
                }
                setComplete(true);
                setSteps(prev => prev.map(s => ({ ...s, status: 'complete' })));

                // Trigger confetti on good scores
                if (data.quality?.score >= 70) {
                  setShowConfetti(true);
                  setTimeout(() => setShowConfetti(false), 4000);
                }
                showToast('README resurrected successfully! 🧟‍♂️');
              } else if (type === 'error') {
                setError(data.message);
                setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s));
              }
            } catch (e) {
              console.error("SSE parse error:", e, dataStr.substring(0, 200));
            }
          }
        }

      } catch (err: any) {
        setError(err.message || 'Something went wrong');
        setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error', message: err.message } : s));
      }
    };

    startGeneration();
  }, [repoUrl, started, showToast]);

  const handleImprove = async () => {
    if (!readme || improving) return;
    setImproving(true);
    setPreviousReadme(readme); // Save for diff

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/generate/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readme,
          suggestions: quality?.suggestions?.join(', ') || 'Improve overall quality',
          customPrompt: improvePrompt.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error('Improve request failed');

      const result = await response.json();
      setReadme(result.readme);
      setQuality(result.quality);
      setViewMode('improve-diff'); // Auto-switch to diff view

      if (result.quality?.score >= 70) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
      showToast(`Score improved to ${result.quality?.score}/100! ✨`);
      setImprovePrompt('');
      setShowImproveInput(false);
    } catch (err: any) {
      showToast('Improvement failed, try again', 'info');
    } finally {
      setImproving(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleContentChange = useCallback((newContent: string) => {
    setReadme(newContent);
  }, []);

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
    <>
    {/* Fixed-position elements outside animated container for proper viewport centering */}
    {showConfetti && <Confetti />}
    {toast && <Toast message={toast.message} show={true} type={toast.type} />}
    {repoUrl && <PRModal show={showPRModal} onClose={() => setShowPRModal(false)} repoUrl={repoUrl} readme={readme} />}

    <div className="flex flex-col lg:flex-row gap-8 p-6 md:p-10 max-w-[1600px] mx-auto w-full animate-fade-in-up">
      {/* Left Panel */}
      <div className="w-full lg:w-[360px] space-y-5 shrink-0">
        {/* Repo info */}
        <div className="glass rounded-2xl p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Resurrecting</p>
          <p className="text-white font-semibold text-sm truncate">{repoName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${style === 'minimal' ? 'bg-blue-950/50 text-blue-400 border border-blue-500/20' :
                style === 'detailed' ? 'bg-purple-950/50 text-purple-400 border border-purple-500/20' :
                  'bg-emerald-950/50 text-emerald-400 border border-emerald-500/20'
              }`}>
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </span>
          </div>
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

        {/* Repo Stats Cards — shown after metadata is available */}
        {metadata && (
          <div className="glass rounded-2xl p-4 animate-fade-in-up">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Repository</p>
            <div className="flex flex-wrap gap-2">
              {metadata.stars !== undefined && (
                <StatCard icon="⭐" label="Stars" value={metadata.stars?.toLocaleString() || '0'} delay="0s" />
              )}
              {metadata.language && (
                <StatCard icon="💻" label="Language" value={metadata.language} delay="0.1s" />
              )}
              {metadata.forks !== undefined && (
                <StatCard icon="🍴" label="Forks" value={metadata.forks?.toLocaleString() || '0'} delay="0.2s" />
              )}
              {metadata.openIssues !== undefined && (
                <StatCard icon="📋" label="Issues" value={metadata.openIssues?.toLocaleString() || '0'} delay="0.3s" />
              )}
            </div>
          </div>
        )}

        {/* README Stats */}
        {readme && <ReadmeStats content={readme} />}

        {quality && (
          <div className="glass rounded-2xl p-5 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Quality Report</p>
              <a
                href="/score"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-zinc-600 hover:text-emerald-400 transition-colors underline underline-offset-2"
              >
                How is this scored?
              </a>
            </div>

            {/* Circular Score */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(63, 63, 70, 0.3)" strokeWidth="6" />
                  <circle
                    cx="50" cy="50" r="45" fill="none"
                    stroke={quality.score >= 80 ? '#10b981' : quality.score >= 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * quality.score) / 100}
                    className="animate-score-ring"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-lg font-bold ${scoreColor(quality.score)}`}>{quality.score}</span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  {quality.score >= 90 ? '🏆 Excellent!' : quality.score >= 80 ? '✅ Great' : quality.score >= 60 ? '⚡ Good' : '🔧 Needs Work'}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">out of 100 points</div>
              </div>
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

            {/* Improve Score Section */}
            {quality.score < 95 && (
              <div className="space-y-2">
                {/* Toggle for custom instructions */}
                <button
                  type="button"
                  onClick={() => setShowImproveInput(!showImproveInput)}
                  className="flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors w-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showImproveInput ? 'rotate-90' : ''}`}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  Add custom improvement instructions
                </button>

                {showImproveInput && (
                  <div className="animate-fade-in">
                    <textarea
                      placeholder="e.g. Add more code examples, focus on API docs, make installation clearer..."
                      value={improvePrompt}
                      onChange={(e) => setImprovePrompt(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-700/40 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/40 transition-all text-xs resize-none"
                    />
                  </div>
                )}

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
                      ✨ Improve Score {improvePrompt.trim() ? '(with instructions)' : ''}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {complete && readme && (
          <div className="space-y-2 animate-fade-in-up">
            <button
              onClick={() => setShowPRModal(true)}
              className="w-full py-2.5 rounded-xl text-xs font-medium transition-all duration-300 border
                bg-gradient-to-r from-emerald-950/30 to-cyan-950/30 border-emerald-500/20 text-emerald-400
                hover:from-emerald-900/40 hover:to-cyan-900/40 hover:border-emerald-500/40
                flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                <line x1="6" y1="9" x2="6" y2="21" />
              </svg>
              Create PR on GitHub
            </button>
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

      {/* Right Panel - Preview / Diff */}
      <div className="w-full lg:flex-1 min-w-0">
        {readme ? (
          <div className="space-y-0">
            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 mb-3">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'preview'
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
              >
                📄 Preview
              </button>
              {originalReadme && (
                <button
                  onClick={() => setViewMode('diff')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'diff'
                      ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                    }`}
                >
                  ⚡ Diff vs Original
                </button>
              )}
              {previousReadme && (
                <button
                  onClick={() => setViewMode('improve-diff')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'improve-diff'
                      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                    }`}
                >
                  🔄 Improvement Diff
                </button>
              )}
            </div>

            {/* Content */}
            {viewMode === 'preview' && (
              <ReadmePreview content={readme} onCopy={() => showToast('Copied to clipboard! 📋')} onContentChange={handleContentChange} />
            )}
            {viewMode === 'diff' && originalReadme && (
              <div className="glass rounded-2xl p-5 overflow-auto max-h-[800px]">
                <DiffView
                  oldText={originalReadme}
                  newText={readme}
                  oldLabel="Original README"
                  newLabel="Generated README"
                />
              </div>
            )}
            {viewMode === 'improve-diff' && previousReadme && (
              <div className="glass rounded-2xl p-5 overflow-auto max-h-[800px]">
                <DiffView
                  oldText={previousReadme}
                  newText={readme}
                  oldLabel="Before Improvement"
                  newLabel="After Improvement"
                />
              </div>
            )}
          </div>
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
    </>
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
