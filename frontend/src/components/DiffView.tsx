'use client';

import React from 'react';

interface DiffLine {
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    lineNum: number;
}

interface DiffViewProps {
    oldText: string;
    newText: string;
    oldLabel?: string;
    newLabel?: string;
}

/**
 * Simple line-diff algorithm using LCS (Longest Common Subsequence).
 * Produces a unified diff view with green (added) / red (removed) / gray (unchanged) lines.
 */
function computeDiff(oldText: string, newText: string): DiffLine[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const m = oldLines.length;
    const n = newLines.length;

    // Build LCS table
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (oldLines[i - 1] === newLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to produce diff
    const result: DiffLine[] = [];
    let i = m, j = n;
    const temp: DiffLine[] = [];

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            temp.push({ type: 'unchanged', content: oldLines[i - 1], lineNum: j });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            temp.push({ type: 'added', content: newLines[j - 1], lineNum: j });
            j--;
        } else if (i > 0) {
            temp.push({ type: 'removed', content: oldLines[i - 1], lineNum: i });
            i--;
        }
    }

    temp.reverse();
    return temp;
}

export default function DiffView({ oldText, newText, oldLabel = 'Original', newLabel = 'Generated' }: DiffViewProps) {
    const diff = computeDiff(oldText, newText);

    const addedCount = diff.filter(l => l.type === 'added').length;
    const removedCount = diff.filter(l => l.type === 'removed').length;

    return (
        <div className="diff-container">
            {/* Header */}
            <div className="diff-header">
                <div className="diff-header-labels">
                    <span className="diff-label-old">{oldLabel}</span>
                    <span className="diff-arrow">→</span>
                    <span className="diff-label-new">{newLabel}</span>
                </div>
                <div className="diff-stats">
                    {addedCount > 0 && <span className="diff-stat-added">+{addedCount}</span>}
                    {removedCount > 0 && <span className="diff-stat-removed">-{removedCount}</span>}
                </div>
            </div>

            {/* Diff lines */}
            <div className="diff-body">
                {diff.map((line, idx) => (
                    <div
                        key={idx}
                        className={`diff-line diff-line-${line.type}`}
                    >
                        <span className="diff-line-prefix">
                            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                        </span>
                        <span className="diff-line-content">{line.content || ' '}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
