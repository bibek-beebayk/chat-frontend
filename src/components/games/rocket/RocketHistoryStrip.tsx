'use client';

import { RocketHistoryItem } from '@/types';
import styles from './RocketHistoryStrip.module.css';

interface RocketHistoryStripProps {
    items: RocketHistoryItem[];
    loading: boolean;
}

function tierClass(multiplier: number): string {
    if (multiplier >= 10) return styles.chipHot;
    if (multiplier >= 2) return styles.chipWarm;
    return styles.chipCold;
}

export function RocketHistoryStrip({ items, loading }: RocketHistoryStripProps) {
    if (loading && items.length === 0) return null;

    return (
        <div className={styles.wrap}>
            <span className={styles.label}>Recent Rounds</span>
            {items.length === 0 ? (
                <span className={styles.empty}>No rounds played yet.</span>
            ) : (
                <div className={styles.track}>
                    {items.map((item) => {
                        const multiplier = Number(item.result_multiplier ?? 0);
                        return (
                            <span key={item.round_id} className={`${styles.chip} ${tierClass(multiplier)}`}>
                                {multiplier.toFixed(2)}x
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
