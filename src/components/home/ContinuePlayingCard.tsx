'use client';

import Link from 'next/link';
import { PlinkoRound, SlotRound } from '@/types';
import { SkeletonText } from '@/components/ui/Skeleton';
import styles from './ContinuePlayingCard.module.css';

interface ContinuePlayingCardProps {
    plinkoRounds: PlinkoRound[] | null;
    slotsRounds: SlotRound[] | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}

const MODE_LABEL: Record<string, string> = {
    classic: 'Plinko',
    free_drop: 'Plinko: Free Drop',
};

interface Entry {
    key: string;
    label: string;
    href: string;
    createdAt: string;
}

/**
 * Derives "recently played" from real round history across every playable
 * game (Plinko's two modes + Slots), not just Plinko - this used to be
 * Plinko-only back when it was the sole playable game, but Slots (Rollin
 * 3x3) shipped later and this card was never updated to include it.
 */
export function ContinuePlayingCard({ plinkoRounds, slotsRounds, loading, error, onRetry }: ContinuePlayingCardProps) {
    const hasAnyData = plinkoRounds !== null || slotsRounds !== null;
    const entries = buildEntries(plinkoRounds, slotsRounds);

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3>Continue Playing</h3>
            </div>

            {loading && !hasAnyData ? (
                <div className={styles.track}><SkeletonText lines={3} /></div>
            ) : error && !hasAnyData ? (
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
                        <div key={entry.key} className={styles.tile}>
                            <div className={styles.thumb} aria-hidden="true">🎰</div>
                            <span className={styles.label}>{entry.label}</span>
                            <span className={styles.status}>Last played {formatRelativeTime(entry.createdAt)}</span>
                            <Link href={entry.href} className={styles.playBtn}>Play</Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function buildEntries(plinkoRounds: PlinkoRound[] | null, slotsRounds: SlotRound[] | null): Entry[] {
    const entries: Entry[] = [];

    if (plinkoRounds) {
        const byMode = new Map<string, PlinkoRound>();
        for (const round of plinkoRounds) {
            const existing = byMode.get(round.mode);
            if (!existing || new Date(round.created_at) > new Date(existing.created_at)) {
                byMode.set(round.mode, round);
            }
        }
        for (const round of byMode.values()) {
            entries.push({
                key: `plinko-${round.mode}`,
                label: MODE_LABEL[round.mode] || round.mode,
                href: '/games/plinko',
                createdAt: round.created_at,
            });
        }
    }

    if (slotsRounds && slotsRounds.length > 0) {
        const latest = slotsRounds.reduce((a, b) => (new Date(b.created_at) > new Date(a.created_at) ? b : a));
        entries.push({ key: 'slots', label: 'Rollin 3x3', href: '/games/slots', createdAt: latest.created_at });
    }

    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
