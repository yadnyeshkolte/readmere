import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full px-6 py-4 flex justify-between items-center glass sticky top-0 z-50">
      <Link href="/" className="text-xl font-bold flex items-center gap-2.5 hover:opacity-80 transition group">
        <span className="text-2xl group-hover:animate-float">🧟‍♂️</span>
        <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-500 bg-clip-text text-transparent">
          README Resurrector
        </span>
      </Link>
      <div className="flex items-center gap-5">
        <a
          href="https://github.com/yadnyeshkolte/readmere"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-500 hover:text-white transition text-sm"
        >
          GitHub
        </a>
        <a
          href="https://yadnyeshkolte-archestra-platform.hf.space"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-800/40 text-emerald-400 text-xs font-medium hover:bg-emerald-900/50 transition"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Archestra Platform
        </a>
      </div>
    </header>
  );
}
