'use client';

import Link from 'next/link';
import { useXpStatus } from '@/hooks/useXpStatus';
import { usePointsBalance } from '@/hooks/usePointsBalance';
import { LoginStreakStatus } from '@/types';
import { RankBadge } from './RankBadge';
import { LoginStreakCard } from './LoginStreakCard';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './PlayerStatsBar.module.css';

interface PlayerStatsBarProps {
    streak: LoginStreakStatus | null;
    streakLoading: boolean;
    streakError: string | null;
    onRetryStreak: () => void;
    onStreakRedeemed: () => void;
}

/**
 * Mobile-first unified Rank / Login Streak / Reward Points card - the
 * merged 3-column layout the reference design calls for. Desktop/tablet
 * keep the original separate PlayerProgressCard + LoginStreakCard grid
 * areas (see PlayerHomePage.module.css) since that layout already has the
 * room for two full cards; this component only replaces them on narrow
 * mobile widths. The streak column reuses <LoginStreakCard embedded> so the
 * redeem-request modal stays the single real implementation instead of a
 * second copy.
 */
export function PlayerStatsBar({ streak, streakLoading, streakError, onRetryStreak, onStreakRedeemed }: PlayerStatsBarProps) {
    const { data: xp, loading: xpLoading, error: xpError } = useXpStatus();
    const balance = usePointsBalance();

    return (
        <div className={styles.card}>
            <div className={styles.headerRow}>
                <div className={styles.col}>
                    <div className={styles.iconSlot}>
                        {xpLoading && !xp ? (
                            <Skeleton width={26} height={26} borderRadius="50%" />
                        ) : xp ? (
                            <RankBadge rank={xp.rank} size="sm" badgeUrl={xp.rank_badge_url} />
                        ) : null}
                    </div>
                    <div className={styles.colBody}>
                        <span className={styles.colLabel}>{xp ? xp.rank_label : 'Rank'}</span>
                        <span className={styles.colValue}>
                            {xp ? `${xp.total_xp.toLocaleString()}${xp.next_rank_xp != null ? ` / ${xp.next_rank_xp.toLocaleString()}` : ''} XP` : xpError ? 'Unavailable' : '...'}
                        </span>
                    </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.col}>
                    <div className={styles.iconSlot}>
                        <span className={styles.emojiIcon} aria-hidden="true">🔥</span>
                    </div>
                    <div className={styles.colBody}>
                        <span className={styles.colLabel}>Login Streak</span>
                        <span className={styles.colValue}>
                            {streak ? `${streak.current_streak} ${streak.current_streak === 1 ? 'Day' : 'Days'}` : streakError ? 'Unavailable' : '...'}
                        </span>
                    </div>
                </div>

                <div className={styles.divider} />

                <div className={styles.col}>
                    <div className={styles.iconSlot}>
                        <StarIcon />
                    </div>
                    <div className={styles.colBody}>
                        <span className={styles.colLabel}>Reward Points</span>
                        <span className={styles.colValue}>{balance.toLocaleString()} RP</span>
                    </div>
                </div>
            </div>

            {xp && (
                <div className={styles.detailBlock}>
                    <div
                        className={styles.progressTrack}
                        role="progressbar"
                        aria-valuenow={xp.rank_progress_percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progress toward ${xp.next_rank ? xp.next_rank : 'max rank'}`}
                    >
                        <div className={styles.progressFill} style={{ width: `${xp.rank_progress_percent}%` }} />
                    </div>
                    <span className={styles.detailCaption}>
                        {xp.next_rank ? `${xp.xp_to_next_rank.toLocaleString()} XP to reach ${capitalize(xp.next_rank)}` : 'Top rank reached'}
                    </span>
                </div>
            )}

            {streak && (
                <div className={styles.detailBlock}>
                    <LoginStreakCard
                        streak={streak}
                        loading={streakLoading}
                        error={streakError}
                        onRetry={onRetryStreak}
                        onRedeemed={onStreakRedeemed}
                        embedded
                    />
                </div>
            )}

            <Link href="/rewards" className={styles.rewardsLink}>Use RP for rewards →</Link>
        </div>
    );
}

function capitalize(slug: string): string {
    return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function StarIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.starIcon}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
    );
}
