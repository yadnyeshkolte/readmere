import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full p-6 flex justify-between items-center border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
      <Link href="/" className="text-2xl font-bold flex items-center gap-2 hover:opacity-80 transition">
        <span className="text-3xl">🧟‍♂️</span>
        <span className="bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
          README Resurrector
        </span>
      </Link>
      <div className="flex gap-4">
        <a 
            href="https://github.com/archestra-ai/archestra" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-emerald-400 transition"
        >
            Built on Archestra
        </a>
      </div>
    </header>
  );
}
