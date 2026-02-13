import URLInput from "@/components/URLInput";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-24 gap-16 text-center bg-grid min-h-[calc(100vh-120px)]">
      {/* Hero */}
      <div className="space-y-6 max-w-3xl animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 text-xs font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Multi-Agent MCP Pipeline · Powered by Archestra
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
          Bring dead docs{" "}
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-500 bg-clip-text text-transparent">
            back to life.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Paste a GitHub URL. Three AI agents analyze your repo, read the code, and generate
          professional documentation in seconds.
        </p>
      </div>

      {/* Input */}
      <div className="w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <URLInput />
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl stagger-children">
        <div className="group p-6 rounded-2xl glass hover:border-emerald-500/30 transition-all duration-300 hover:translate-y-[-2px] hover:glow-emerald">
          <div className="w-12 h-12 rounded-xl bg-emerald-950/50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            🔍
          </div>
          <h3 className="text-lg font-bold mb-2 text-white">Deep Analysis</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Agent 1 crawls your repo via GitHub API — maps the file tree, identifies tech stack, and finds the most important files.
          </p>
        </div>
        <div className="group p-6 rounded-2xl glass hover:border-emerald-500/30 transition-all duration-300 hover:translate-y-[-2px] hover:glow-emerald">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            📖
          </div>
          <h3 className="text-lg font-bold mb-2 text-white">Smart Reading</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Agent 2 reads key files, extracts function signatures, and intelligently chunks code to fit the LLM context window.
          </p>
        </div>
        <div className="group p-6 rounded-2xl glass hover:border-emerald-500/30 transition-all duration-300 hover:translate-y-[-2px] hover:glow-emerald">
          <div className="w-12 h-12 rounded-xl bg-violet-950/50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            ✍️
          </div>
          <h3 className="text-lg font-bold mb-2 text-white">Generative Magic</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Agent 3 uses Llama 3 70B via Groq to draft, validate, and enhance beautiful markdown documentation.
          </p>
        </div>
      </div>

      {/* Architecture Badge */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-500 animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">3 MCP Servers</span>
        <span className="text-zinc-700">→</span>
        <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">Archestra Orchestration</span>
        <span className="text-zinc-700">→</span>
        <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">Llama 3 70B on Groq</span>
        <span className="text-zinc-700">→</span>
        <span className="px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-800/30 text-emerald-400">README.md ✨</span>
      </div>
    </div>
  );
}
