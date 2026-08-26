'use client';

import { markShownToday } from '@/lib/dailyPopups';
import styles from './Celebrations.module.css';

interface DailyLoginModalProps {
    xpValue: number;
    onDismissed: () => void;
}

/**
 * Shows the REAL daily-login reward (XP, auto-granted, no claim step) - the
 * mockup this was based on showed a fake "25 RP / Claim" flow that doesn't
 * exist in the backend (see xp/views.py DAILY_CHECKLIST_SLUGS and
 * accounts/services.py::grant_daily_login_rewards, which only ever grants
 * XP). "Nice!" instead of "Claim" since there's nothing left to claim.
 */
export function DailyLoginModal({ xpValue, onDismissed }: DailyLoginModalProps) {
    const handleDismiss = () => {
        markShownToday('daily_login');
        onDismissed();
    };

    return (
        <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Daily login reward">
            <div className={styles.card}>
                <p className={styles.eyebrow}>Daily Login Reward</p>
                <div className={styles.iconCircle} aria-hidden="true">🎁</div>
                <p className={styles.body}>You got</p>
                <div className={styles.rewardPill}>
                    <span className={styles.rewardPillIcon} aria-hidden="true">⚡</span>
                    <span className={styles.rewardPillValue}>{xpValue} XP</span>
                </div>
                <p className={styles.body}>Come back tomorrow for more!</p>
                <button type="button" className={styles.primaryBtn} onClick={handleDismiss}>
                    Nice!
                </button>
            </div>
        </div>
    );
}
