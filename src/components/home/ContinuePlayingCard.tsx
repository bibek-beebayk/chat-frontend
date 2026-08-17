'use client';

import Link from 'next/link';
import { PlinkoRound } from '@/types';
import { SkeletonText } from '@/components/ui/Skeleton';
import styles from './ContinuePlayingCard.module.css';

interface ContinuePlayingCardProps {
    rounds: PlinkoRound[] | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}

const MODE_LABEL: Record<string, string> = {
    classic: 'Plinko',
    free_drop: 'Plinko: Free Drop',
};

/**
 * Plinko is the only functionally seeded/playable game today (the generic
 * multi-game list has exactly one real row) - this derives "recently
 * played" from real round history, grouped by mode, rather than inventing
 * other games.
 */
export function ContinuePlayingCard({ rounds, loading, error, onRetry }: ContinuePlayingCardProps) {
    const entries = rounds ? mostRecentPerMode(rounds) : [];

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3>Continue Playing</h3>
            </div>

            {loading && !rounds ? (
                <div className={styles.track}><SkeletonText lines={3} /></div>
            ) : error && !rounds ? (
                <div className={styles.emptyState}>
                    <p>Unable to load recent games.</p>
                    <button type="button" className={styles.retryBtn} onClick={onRetry}>Retry</button>
                </div>
            ) : entries.length === 0 ? (
                <div className={styles.emptyState}>
                    Start playing to see your recent games here.
                    <Link href="/games" className={styles.exploreLink}>Explore games</Link>
                </div>
            ) : (
                <div className={styles.track}>
                    {entries.map((entry) => (
                        <div key={entry.mode} className={styles.tile}>
                            <div className={styles.thumb} aria-hidden="true">🎰</div>
                            <span className={styles.label}>{MODE_LABEL[entry.mode] || entry.mode}</span>
                            <span className={styles.status}>Last played {formatRelativeTime(entry.created_at)}</span>
                            <Link href="/games/plinko" className={styles.playBtn}>Play</Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function mostRecentPerMode(rounds: PlinkoRound[]): PlinkoRound[] {
    const byMode = new Map<string, PlinkoRound>();
    for (const round of rounds) {
        const existing = byMode.get(round.mode);
        if (!existing || new Date(round.created_at) > new Date(existing.created_at)) {
            byMode.set(round.mode, round);
        }
    }
    return Array.from(byMode.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function formatRelativeTime(value: string): string {
    const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
