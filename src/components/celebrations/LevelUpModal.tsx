'use client';

import { useState } from 'react';
import { RankBadge } from '@/components/home/RankBadge';
import { emitPointsUpdated } from '@/hooks/usePointsBalance';
import { emitXpUpdated } from '@/hooks/useXpStatus';
import { xpApi } from '@/lib/xp';
import { PendingLevelUp } from '@/types';
import styles from './Celebrations.module.css';

interface LevelUpModalProps {
    pendingLevelUp: PendingLevelUp;
    onDismissed: () => void;
}

/**
 * Real rank-up celebration - pendingLevelUp comes from XpStatus.pending_level_up
 * (xp/services.py sets it the instant a rank-up happens; the bonus_rp shown
 * here is the same amount xp/services.py._apply_rank_up_bonus already
 * credited for real, not a made-up number).
 */
export function LevelUpModal({ pendingLevelUp, onDismissed }: LevelUpModalProps) {
    const [dismissing, setDismissing] = useState(false);

    const handleDismiss = async () => {
        if (dismissing) return;
        setDismissing(true);
        try {
            await xpApi.acknowledgeLevelUp();
        } catch {
            // Even if the ack call fails, don't trap the player behind the
            // modal - it'll just show again on the next status poll.
        } finally {
            emitXpUpdated();
            emitPointsUpdated();
            onDismissed();
        }
    };

    return (
        <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Level up">
            <div className={styles.card}>
                <p className={styles.eyebrow}>Level Up!</p>
                <div className={styles.iconCircle}>
                    <RankBadge rank={pendingLevelUp.rank} size="lg" />
                </div>
                <p className={styles.subtitle}>You reached {pendingLevelUp.rank_label}</p>
                <p className={styles.body}>Keep going, more rewards await at the next rank!</p>
                {pendingLevelUp.bonus_rp != null && (
                    <div className={styles.rewardPill}>
                        <span className={styles.rewardPillIcon} aria-hidden="true">⭐</span>
                        <span className={styles.rewardPillValue}>+{pendingLevelUp.bonus_rp.toLocaleString()} RP</span>
                    </div>
                )}
                <button type="button" className={styles.primaryBtn} onClick={handleDismiss} disabled={dismissing}>
                    Awesome!
                </button>
            </div>
        </div>
    );
}
