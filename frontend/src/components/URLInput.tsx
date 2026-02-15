'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STYLE_OPTIONS = [
  { id: 'minimal', label: 'Minimal', desc: '~5 sections, concise' },
  { id: 'standard', label: 'Standard', desc: '~11 sections, balanced' },
  { id: 'detailed', label: 'Detailed', desc: '~14 sections, comprehensive' },
];

export default function URLInput() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [style, setStyle] = useState('standard');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.includes('github.com') || url.split('/').length < 4) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }
    setError('');
    const params = new URLSearchParams({ repo: url, style });
    if (userPrompt.trim()) {
      params.set('prompt', userPrompt.trim());
    }
    router.push(`/generate?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
      <div className={`relative rounded-xl transition-all duration-300 ${isFocused ? 'glow-emerald' : ''
        }`}>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(''); }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full pl-12 pr-4 py-4 rounded-xl bg-zinc-900 border border-zinc-700/50 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all text-base"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm ml-1 animate-fade-in">
          <span className="mr-1">⚠</span>{error}
        </p>
      )}

      {/* Output Style Selector */}
      <div className="flex items-center gap-2">
        {STYLE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setStyle(opt.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 border ${style === opt.id
                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                : 'bg-zinc-900/50 border-zinc-700/30 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
              }`}
          >
            <div className="font-semibold">{opt.label}</div>
            <div className="text-[10px] opacity-70 mt-0.5">{opt.desc}</div>
          </button>
        ))}
      </div>

      {/* Custom Instructions Toggle */}
      <button
        type="button"
        onClick={() => setShowPrompt(!showPrompt)}
        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors ml-1 w-fit"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${showPrompt ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Custom Instructions</span>
        {userPrompt && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
      </button>

      {showPrompt && (
        <div className="animate-fade-in">
          <textarea
            placeholder="e.g. Focus on API documentation, add deployment instructions for AWS, include architecture diagrams..."
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700/50 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all text-sm resize-none"
          />
          <p className="text-xs text-zinc-600 mt-1 ml-1">
            Guide the AI on what to emphasize in your README
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!url}
        className="w-full py-4 rounded-xl font-semibold text-base transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed relative overflow-hidden group
          bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-900/20 hover:shadow-emerald-700/30"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          Resurrect README
          <span className="text-lg group-hover:animate-float">🧟‍♂️</span>
        </span>
      </button>
    </form>
  );
}
