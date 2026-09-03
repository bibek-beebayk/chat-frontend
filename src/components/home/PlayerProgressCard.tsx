'use client';

import { useXpStatus } from '@/hooks/useXpStatus';
import { RankBadge } from './RankBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './PlayerProgressCard.module.css';

export function PlayerProgressCard() {
    const { data, loading, error, refetch } = useXpStatus();

    if (loading && !data) {
        return (
            <div className={styles.card}>
                <div className={styles.headerRow}>
                    <Skeleton width={44} height={44} borderRadius="50%" />
                    <Skeleton width="40%" height="1.1rem" />
                </div>
                <Skeleton height="0.8rem" />
                <Skeleton height="10px" borderRadius="999px" />
                <Skeleton width="60%" height="0.8rem" />
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className={styles.card}>
                <p className={styles.errorText}>Unable to load your rank.</p>
                <button type="button" className={styles.retryBtn} onClick={refetch}>Retry</button>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className={styles.card}>
            <div className={styles.headerRow}>
                <RankBadge rank={data.rank} size="md" badgeUrl={data.rank_badge_url} />
                <div>
                    <p className={styles.rankLabel}>{data.rank_label}</p>
                    <p className={styles.xpLine}>
                        {data.total_xp.toLocaleString()}
                        {data.next_rank_xp != null && ` / ${data.next_rank_xp.toLocaleString()} XP`}
                        {data.next_rank_xp == null && ' XP'}
                    </p>
                </div>
            </div>
            <div
                className={styles.progressTrack}
                role="progressbar"
                aria-valuenow={data.rank_progress_percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress toward ${data.next_rank ? data.next_rank : 'max rank'}`}
            >
                <div className={styles.progressFill} style={{ width: `${data.rank_progress_percent}%` }} />
            </div>
            <p className={styles.footerText}>
                {data.next_rank
                    ? `${data.xp_to_next_rank.toLocaleString()} XP to reach ${capitalize(data.next_rank)}`
                    : 'Top rank reached'}
            </p>
        </div>
    );
}

function capitalize(slug: string): string {
    return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
