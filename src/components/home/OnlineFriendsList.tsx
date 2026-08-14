'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { resolveProfileImageUrl } from '@/lib/social';
import { ConnectionWithPresence, UserWithPresence } from '@/types';
import styles from './OnlineFriendsList.module.css';

interface OnlineFriendsListProps {
    connections: ConnectionWithPresence[] | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}

const STATUS_LABEL: Record<string, string> = {
    ONLINE: 'Online',
    IDLE: 'Away',
    OFFLINE: 'Offline',
    DISCONNECTED: 'Offline',
};

export function OnlineFriendsList({ connections, loading, error, onRetry }: OnlineFriendsListProps) {
    const { user } = useAuth();
    const friends = (connections || [])
        .filter((c) => c.status === 'accepted')
        .map((c) => otherUser(c, user?.id))
        .filter((u): u is UserWithPresence => Boolean(u));

    const online = friends
        .filter((f) => f.presence_status === 'ONLINE' || f.presence_status === 'IDLE')
        .sort((a, b) => (a.presence_status === b.presence_status ? 0 : a.presence_status === 'ONLINE' ? -1 : 1));

    return (
        <div className={styles.widget}>
            <div className={styles.widgetHeader}>
                <h3>Online Friends</h3>
                <Link href="/connections" className={styles.headerLink}>View All</Link>
            </div>

            {loading && !connections ? (
                <div className={styles.emptyState}>Loading friends...</div>
            ) : error && !connections ? (
                <div className={styles.emptyState}>
                    Unable to load connections.
                    <button type="button" className={styles.retryBtn} onClick={onRetry}>Retry</button>
                </div>
            ) : online.length === 0 ? (
                <div className={styles.emptyState}>No connections are online right now.</div>
            ) : (
                <div className={styles.list}>
                    {online.slice(0, 6).map((friend) => {
                        const avatarUrl = resolveProfileImageUrl(friend);
                        return (
                            <div key={friend.id} className={styles.item}>
                                <div className={styles.avatarWrap}>
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={`${friend.username} avatar`} className={styles.avatar} />
                                    ) : (
                                        <div className={styles.avatarFallback}>{friend.username[0]?.toUpperCase()}</div>
                                    )}
                                    <span className={`${styles.statusDot} ${friend.presence_status === 'ONLINE' ? styles.dotOnline : styles.dotIdle}`} />
                                </div>
                                <div className={styles.info}>
                                    <h4>{friend.username}</h4>
                                    <p>{STATUS_LABEL[friend.presence_status] || friend.presence_status}</p>
                                </div>
                                <Link href="/chat" className={styles.messageBtn} aria-label={`Message ${friend.username}`}>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function otherUser(connection: ConnectionWithPresence, currentUserId?: number): UserWithPresence | null {
    if (!currentUserId) return null;
    return connection.requester.id === currentUserId ? connection.receiver : connection.requester;
}
