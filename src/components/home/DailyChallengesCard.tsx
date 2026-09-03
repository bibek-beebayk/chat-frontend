'use client';

import Link from 'next/link';
import { DailyProgressItem } from '@/types';
import { displayLabelForDailyProgressItem } from '@/lib/xp';
import { SkeletonText } from '@/components/ui/Skeleton';
import styles from './DailyChallengesCard.module.css';

interface DailyChallengesCardProps {
    items: DailyProgressItem[] | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    /** Caps visible rows on the homepage preview - the full list lives at /challenges. */
    limit?: number;
    /**
     * `preview` (default) is the homepage widget: a bordered panel with its
     * own title and a View All link. `page` is /challenges itself, where the
     * PageShell heading already says "Daily Challenges" and links back to
     * nothing - so the panel chrome and header are dropped and the tiles
     * fill the content column instead of sitting in a narrow block.
     */
    layout?: 'preview' | 'page';
}

// The one actionable checklist item ("play N rounds") routes to where that
// progress is actually made; anything else (e.g. daily_login, already
// completed just by being logged in) isn't a link target.
const ACTION_HREF: Record<string, string> = {
    daily_challenge_rounds: '/games/plinko',
};

// Cycled by index (not slug-semantic) purely to give each tile in the
// horizontal row a distinct color/glyph, matching the reference design's
// varied icon badges - there's no meaning tied to a particular color.
const TILE_STYLES: { icon: string; className: string }[] = [
    { icon: '♠', className: 'tileViolet' },
    { icon: '♥', className: 'tileGreen' },
    { icon: '♦', className: 'tileGold' },
];

export function DailyChallengesCard({ items, loading, error, onRetry, limit, layout = 'preview' }: DailyChallengesCardProps) {
    const visible = limit && items ? items.slice(0, limit) : items;
    const isPage = layout === 'page';

    return (
        <div className={`${styles.card} ${isPage ? styles.cardBare : ''}`}>
            {!isPage && (
                <div className={styles.header}>
                    <h3>Daily Challenges</h3>
                    <Link href="/challenges" className={styles.headerLink}>View All</Link>
                </div>
            )}

            {loading && !items ? (
                <div className={`${styles.track} ${isPage ? styles.trackFill : ''}`}>
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
                <div className={`${styles.track} ${isPage ? styles.trackFill : ''}`}>
                    {visible.map((item, index) => {
                        const percent = item.target_count > 0 ? Math.min(100, Math.round((item.current_count / item.target_count) * 100)) : (item.completed ? 100 : 0);
                        const href = ACTION_HREF[item.slug];
                        const tileStyle = TILE_STYLES[index % TILE_STYLES.length];
                        const tile = (
                            <div className={styles.tileContent}>
                                <span className={`${styles.tileIcon} ${styles[tileStyle.className]}`} aria-hidden="true">{tileStyle.icon}</span>
                                <span className={styles.label}>{displayLabelForDailyProgressItem(item)}</span>
                                {item.completed ? (
                                    <span className={styles.completedTag}>✓ Completed</span>
                                ) : (
                                    <span className={styles.xpTag}>+{item.xp_value} XP</span>
                                )}
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
                            <Link key={item.slug} href={href} className={styles.tile}>{tile}</Link>
                        ) : (
                            <div key={item.slug} className={styles.tile}>{tile}</div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
