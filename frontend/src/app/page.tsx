import URLInput from "@/components/URLInput";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Glowing background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="orb-1 absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="orb-2 absolute top-40 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[100px]" />
        <div className="orb-1 absolute bottom-20 left-1/2 w-[300px] h-[300px] rounded-full bg-violet-500/5 blur-[80px]" />
      </div>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-16 pb-20 md:pt-28 md:pb-28 text-center bg-grid min-h-[85vh]">
        <div className="space-y-6 max-w-4xl animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            5 AI Agents · Powered by Archestra × MCP
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05]">
            Bring dead docs{" "}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-500 bg-clip-text text-transparent shimmer-text">
              back to life.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Paste a GitHub URL — five AI agents analyze your repo, read the code,
            generate documentation, score it, and{" "}
            <span className="text-white font-medium">improve it automatically</span>.
          </p>
        </div>

        {/* URL Input */}
        <div className="w-full max-w-2xl mt-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <URLInput />
        </div>

        {/* Animated Pipeline */}
        <div className="w-full max-w-4xl mt-14 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-4">The Pipeline</p>
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-0">
            {[
              { emoji: '🔗', label: 'GitHub URL', color: 'border-zinc-700 text-zinc-300' },
              { emoji: '🔍', label: 'Analyze', color: 'border-emerald-800/40 text-emerald-400' },
              { emoji: '📖', label: 'Read Code', color: 'border-cyan-800/40 text-cyan-400' },
              { emoji: '✍️', label: 'Generate', color: 'border-violet-800/40 text-violet-400' },
              { emoji: '📊', label: 'Score', color: 'border-amber-800/40 text-amber-400' },
              { emoji: '✨', label: 'Improve', color: 'border-pink-800/40 text-pink-400' },
              { emoji: '📄', label: 'README.md', color: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/30' },
            ].map((item, i) => (
              <div key={i} className="flex items-center">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-zinc-900/80 text-xs font-medium ${item.color}`}>
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                </div>
                {i < 6 && (
                  <div className="hidden md:flex items-center mx-1 text-zinc-700 overflow-hidden w-6">
                    <span className="animate-flow text-xs">→</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Cards Section */}
      <section className="px-6 pb-20 max-w-6xl mx-auto">
        <div className="text-center mb-12 animate-fade-in-up">
          <p className="text-xs text-emerald-500 uppercase tracking-widest mb-2">Meet the Agents</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Five specialized AI agents,{" "}
            <span className="text-zinc-500">one mission</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
          {/* Agent 1 */}
          <div className="group p-5 rounded-2xl glass hover:border-emerald-500/30 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg hover:shadow-emerald-900/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-800/20 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                🔍
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Repo Analyzer</h3>
                <p className="text-[10px] text-zinc-600">MCP #1 · Port 3002</p>
              </div>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Crawls GitHub API to map the file tree, detect languages, and find important files.
            </p>
            <div className="flex gap-1 mt-3 flex-wrap">
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/50 text-emerald-500/70 border border-emerald-800/20">analyze_repo</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/50 text-emerald-500/70 border border-emerald-800/20">metadata</span>
            </div>
          </div>

          {/* Agent 2 */}
          <div className="group p-5 rounded-2xl glass hover:border-cyan-500/30 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg hover:shadow-cyan-900/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-800/20 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                📖
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Code Reader</h3>
                <p className="text-[10px] text-zinc-600">MCP #2 · Port 3003</p>
              </div>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Reads key files, extracts function signatures, and intelligently chunks code for LLM.
            </p>
            <div className="flex gap-1 mt-3 flex-wrap">
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-950/50 text-cyan-500/70 border border-cyan-800/20">read_files</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-950/50 text-cyan-500/70 border border-cyan-800/20">smart_chunk</span>
            </div>
          </div>

          {/* Agent 3 */}
          <div className="group p-5 rounded-2xl glass hover:border-violet-500/30 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg hover:shadow-violet-900/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-950/50 border border-violet-800/20 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                ✍️
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Doc Generator</h3>
                <p className="text-[10px] text-zinc-600">MCP #3 · Port 3004</p>
              </div>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Uses Gemini 2.5 Flash to craft comprehensive, beautiful README files.
            </p>
            <div className="flex gap-1 mt-3 flex-wrap">
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-violet-950/50 text-violet-500/70 border border-violet-800/20">generate</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-violet-950/50 text-violet-500/70 border border-violet-800/20">gemini</span>
            </div>
          </div>

          {/* Agent 4 */}
          <div className="group p-5 rounded-2xl glass hover:border-amber-500/30 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg hover:shadow-amber-900/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/50 border border-amber-800/20 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                📊
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">README Scorer</h3>
                <p className="text-[10px] text-zinc-600">MCP #4 · Port 3005</p>
              </div>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Evaluates quality across 5 categories: completeness, accuracy, structure, readability, visual.
            </p>
            <div className="flex gap-1 mt-3 flex-wrap">
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/50 text-amber-500/70 border border-amber-800/20">validate</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/50 text-amber-500/70 border border-amber-800/20">score</span>
            </div>
          </div>

          {/* Agent 5 */}
          <div className="group p-5 rounded-2xl glass hover:border-pink-500/30 transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg hover:shadow-pink-900/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-pink-950/50 border border-pink-800/20 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                ✨
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Improver</h3>
                <p className="text-[10px] text-zinc-600">MCP #5 · Port 3006</p>
              </div>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Enhances the README based on score feedback, preserving content and improving quality.
            </p>
            <div className="flex gap-1 mt-3 flex-wrap">
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-pink-950/50 text-pink-500/70 border border-pink-800/20">enhance</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-pink-950/50 text-pink-500/70 border border-pink-800/20">iterate</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 pb-20 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs text-cyan-500 uppercase tracking-widest mb-2">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Three steps.{" "}
            <span className="text-zinc-500">Zero effort.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
          <div className="relative p-6 rounded-2xl glass text-center">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">1</div>
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="text-base font-bold text-white mb-1">Paste URL</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">Drop any public GitHub repo URL and optionally add custom instructions</p>
          </div>

          <div className="relative p-6 rounded-2xl glass text-center">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center">2</div>
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-base font-bold text-white mb-1">AI Analyzes</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">5 agents work in concert to analyze, read, generate, score, and improve</p>
          </div>

          <div className="relative p-6 rounded-2xl glass text-center">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">3</div>
            <div className="text-3xl mb-3">📄</div>
            <h3 className="text-base font-bold text-white mb-1">Get README</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">Download your polished README.md with quality scores and improvement options</p>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="px-6 pb-20 max-w-4xl mx-auto">
        <div className="glass rounded-2xl p-8 md:p-10">
          <div className="text-center mb-8">
            <p className="text-xs text-violet-400 uppercase tracking-widest mb-2">Under the Hood</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Powered by cutting-edge tech
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
            {[
              { icon: '✨', name: 'Gemini 2.5 Flash', desc: 'AI Model' },
              { icon: '⚡', name: 'Google AI', desc: 'Fast inference' },
              { icon: '🔌', name: 'MCP Protocol', desc: 'Tool standard' },
              { icon: '🎭', name: 'Archestra', desc: 'Orchestration' },
              { icon: '⚛️', name: 'Next.js 14', desc: 'Frontend' },
              { icon: '🚂', name: 'Express.js', desc: 'Backend' },
              { icon: '🐳', name: 'Docker', desc: 'Deployment' },
              { icon: '🤗', name: 'HF Spaces', desc: 'Hosting' },
            ].map((tech, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/30 hover:border-zinc-700/50 transition-colors">
                <span className="text-xl">{tech.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-white">{tech.name}</p>
                  <p className="text-[10px] text-zinc-500">{tech.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hackathon CTA */}
      <section className="px-6 pb-24 max-w-3xl mx-auto text-center">
        <div className="relative p-10 rounded-3xl overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/50 via-zinc-950 to-cyan-950/50 rounded-3xl border border-emerald-800/20" />

          <div className="relative z-10">
            <div className="text-5xl mb-4">🏎️</div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Built for{" "}
              <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                2 Fast 2 MCP
              </span>
            </h2>
            <p className="text-zinc-400 text-sm mb-6 max-w-lg mx-auto">
              This project demonstrates the power of multi-agent MCP systems through Archestra —
              5 specialized AI agents working together to resurrect dead documentation.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://github.com/yadnyeshkolte/readmere"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                View on GitHub
              </a>
              <Link
                href="/score"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-medium hover:border-zinc-600 hover:text-white transition-colors"
              >
                📊 Scoring Methodology
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
