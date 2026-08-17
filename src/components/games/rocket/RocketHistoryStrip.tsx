'use client';

import { RocketHistoryItem } from '@/types';
import styles from './RocketHistoryStrip.module.css';

interface RocketHistoryStripProps {
    items: RocketHistoryItem[];
    loading: boolean;
    /** Chips-only, no label/card chrome - meant to sit inside the gameplay stage itself. */
    compact?: boolean;
}

function tierClass(multiplier: number): string {
    if (multiplier >= 10) return styles.chipHot;
    if (multiplier >= 2) return styles.chipWarm;
    return styles.chipCold;
}

export function RocketHistoryStrip({ items, loading, compact }: RocketHistoryStripProps) {
    if (loading && items.length === 0) return null;
    if (compact && items.length === 0) return null;

    const chips = (
        <div className={`${styles.track} ${compact ? styles.trackCompact : ''}`}>
            {items.map((item) => {
                const multiplier = Number(item.result_multiplier ?? 0);
                return (
                    <span key={item.round_id} className={`${styles.chip} ${compact ? styles.chipCompact : ''} ${tierClass(multiplier)}`}>
                        {multiplier.toFixed(2)}x
                    </span>
                );
            })}
        </div>
    );

    if (compact) {
        return <div className={styles.compactWrap}>{chips}</div>;
    }

    return (
        <div className={styles.wrap}>
            <span className={styles.label}>Recent Rounds</span>
            {items.length === 0 ? <span className={styles.empty}>No rounds played yet.</span> : chips}
        </div>
    );
}
