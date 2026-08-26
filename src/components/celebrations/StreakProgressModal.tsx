'use client';

import Link from 'next/link';
import { markShownToday } from '@/lib/dailyPopups';
import { LoginStreakStatus } from '@/types';
import styles from './Celebrations.module.css';

interface StreakProgressModalProps {
    streak: LoginStreakStatus;
    onDismissed: () => void;
}

/**
 * Real login-streak nudge, shown while the streak is in progress (the
 * "reward available/claimed" state is already owned by LoginStreakCard,
 * this is just the daily encouragement). The reward is a real dollar
 * credit (StreakRedemptionRequest), NOT RP - the mockup this was based on
 * mislabeled it as RP, same mistake already caught once on the Rewards page.
 */
export function StreakProgressModal({ streak, onDismissed }: StreakProgressModalProps) {
    const handleDismiss = () => {
        markShownToday('streak_progress');
        onDismissed();
    };

    const rewardLabel = `$${Number(streak.reward_amount).toFixed(2)} credit`;

    return (
        <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Login streak progress">
            <div className={styles.card}>
                <p className={styles.eyebrow}>{streak.target_days}-Day Streak</p>
                <div className={styles.pipRow}>
                    {Array.from({ length: streak.target_days }).map((_, i) => {
                        const day = i + 1;
                        const done = day <= streak.current_streak;
                        const isTarget = day === streak.target_days;
                        return (
                            <span
                                key={day}
                                className={`${styles.pip} ${done ? styles.pipDone : ''} ${!done && isTarget ? styles.pipTarget : ''}`}
                            >
                                {done ? '✓' : isTarget ? '🎁' : day}
                            </span>
                        );
                    })}
                </div>
                <p className={styles.body}>
                    You&apos;re on fire! 🔥 {streak.target_days - streak.current_streak} more day{streak.target_days - streak.current_streak === 1 ? '' : 's'} to get {rewardLabel}
                </p>
                <Link href="/rewards" className={styles.primaryBtn} onClick={handleDismiss}>
                    View Streak Rewards
                </Link>
            </div>
        </div>
    );
}
