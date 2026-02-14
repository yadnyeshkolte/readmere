export default function Footer() {
  return (
    <footer className="w-full px-6 py-8 text-center border-t border-zinc-800/50 bg-zinc-950/50">
      <p className="text-zinc-500 text-sm">
        Built for the <span className="text-white font-medium">2 Fast 2 MCP</span> Hackathon
      </p>
      <p className="mt-2 text-zinc-600 text-xs flex items-center justify-center gap-3">
        <span>Powered by <span className="text-emerald-500/80">Gemini 2.5 Flash</span></span>
        <span className="text-zinc-700">·</span>
        <span>Orchestrated by <span className="text-cyan-500/80">Archestra MCP</span></span>
        <span className="text-zinc-700">·</span>
        <span>Deployed on <span className="text-yellow-500/80">Hugging Face</span></span>
      </p>
    </footer>
  );
}
