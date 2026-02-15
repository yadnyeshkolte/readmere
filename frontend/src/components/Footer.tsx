export default function Footer() {
  return (
    <footer className="w-full px-6 py-8 text-center border-t border-zinc-800/50 bg-zinc-950/50">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-zinc-600 mb-3">
          <span>🧠 Gemini 2.5 Flash</span>
          <span className="text-zinc-800">·</span>
          <span>🔌 Model Context Protocol</span>
          <span className="text-zinc-800">·</span>
          <span>🎭 Archestra Orchestration</span>
          <span className="text-zinc-800">·</span>
          <span>⚛️ Next.js 14</span>
          <span className="text-zinc-800">·</span>
          <span>🐳 Docker</span>
          <span className="text-zinc-800">·</span>
          <span>🤗 HF Spaces</span>
        </div>
        <p className="mt-1.5 text-zinc-700 text-[10px]">
          README Resurrector &copy; 2026 &mdash; Yadnyesh Kolte
        </p>
      </div>
    </footer>
  );
}
