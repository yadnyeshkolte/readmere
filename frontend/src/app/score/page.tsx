import Link from 'next/link';

const categories = [
    {
        name: 'Completeness',
        weight: 30,
        color: 'emerald',
        icon: '📋',
        description: 'Does the README have all essential sections?',
        criteria: [
            'Title and project description',
            'Installation / Getting Started guide',
            'Usage examples with code',
            'Features list',
            'Tech stack / Dependencies',
            'Contributing guidelines',
            'License information',
        ],
    },
    {
        name: 'Accuracy',
        weight: 25,
        color: 'cyan',
        icon: '🎯',
        description: 'Does the content match the actual codebase?',
        criteria: [
            'Code examples that actually work',
            'Correct tech stack identification',
            'Accurate installation commands',
            'Proper API documentation',
            'Real file paths and structure',
        ],
    },
    {
        name: 'Structure & Formatting',
        weight: 20,
        color: 'violet',
        icon: '🏗️',
        description: 'Is the markdown well-organized and properly formatted?',
        criteria: [
            'Logical section ordering',
            'Proper heading hierarchy (H1 → H2 → H3)',
            'Code blocks with language tags',
            'Consistent formatting throughout',
            'Tables for structured data',
        ],
    },
    {
        name: 'Readability',
        weight: 15,
        color: 'amber',
        icon: '👓',
        description: 'Is the writing clear and accessible?',
        criteria: [
            'Clear, concise language',
            'Good sentence flow',
            'Appropriate detail level',
            'No jargon without explanation',
            'Logical information progression',
        ],
    },
    {
        name: 'Visual Appeal',
        weight: 10,
        color: 'pink',
        icon: '✨',
        description: 'Does the README look professional and engaging?',
        criteria: [
            'Shields.io badges',
            'Emoji usage for section headers',
            'Screenshots or diagrams (if applicable)',
            'Syntax-highlighted code blocks',
            'Clean whitespace and spacing',
        ],
    },
];

export default function ScorePage() {
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-10 animate-fade-in-up">
            {/* Header */}
            <div className="mb-8 sm:mb-10">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors mb-6"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back to Home
                </Link>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
                    How We Score Your README
                </h1>
                <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-2xl">
                    Our AI quality checker evaluates your generated README across 5 weighted categories.
                    The overall score is a weighted average — here&apos;s exactly how it works.
                </p>
            </div>

            {/* Formula */}
            <div className="glass rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Scoring Formula</p>
                <div className="font-mono text-xs sm:text-sm text-emerald-400 bg-zinc-950 rounded-xl p-3 sm:p-4 overflow-x-auto">
                    <span className="text-zinc-500">overall =</span>{' '}
                    {categories.map((c, i) => (
                        <span key={c.name}>
                            <span className="text-white">{c.name.split(' ')[0].toLowerCase()}</span>
                            <span className="text-zinc-500"> × </span>
                            <span className="text-cyan-400">{c.weight / 100}</span>
                            {i < categories.length - 1 && <span className="text-zinc-600"> + </span>}
                        </span>
                    ))}
                </div>
            </div>

            {/* Categories */}
            <div className="space-y-4 sm:space-y-5">
                {categories.map((cat) => (
                    <div
                        key={cat.name}
                        className="glass rounded-2xl p-4 sm:p-6 hover:border-emerald-500/20 transition-all duration-300"
                    >
                        <div className="flex items-start gap-3 sm:gap-4">
                            <div className="text-2xl sm:text-3xl shrink-0">{cat.icon}</div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-lg font-bold text-white">{cat.name}</h2>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-950/50 border border-emerald-800/30 text-emerald-400">
                                        {cat.weight}% weight
                                    </span>
                                </div>
                                <p className="text-zinc-400 text-sm mb-3">{cat.description}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {cat.criteria.map((criterion) => (
                                        <div key={criterion} className="flex items-center gap-2 text-xs text-zinc-500">
                                            <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0"></span>
                                            {criterion}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Improve CTA */}
            <div className="mt-8 sm:mt-10 glass rounded-2xl p-4 sm:p-6 text-center">
                <p className="text-zinc-400 text-sm mb-3">
                    Not happy with your score? Hit the <span className="text-emerald-400 font-medium">✨ Improve Score</span> button
                    on the results page — our AI will enhance your README based on the specific suggestions.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-sm font-medium hover:from-emerald-500 hover:to-cyan-500 transition-all"
                >
                    Try README Resurrector
                    <span>🧟‍♂️</span>
                </Link>
            </div>
        </div>
    );
}
