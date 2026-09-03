'use client';

import Link from 'next/link';
import { DailyProgressItem } from '@/types';
import { challengePeriodLabel } from '@/lib/xp';
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
     * own title and a View All link. `page` is a single, headerless grid
     * (the page's own heading already names it). `section` is one of
     * several period-grouped blocks stacked on the same page (Daily /
     * Weekly / Special on /challenges) - same borderless, full-width tile
     * grid as `page`, but with its own `title` and no "View All" link,
     * since linking back to the page it's already on makes no sense.
     */
    layout?: 'preview' | 'page' | 'section';
    /** section layout only - the heading text, e.g. "Weekly Challenges". */
    title?: string;
    /** Overrides the generic "No challenges configured" empty-state copy. */
    emptyMessage?: string;
}

// Cycled by index (not slug-semantic) purely to give each tile in the
// horizontal row a distinct background color, matching the reference
// design's varied icon badges - there's no meaning tied to a particular
// color. The glyph itself comes from XPAction.icon (admin-set) when
// present; these are only the fallback for a challenge with no icon set.
const TILE_STYLES: { fallbackIcon: string; className: string }[] = [
    { fallbackIcon: '♠', className: 'tileViolet' },
    { fallbackIcon: '♥', className: 'tileGreen' },
    { fallbackIcon: '♦', className: 'tileGold' },
];

export function DailyChallengesCard({
    items, loading, error, onRetry, limit, layout = 'preview', title, emptyMessage,
}: DailyChallengesCardProps) {
    const visible = limit && items ? items.slice(0, limit) : items;
    const isBare = layout === 'page' || layout === 'section';

    return (
        <div className={`${styles.card} ${isBare ? styles.cardBare : ''}`}>
            {layout === 'preview' && (
                <div className={styles.header}>
                    <h3>Daily Challenges</h3>
                    <Link href="/challenges" className={styles.headerLink}>View All</Link>
                </div>
            )}
            {layout === 'section' && (
                <div className={styles.sectionHeader}>
                    <h2>{title}</h2>
                </div>
            )}

            {loading && !items ? (
                <div className={`${styles.track} ${isBare ? styles.trackFill : ''}`}>
                    <SkeletonText lines={2} />
                    <SkeletonText lines={2} />
                </div>
            ) : error && !items ? (
                <div className={styles.emptyState}>
                    <p>Unable to load challenges.</p>
                    <button type="button" className={styles.retryBtn} onClick={onRetry}>Retry</button>
                </div>
            ) : !visible || visible.length === 0 ? (
                <div className={styles.emptyState}>{emptyMessage || 'No challenges configured right now.'}</div>
            ) : (
                <div className={`${styles.track} ${isBare ? styles.trackFill : ''}`}>
                    {visible.map((item, index) => {
                        const percent = item.target_count > 0 ? Math.min(100, Math.round((item.current_count / item.target_count) * 100)) : (item.completed ? 100 : 0);
                        const href = item.action_url;
                        const tileStyle = TILE_STYLES[index % TILE_STYLES.length];
                        const tile = (
                            <div className={styles.tileContent}>
                                <div className={styles.tileTop}>
                                    <span className={`${styles.tileIcon} ${styles[tileStyle.className]}`} aria-hidden="true">{item.icon || tileStyle.fallbackIcon}</span>
                                    {/* Daily is the common case and needs no badge - only the
                                        less obvious periods (weekly, event) get called out, so
                                        the everyday tile looks exactly as it always has. */}
                                    {item.challenge_period !== 'daily' && (
                                        <span className={`${styles.periodPill} ${item.challenge_period === 'event' ? styles.periodPillEvent : ''}`}>
                                            {challengePeriodLabel(item.challenge_period)}
                                        </span>
                                    )}
                                </div>
                                <span className={styles.label}>{item.label}</span>
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
