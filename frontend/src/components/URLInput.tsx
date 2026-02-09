'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function URLInput() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.includes('github.com') || url.split('/').length < 4) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }
    setError('');
    const encodedUrl = encodeURIComponent(url);
    router.push(`/generate?repo=${encodedUrl}`);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <div className="relative">
        <input
          type="text"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full p-4 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-lg"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
             <span className="text-zinc-500">↵</span>
        </div>
      </div>
      
      {error && <p className="text-red-500 text-sm ml-2">{error}</p>}
      
      <button
        type="submit"
        disabled={!url}
        className="w-full p-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
      >
        Resurrect README 🧟‍♂️
      </button>
    </form>
  );
}
