'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProgressTracker from '@/components/ProgressTracker';
import ReadmePreview from '@/components/ReadmePreview';

function GenerateContent() {
  const searchParams = useSearchParams();
  const repoUrl = searchParams.get('repo');
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [readme, setReadme] = useState('');
  const [quality, setQuality] = useState<any>(null);
  const [error, setError] = useState('');

  const [steps, setSteps] = useState([
    { id: 'analysis', label: 'Analyzing Repository', status: 'pending' as const, message: 'Waiting to start...' },
    { id: 'reading', label: 'Reading Code', status: 'pending' as const, message: 'Waiting for analysis...' },
    { id: 'generation', label: 'Generating Documentation', status: 'pending' as const, message: 'Waiting for code...' },
    { id: 'quality', label: 'Quality Check', status: 'pending' as const, message: 'Finalizing...' },
  ]);

  const updateStep = (id: string, status: any, message?: string) => {
    setSteps(prev => prev.map(s => {
        if (s.id === id) return { ...s, status, message: message || s.message };
        // If a step is running, previous steps should be complete
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
            throw new Error(await response.text());
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('
');
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('event: ')) {
                const type = lines[i].replace('event: ', '').trim();
                const dataLine = lines[i+1];
                if (dataLine?.startsWith('data: ')) {
                    const dataStr = dataLine.replace('data: ', '').trim();
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
                        console.error("Parse error", e);
                    }
                }
            }
          }
        }

      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      }
    };

    startGeneration();
  }, [repoUrl, started]);

  if (!repoUrl) return <div className="text-white p-12">No repository URL provided.</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-6 md:p-12 max-w-[1600px] mx-auto w-full">
      <div className="w-full lg:w-1/3 space-y-6">
        <h1 className="text-2xl font-bold text-white mb-6">Resurrecting README...</h1>
        <ProgressTracker steps={steps} />
        
        {quality && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-2">Quality Report</h3>
                <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl font-bold text-emerald-500">{quality.score}/100</div>
                    <div className="text-zinc-400">Documentation Score</div>
                </div>
                {quality.suggestions?.length > 0 && (
                    <ul className="text-sm text-zinc-400 list-disc list-inside">
                        {quality.suggestions.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                        ))}
                    </ul>
                )}
            </div>
        )}

        {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-6 text-red-200">
                <h3 className="font-bold mb-2">Error</h3>
                <p>{error}</p>
            </div>
        )}
      </div>

      <div className="w-full lg:w-2/3">
        {readme ? (
            <ReadmePreview content={readme} />
        ) : (
            <div className="h-[600px] border border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 bg-zinc-900/30">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-bounce">🧟‍♂️</div>
                    <p>Working on your documentation...</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

export default function GeneratePage() {
    return (
        <Suspense fallback={<div className="text-white p-12">Loading...</div>}>
            <GenerateContent />
        </Suspense>
    )
}
