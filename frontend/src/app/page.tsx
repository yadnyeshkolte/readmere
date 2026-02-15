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
        <div className="orb-2 absolute top-[60%] left-1/3 w-[350px] h-[350px] rounded-full bg-pink-500/5 blur-[100px]" />
      </div>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-12 pb-16 md:pt-24 md:pb-24 text-center bg-grid min-h-[90vh]">
        <div className="space-y-6 max-w-4xl animate-fade-in-up">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            5 MCP Agents · Archestra Orchestrated · Gemini 2.5 Flash
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05]">
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

          {/* Quick stats */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold text-sm">5</span> MCP Agents
            </div>
            <span className="text-zinc-700 hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold text-sm">14</span> MCP Tools
            </div>
            <span className="text-zinc-700 hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-violet-400 font-bold text-sm">1M</span> Token Context
            </div>
            <span className="text-zinc-700 hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-bold text-sm">100</span> Point Scoring
            </div>
          </div>
        </div>

        {/* URL Input */}
        <div className="w-full max-w-2xl mt-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <URLInput />
        </div>

        {/* Animated Pipeline */}
        <div className="w-full max-w-5xl mt-14 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-4">The MCP Pipeline</p>
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-0">
            {[
              { emoji: '🔗', label: 'GitHub URL', color: 'border-zinc-700 text-zinc-300', sub: '' },
              { emoji: '🔍', label: 'Analyze', color: 'border-emerald-800/40 text-emerald-400', sub: 'MCP #1' },
              { emoji: '📖', label: 'Read Code', color: 'border-cyan-800/40 text-cyan-400', sub: 'MCP #2' },
              { emoji: '✍️', label: 'Generate', color: 'border-violet-800/40 text-violet-400', sub: 'MCP #3' },
              { emoji: '📊', label: 'Score', color: 'border-amber-800/40 text-amber-400', sub: 'MCP #4' },
              { emoji: '✨', label: 'Improve', color: 'border-pink-800/40 text-pink-400', sub: 'MCP #5' },
              { emoji: '📄', label: 'README.md', color: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/30', sub: '' },
            ].map((item, i) => (
              <div key={i} className="flex items-center">
                <div className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border bg-zinc-900/80 text-xs font-medium ${item.color}`}>
                  <div className="flex items-center gap-1.5">
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.sub && <span className="text-[9px] opacity-50">{item.sub}</span>}
                </div>
                {i < 6 && (
                  <div className="hidden md:flex items-center mx-1 text-emerald-500/70 overflow-hidden w-6">
                    <span className="animate-flow text-xs">→</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MCP Architecture Diagram Section */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in-up">
          <p className="text-xs text-violet-400 uppercase tracking-widest mb-2">System Architecture</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            Multi-Agent MCP in Action
          </h2>
          <p className="text-zinc-500 text-sm mt-3 max-w-2xl mx-auto">
            Each agent is a standalone MCP server with its own tools, communicating via the standardized Model Context Protocol. Archestra orchestrates the pipeline.
          </p>
        </div>

        {/* Architecture Diagram */}
        <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 animate-fade-in-up relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-[60px]" />

          <div className="relative z-10">
            {/* Top: User → Frontend → Backend */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
              <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-center">
                <div className="text-xl sm:text-2xl mb-1">🧟‍♂️</div>
                <div className="text-[10px] sm:text-xs font-semibold text-white">User</div>
              </div>
              <div className="text-emerald-500/70 text-base sm:text-lg">→</div>
              <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-center">
                <div className="text-xl sm:text-2xl mb-1">⚛️</div>
                <div className="text-[10px] sm:text-xs font-semibold text-white">Next.js</div>
                <div className="text-[8px] sm:text-[9px] text-zinc-500">Frontend</div>
              </div>
              <div className="text-emerald-500/70 text-base sm:text-lg hidden md:block">
                <div className="text-[9px] text-emerald-500/60 text-center mb-0.5">SSE Stream</div>
                →
              </div>
              <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-center">
                <div className="text-xl sm:text-2xl mb-1">🚂</div>
                <div className="text-[10px] sm:text-xs font-semibold text-white">Express</div>
                <div className="text-[8px] sm:text-[9px] text-zinc-500">Backend</div>
              </div>
              <div className="text-emerald-500/70 text-base sm:text-lg hidden md:block">→</div>
              <div className="px-3 sm:px-5 py-2 sm:py-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                <div className="text-xl sm:text-2xl mb-1">🎭</div>
                <div className="text-[10px] sm:text-xs font-bold text-emerald-400">Archestra</div>
                <div className="text-[8px] sm:text-[9px] text-emerald-500/60">Orchestrator</div>
              </div>
            </div>

            {/* Connector */}
            <div className="flex justify-center mb-6">
              <div className="w-px h-8 bg-gradient-to-b from-emerald-500/40 to-transparent"></div>
            </div>

            {/* MCP Servers row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { num: 1, icon: '🔍', name: 'Repo Analyzer', port: 3002, tools: ['get_repo_metadata', 'analyze_repository', 'identify_important_files', 'get_repo_insights'], llm: false, borderClass: 'border-emerald-800/20 hover:border-emerald-500/40' },
                { num: 2, icon: '📖', name: 'Code Reader', port: 3003, tools: ['read_files', 'extract_signatures', 'smart_chunk', 'extract_commands'], llm: false, borderClass: 'border-cyan-800/20 hover:border-cyan-500/40' },
                { num: 3, icon: '✍️', name: 'Doc Generator', port: 3004, tools: ['generate_readme'], llm: true, borderClass: 'border-violet-800/20 hover:border-violet-500/40' },
                { num: 4, icon: '📊', name: 'Scorer', port: 3005, tools: ['validate_readme'], llm: true, borderClass: 'border-amber-800/20 hover:border-amber-500/40' },
                { num: 5, icon: '✨', name: 'Improver', port: 3006, tools: ['enhance_readme'], llm: true, borderClass: 'border-pink-800/20 hover:border-pink-500/40' },
              ].map((agent) => (
                <div key={agent.num} className={`group p-4 rounded-xl bg-zinc-900/60 border ${agent.borderClass} transition-all duration-300 hover:translate-y-[-2px]`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{agent.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-white">{agent.name}</div>
                      <div className="text-[9px] text-zinc-600">Port {agent.port}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {agent.tools.map((tool) => (
                      <span key={tool} className="px-1.5 py-0.5 rounded text-[8px] bg-zinc-800/80 text-zinc-400 border border-zinc-700/30 font-mono">
                        {tool}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px]">
                    {agent.llm ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        <span className="text-blue-400">Gemini 2.5 Flash</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                        <span className="text-zinc-500">No LLM needed</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Gemini connection for LLM agents */}
            <div className="flex justify-center mt-6">
              <div className="w-px h-6 bg-gradient-to-b from-transparent to-blue-500/40"></div>
            </div>
            <div className="flex justify-center mt-1">
              <div className="px-6 py-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-center">
                <div className="text-xl mb-1">🧠</div>
                <div className="text-xs font-bold text-blue-400">Gemini 2.5 Flash</div>
                <div className="text-[9px] text-blue-400/60">1M context · 65K output · Google AI</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Agent Cards Section */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in-up">
          <p className="text-xs text-emerald-500 uppercase tracking-widest mb-2">Meet the Agents</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            Five specialized AI agents,{" "}
            <span className="text-zinc-500">one mission</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
          {[
            {
              icon: '🔍', name: 'Repo Analyzer', port: 3002,
              desc: 'Crawls GitHub API to map file trees, detect languages, rank important files, and gather community insights.',
              tools: ['analyze_repo', 'metadata', 'insights'],
              cardClass: 'hover:border-emerald-500/30 hover:shadow-emerald-900/10',
              iconBgClass: 'bg-emerald-950/50 border-emerald-800/20',
              tagClass: 'bg-emerald-950/50 text-emerald-500/70 border-emerald-800/20',
            },
            {
              icon: '📖', name: 'Code Reader', port: 3003,
              desc: 'Reads key files, extracts function signatures, verified commands, and creates LLM-optimized chunks.',
              tools: ['read_files', 'smart_chunk', 'signatures'],
              cardClass: 'hover:border-cyan-500/30 hover:shadow-cyan-900/10',
              iconBgClass: 'bg-cyan-950/50 border-cyan-800/20',
              tagClass: 'bg-cyan-950/50 text-cyan-500/70 border-cyan-800/20',
            },
            {
              icon: '✍️', name: 'Doc Generator', port: 3004,
              desc: 'Uses Gemini 2.5 Flash with 32K output tokens to craft comprehensive, production-ready READMEs.',
              tools: ['generate', 'gemini', '3 styles'],
              cardClass: 'hover:border-violet-500/30 hover:shadow-violet-900/10',
              iconBgClass: 'bg-violet-950/50 border-violet-800/20',
              tagClass: 'bg-violet-950/50 text-violet-500/70 border-violet-800/20',
            },
            {
              icon: '📊', name: 'README Scorer', port: 3005,
              desc: 'Evaluates quality across 5 weighted categories: completeness, accuracy, structure, readability, visual.',
              tools: ['validate', 'score', '100-pt'],
              cardClass: 'hover:border-amber-500/30 hover:shadow-amber-900/10',
              iconBgClass: 'bg-amber-950/50 border-amber-800/20',
              tagClass: 'bg-amber-950/50 text-amber-500/70 border-amber-800/20',
            },
            {
              icon: '✨', name: 'Improver', port: 3006,
              desc: 'Enhances README based on score feedback and custom prompts, preserving content and boosting quality.',
              tools: ['enhance', 'iterate', 'preserve'],
              cardClass: 'hover:border-pink-500/30 hover:shadow-pink-900/10',
              iconBgClass: 'bg-pink-950/50 border-pink-800/20',
              tagClass: 'bg-pink-950/50 text-pink-500/70 border-pink-800/20',
            },
          ].map((agent, i) => (
            <div key={i} className={`group p-5 rounded-2xl glass ${agent.cardClass} transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${agent.iconBgClass} border flex items-center justify-center text-lg group-hover:scale-110 transition-transform`}>
                  {agent.icon}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                  <p className="text-[10px] text-zinc-600">MCP #{i + 1} · Port {agent.port}</p>
                </div>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">{agent.desc}</p>
              <div className="flex gap-1 mt-3 flex-wrap">
                {agent.tools.map((tool) => (
                  <span key={tool} className={`px-1.5 py-0.5 rounded text-[9px] ${agent.tagClass} border`}>
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs text-pink-400 uppercase tracking-widest mb-2">Features</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            Not just generation.{" "}
            <span className="text-zinc-500">A complete workflow.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {[
            { icon: '🎨', title: '3 Output Styles', desc: 'Minimal (~5 sections), Standard (~11), or Detailed (~14 sections with changelogs and roadmaps)' },
            { icon: '💬', title: 'Custom Instructions', desc: 'Tell the AI to focus on API docs, deployment guides, or any specific aspect of your project' },
            { icon: '📊', title: '100-Point Scoring', desc: '5 weighted categories: Completeness (30%), Accuracy (25%), Structure (20%), Readability (15%), Visual (10%)' },
            { icon: '✨', title: 'Iterative Improvement', desc: 'Click "Improve Score" with custom feedback to enhance weak areas while preserving existing content' },
            { icon: '⚡', title: 'Diff Views', desc: 'Visual comparison of original vs generated README, and before vs after each improvement iteration' },
            { icon: '🚀', title: 'One-Click PR', desc: 'Push the generated README directly to the GitHub repo as a Pull Request — no manual copying' },
            { icon: '🔧', title: 'Verified Commands', desc: 'Extracts real install/run/test commands from package.json, Makefile, Cargo.toml, go.mod, and more' },
            { icon: '👥', title: 'Community Insights', desc: 'Includes issues, PRs, contributors, releases, and community health data in the README' },
            { icon: '🛡️', title: 'Smart Fallback', desc: 'If the LLM fails, generates a basic README from metadata alone — you always get something useful' },
          ].map((feature, i) => (
            <div key={i} className="p-5 rounded-2xl glass hover:border-zinc-600/50 transition-all duration-300">
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className="text-sm font-bold text-white mb-1">{feature.title}</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-4xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs text-cyan-500 uppercase tracking-widest mb-2">How It Works</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            Three steps.{" "}
            <span className="text-zinc-500">Zero effort.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
          <div className="relative p-6 rounded-2xl glass text-center">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">1</div>
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="text-base font-bold text-white mb-1">Paste URL</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">Drop any public GitHub repo URL, pick a style, and optionally add custom instructions</p>
          </div>

          <div className="relative p-6 rounded-2xl glass text-center">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center">2</div>
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-base font-bold text-white mb-1">5 Agents Work</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">Watch real-time as agents analyze, read code, generate, score, and auto-improve your README</p>
          </div>

          <div className="relative p-6 rounded-2xl glass text-center">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">3</div>
            <div className="text-3xl mb-3">📄</div>
            <h3 className="text-base font-bold text-white mb-1">Get README</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">Preview, edit, compare diffs, improve further, or send it as a PR — all from the browser</p>
          </div>
        </div>
      </section>

      {/* Why MCP Section */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-5xl mx-auto">
        <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500 opacity-50"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
            <div>
              <p className="text-xs text-emerald-400 uppercase tracking-widest mb-3">Why MCP?</p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4">
                Why Multi-Agent Over Monolithic?
              </h2>
              <div className="space-y-4">
                {[
                  { title: 'Context Isolation', desc: 'The scorer evaluates independently of the generator\'s prompt — preventing scoring bias.' },
                  { title: 'No LLM Waste', desc: 'Agents 1 & 2 use GitHub API + regex — no LLM tokens spent on file listing or parsing.' },
                  { title: 'Composability', desc: 'Each MCP server works standalone — other apps can use just the scorer, just the generator, or any combination.' },
                  { title: 'Independent Scaling', desc: 'LLM-backed servers scale separately from API-backed ones. Rate limits affect one, not all.' },
                ].map((point, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-sm font-semibold text-white">{point.title}</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{point.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-cyan-400 uppercase tracking-widest mb-3">Why These Technologies?</p>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4">
                Built for Speed & Quality
              </h2>
              <div className="space-y-3">
                {[
                  { tech: 'Gemini 2.5 Flash', reason: '1M token context window — we send 50K chars of source code for maximum accuracy. 65K output tokens for comprehensive READMEs. Free tier: 1500 req/day.' },
                  { tech: 'MCP Protocol', reason: 'Standardized tool interface — any MCP client (Claude, Archestra, custom) can call our agents. Future-proof and composable.' },
                  { tech: 'Archestra Platform', reason: 'Registers, manages, and orchestrates MCP servers. Provides admin dashboard, chat UI, and centralized runtime.' },
                  { tech: 'Streamable HTTP + SSE', reason: 'Dual MCP transport for both modern and legacy clients. Real-time progress via SSE streaming.' },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/30">
                    <p className="text-xs font-bold text-white">{item.tech}</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-5xl mx-auto">
        <div className="glass rounded-2xl p-5 sm:p-8 md:p-10">
          <div className="text-center mb-6 sm:mb-8">
            <p className="text-xs text-violet-400 uppercase tracking-widest mb-2">Under the Hood</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
              Powered by cutting-edge tech
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 stagger-children">
            {[
              { icon: '🧠', name: 'Gemini 2.5 Flash', desc: '1M ctx · 65K out' },
              { icon: '🔌', name: 'MCP Protocol', desc: 'AI tool standard' },
              { icon: '🎭', name: 'Archestra', desc: 'MCP orchestration' },
              { icon: '⚛️', name: 'Next.js 14', desc: 'React framework' },
              { icon: '🚂', name: 'Express.js', desc: 'API + SSE' },
              { icon: '📡', name: 'SSE Streaming', desc: 'Real-time progress' },
              { icon: '🐳', name: 'Docker', desc: 'Containerized' },
              { icon: '🤗', name: 'HF Spaces', desc: 'Free hosting' },
              { icon: '▲', name: 'Vercel', desc: 'Frontend CDN' },
              { icon: '🔷', name: 'TypeScript', desc: 'Full stack' },
              { icon: '🎨', name: 'Tailwind CSS', desc: 'Styling' },
              { icon: '📝', name: 'react-markdown', desc: 'Preview render' },
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
      <section className="px-4 sm:px-6 pb-20 sm:pb-24 max-w-4xl mx-auto text-center">
        <div className="relative p-6 sm:p-10 md:p-14 rounded-2xl sm:rounded-3xl overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/50 via-zinc-950 to-cyan-950/50 rounded-3xl border border-emerald-800/20" />

          <div className="relative z-10">
            <div className="text-5xl mb-4">🏎️</div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3">
              Built for{" "}
              <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Developers
              </span>
            </h2>
            <p className="text-zinc-400 text-sm mb-4 max-w-lg mx-auto">
              This project demonstrates the power of multi-agent MCP systems through Archestra —
              5 specialized AI agents working together to resurrect dead documentation.
            </p>
            <p className="text-zinc-500 text-xs mb-8 max-w-md mx-auto">
              Most AI tools use a single monolithic prompt. We prove that{" "}
              <span className="text-white font-medium">specialized agents via MCP</span>{" "}
              produce better results — composable, scalable, and unbiased.
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
              <a
                href="https://yadnyeshkolte-archestra-platform.hf.space"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors"
              >
                🎭 Archestra Dashboard
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
