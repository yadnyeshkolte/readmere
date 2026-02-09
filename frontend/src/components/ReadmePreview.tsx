'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';

interface ReadmePreviewProps {
  content: string;
}

export default function ReadmePreview({ content }: ReadmePreviewProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[800px]">
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur">
        <h2 className="font-bold text-white">README.md Preview</h2>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition flex items-center gap-2"
          >
            {copied ? 'Copied!' : '📋 Copy Raw'}
          </button>
          <button
            onClick={downloadFile}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-2"
          >
            ⬇️ Download
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-8 prose prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({node, className, children, ...props}: any) {
              const match = /language-(\w+)/.exec(className || '')
              return match ? (
                <SyntaxHighlighter
                  {...props}
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                >
                  {String(children).replace(/
$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code {...props} className={className}>
                  {children}
                </code>
              )
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
