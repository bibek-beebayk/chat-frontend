'use client';

import { resolveProfileImageUrl } from '@/lib/social';
import { ActivityEvent } from '@/types';
import styles from './RecentActivityCard.module.css';

interface RecentActivityCardProps {
    activity: ActivityEvent[] | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    limit?: number;
}

// Lowest-priority dashboard section per the design brief - no "View All"
// link since there's no dedicated /activity page today.
export function RecentActivityCard({ activity, loading, error, onRetry, limit }: RecentActivityCardProps) {
    const visible = limit && activity ? activity.slice(0, limit) : activity;

    return (
        <div className={styles.widget}>
            <div className={styles.widgetHeader}>
                <h3>Recent Activity</h3>
            </div>
            {loading && !activity ? (
                <div className={styles.emptyState}>Loading activity...</div>
            ) : error && !activity ? (
                <div className={styles.emptyState}>
                    Unable to load activity.
                    <button type="button" className={styles.retryBtn} onClick={onRetry}>Retry</button>
                </div>
            ) : !visible || visible.length === 0 ? (
                <div className={styles.emptyState}>No recent activity yet.</div>
            ) : (
                <div className={styles.activityList}>
                    {visible.map((item) => {
                        const avatarUrl = resolveProfileImageUrl(item.actor);
                        const actorName = item.actor?.username || 'Community';
                        return (
                            <div key={item.id} className={styles.activityItem}>
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={`${actorName} profile`} className={styles.activityAvatar} />
                                ) : (
                                    <div className={styles.activityAvatarFallback}>{getInitials(actorName)}</div>
                                )}
                                <div className={styles.activityInfo}>
                                    <p><strong>{actorName}</strong> {item.action}</p>
                                    <span className={styles.activityTime}>{formatRelativeTime(item.created_at)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function getInitials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formatRelativeTime(value: string): string {
    const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
