'use client';

import Link from 'next/link';
import { DailyProgressItem } from '@/types';
import styles from './TodaysMissionBanner.module.css';

interface TodaysMissionBannerProps {
    items: DailyProgressItem[] | null;
}

/**
 * Highlights the single most relevant checklist item (first incomplete one,
 * falling back to the first item) as a big banner above the full
 * DailyChallengesCard list below it - same source data (dailyProgress),
 * just promoted to its own call-to-action per the reference design. Renders
 * nothing while data hasn't loaded or the checklist is empty, rather than a
 * skeleton, since DailyChallengesCard right below already carries the
 * loading/error/empty states for this same data.
 */
export function TodaysMissionBanner({ items }: TodaysMissionBannerProps) {
    if (!items || items.length === 0) return null;

    const featured = items.find((item) => !item.completed) || items[0];
    const percent = featured.target_count > 0
        ? Math.min(100, Math.round((featured.current_count / featured.target_count) * 100))
        : (featured.completed ? 100 : 0);
    const href = featured.action_url;
    const label = featured.label;

    const content = (
        <>
            <span className={styles.icon} aria-hidden="true">🎯</span>
            <div className={styles.body}>
                <span className={styles.eyebrow}>Today&apos;s Mission</span>
                <span className={styles.title}>{label}</span>
                {!featured.completed && featured.target_count > 1 && (
                    <>
                        <div className={styles.progressTrack}>
                            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                        </div>
                        <span className={styles.progressLabel}>{featured.current_count} / {featured.target_count}</span>
                    </>
                )}
            </div>
            <div className={styles.right}>
                <span className={featured.completed ? styles.completedTag : styles.xpTag}>
                    {featured.completed ? '✓ Done' : `+${featured.xp_value} XP`}
                </span>
                {!featured.completed && <span className={styles.chevron} aria-hidden="true">›</span>}
            </div>
        </>
    );

    return href && !featured.completed ? (
        <Link href={href} className={styles.banner}>{content}</Link>
    ) : (
        <div className={styles.banner}>{content}</div>
    );
}
