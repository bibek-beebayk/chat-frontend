'use client';

import { SlotRound } from '@/types';
import styles from './SlotHistoryPanel.module.css';

interface SlotHistoryPanelProps {
    rounds: SlotRound[];
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}

export function SlotHistoryPanel({ rounds, loading, error, onRetry }: SlotHistoryPanelProps) {
    return (
        <div className={styles.panel}>
            <h3 className={styles.title}>Recent Spins</h3>
            {loading && rounds.length === 0 ? (
                <p className={styles.muted}>Loading...</p>
            ) : error && rounds.length === 0 ? (
                <div className={styles.errorState}>
                    <p className={styles.muted}>Unable to load history.</p>
                    <button type="button" className={styles.retryBtn} onClick={onRetry}>Retry</button>
                </div>
            ) : rounds.length === 0 ? (
                <p className={styles.muted}>Spin the reels to see your history here.</p>
            ) : (
                <ul className={styles.list}>
                    {rounds.slice(0, 10).map((round) => {
                        const multiplier = Number(round.total_multiplier);
                        const isWin = multiplier > 0;
                        return (
                            <li key={round.round_id} className={styles.row}>
                                <span className={styles.wager}>{round.wager.toLocaleString()} RP</span>
                                <span className={styles.arrow}>→</span>
                                <span className={`${styles.payout} ${isWin ? styles.payoutWin : ''}`}>
                                    {Number(round.payout).toLocaleString(undefined, { maximumFractionDigits: 2 })} RP
                                </span>
                                {isWin && <span className={styles.multiplier}>{multiplier.toFixed(2)}x</span>}
                                <span className={styles.time}>{formatTime(round.created_at)}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function formatTime(value: string): string {
    const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
