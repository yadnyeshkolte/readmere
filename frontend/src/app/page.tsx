import URLInput from "@/components/URLInput";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center p-8 md:p-24 gap-12 text-center animate-fade-in">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          Bring dead docs <br />
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
            back to life.
          </span>
        </h1>
        <p className="text-xl text-zinc-400">
          Paste a GitHub URL and let our multi-agent MCP pipeline generate comprehensive, professional documentation in seconds.
        </p>
      </div>

      <URLInput />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-12">
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 transition">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-bold mb-2 text-white">Deep Analysis</h3>
          <p className="text-zinc-400">Agent 1 crawls your repo to understand the structure, tech stack, and key files.</p>
        </div>
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 transition">
          <div className="text-4xl mb-4">📖</div>
          <h3 className="text-xl font-bold mb-2 text-white">Smart Reading</h3>
          <p className="text-zinc-400">Agent 2 extracts signatures and chunks code to fit LLM context windows perfectly.</p>
        </div>
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 transition">
          <div className="text-4xl mb-4">✍️</div>
          <h3 className="text-xl font-bold mb-2 text-white">Generative Magic</h3>
          <p className="text-zinc-400">Agent 3 uses Llama 3 70B via Groq to write beautiful, accurate documentation.</p>
        </div>
      </div>
    </div>
  );
}
