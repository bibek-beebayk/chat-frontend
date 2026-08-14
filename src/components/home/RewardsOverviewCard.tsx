'use client';

import Link from 'next/link';
import { usePointsBalance } from '@/hooks/usePointsBalance';
import { LoginStreakStatus } from '@/types';
import { formatPoints } from '@/lib/points';
import { SkeletonText } from '@/components/ui/Skeleton';
import styles from './RewardsOverviewCard.module.css';

interface RewardsOverviewCardProps {
    streak: LoginStreakStatus | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}

/**
 * Only the two reward flows that genuinely exist today: the login-streak
 * reward (real backend state) and Reward Points redemption (real backend
 * state via usePointsBalance). No Daily Reward / Scratch Card / Weekly
 * Reward rows - no backend concept of a daily-claimable or weekly-claimable
 * reward exists, and shipping placeholder rows for them would be exactly
 * the "fake claimable reward" the design brief explicitly disallows.
 */
export function RewardsOverviewCard({ streak, loading, error, onRetry }: RewardsOverviewCardProps) {
    const balance = usePointsBalance();

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3>Rewards Center</h3>
                <Link href="/rewards" className={styles.headerLink}>View All</Link>
            </div>

            <div className={styles.rows}>
                <div className={styles.row}>
                    <div className={styles.rowIcon}>🪙</div>
                    <div className={styles.rowBody}>
                        <span className={styles.label}>Reward Points</span>
                        <span className={styles.status}>{formatPoints(balance)} RP available</span>
                    </div>
                    <Link href="/rewards" className={styles.cta}>Redeem</Link>
                </div>

                {loading && !streak ? (
                    <div className={styles.row}><SkeletonText lines={2} /></div>
                ) : error && !streak ? (
                    <div className={styles.row}>
                        <div className={styles.rowBody}>
                            <span className={styles.label}>Streak Reward</span>
                            <span className={styles.status}>Unable to load.</span>
                        </div>
                        <button type="button" className={styles.ctaBtn} onClick={onRetry}>Retry</button>
                    </div>
                ) : streak ? (
                    <div className={styles.row}>
                        <div className={styles.rowIcon}>🔥</div>
                        <div className={styles.rowBody}>
                            <span className={styles.label}>Streak Reward</span>
                            <span className={styles.status}>
                                {streak.reward_available
                                    ? `$${Number(streak.receivable_bonus).toFixed(2)} ready`
                                    : streak.active_redemption_request
                                        ? (streak.active_redemption_request.status_label || streak.active_redemption_request.status)
                                        : `Day ${streak.current_streak}/${streak.target_days}`}
                            </span>
                        </div>
                        <span className={streak.reward_available ? styles.readyTag : styles.locked}>
                            {streak.active_redemption_request ? 'Pending' : streak.reward_available ? 'Ready' : 'Locked'}
                        </span>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
