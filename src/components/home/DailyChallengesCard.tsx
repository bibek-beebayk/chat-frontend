'use client';

import Link from 'next/link';
import { DailyProgressItem } from '@/types';
import { SkeletonText } from '@/components/ui/Skeleton';
import styles from './DailyChallengesCard.module.css';

interface DailyChallengesCardProps {
    items: DailyProgressItem[] | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    /** Caps visible rows on the homepage preview - the full list lives at /challenges. */
    limit?: number;
    /** Hides the self-referential "View All" link when this card is rendered on /challenges itself. */
    hideViewAll?: boolean;
}

// The one actionable checklist item ("play N rounds") routes to where that
// progress is actually made; anything else (e.g. daily_login, already
// completed just by being logged in) isn't a link target.
const ACTION_HREF: Record<string, string> = {
    daily_challenge_rounds: '/games/plinko',
};

export function DailyChallengesCard({ items, loading, error, onRetry, limit, hideViewAll }: DailyChallengesCardProps) {
    const visible = limit && items ? items.slice(0, limit) : items;

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h3>Daily Challenges</h3>
                {!hideViewAll && <Link href="/challenges" className={styles.headerLink}>View All</Link>}
            </div>

            {loading && !items ? (
                <div className={styles.rows}>
                    <SkeletonText lines={2} />
                    <SkeletonText lines={2} />
                </div>
            ) : error && !items ? (
                <div className={styles.emptyState}>
                    <p>Unable to load challenges.</p>
                    <button type="button" className={styles.retryBtn} onClick={onRetry}>Retry</button>
                </div>
            ) : !visible || visible.length === 0 ? (
                <div className={styles.emptyState}>No challenges configured right now.</div>
            ) : (
                <div className={styles.rows}>
                    {visible.map((item) => {
                        const percent = item.target_count > 0 ? Math.min(100, Math.round((item.current_count / item.target_count) * 100)) : (item.completed ? 100 : 0);
                        const href = ACTION_HREF[item.slug];
                        const row = (
                            <div className={styles.rowContent}>
                                <div className={styles.rowTop}>
                                    <span className={styles.label}>{item.label}</span>
                                    {item.completed ? (
                                        <span className={styles.completedTag}>✓ Completed</span>
                                    ) : (
                                        <span className={styles.xpTag}>+{item.xp_value} XP</span>
                                    )}
                                </div>
                                {!item.completed && item.target_count > 1 && (
                                    <>
                                        <div className={styles.progressTrack}>
                                            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                                        </div>
                                        <span className={styles.progressLabel}>{item.current_count} / {item.target_count}</span>
                                    </>
                                )}
                            </div>
                        );
                        return href && !item.completed ? (
                            <Link key={item.slug} href={href} className={styles.row}>{row}</Link>
                        ) : (
                            <div key={item.slug} className={styles.row}>{row}</div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
