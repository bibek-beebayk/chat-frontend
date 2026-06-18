'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PostCard } from '@/components/posts/PostCard';
import { ShareToChatModal } from '@/components/posts/ShareToChatModal';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/social/UserAvatar';
import { emitConnectionsUpdated } from '@/hooks/usePendingConnectionsCount';
import { postApi } from '@/lib/posts';
import { socialApi } from '@/lib/social';
import { Post, User } from '@/types';
import styles from './page.module.css';

function formatJoinedDate(value?: string): string {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatUserType(value?: string): string {
    if (!value) return 'Member';
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatConnectionStatus(value?: string): string {
    if (!value || value === 'none') return 'Not connected';
    return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function UserProfilePage() {
    const params = useParams();
    const rawId = params?.id;
    const userId = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [profile, setProfile] = useState<User | null>(null);
    const [profilePosts, setProfilePosts] = useState<Post[]>([]);
    const [pendingIncomingConnectionId, setPendingIncomingConnectionId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [postsError, setPostsError] = useState<string | null>(null);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, router, user]);

    const hydrateIncomingConnectionId = useCallback(async () => {
        if (!user || !profile) return;
        if (profile.connection_status !== 'pending_incoming') {
            setPendingIncomingConnectionId(null);
            return;
        }
        const allConnections = await socialApi.fetchConnections();
        const pendingIncoming = allConnections.find(
            (connection) =>
                connection.status === 'pending' &&
                connection.receiver.id === user.id &&
                connection.requester.id === profile.id
        );
        setPendingIncomingConnectionId(pendingIncoming?.id || null);
    }, [profile, user]);

    const loadProfile = useCallback(async () => {
        if (!user || Number.isNaN(userId)) return;
        setLoading(true);
        setError(null);
        try {
            const data = await socialApi.fetchPublicProfile(userId);
            setProfile(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    }, [user, userId]);

    const loadProfilePosts = useCallback(async () => {
        if (!user || Number.isNaN(userId)) return;
        setPostsLoading(true);
        setPostsError(null);
        try {
            const list = await postApi.listByUser(userId);
            setProfilePosts(list);
        } catch (err) {
            setPostsError(err instanceof Error ? err.message : 'Failed to load posts');
        } finally {
            setPostsLoading(false);
        }
    }, [user, userId]);

    useEffect(() => {
        if (!user || Number.isNaN(userId)) return;
        loadProfile();
        loadProfilePosts();
    }, [loadProfile, loadProfilePosts, user, userId]);

    useEffect(() => {
        hydrateIncomingConnectionId().catch(() => {
            // Keep UI usable even if pending ID lookup fails.
        });
    }, [hydrateIncomingConnectionId]);

    const isSelf = useMemo(() => (user ? user.id === userId : false), [user, userId]);
    const statusLabel = profile ? formatConnectionStatus(profile.connection_status) : 'Unknown';
    const roleLabel = profile ? formatUserType(profile.user_type) : 'Member';
    const availabilityLabel = profile?.agent_availability ? formatConnectionStatus(profile.agent_availability) : 'Active';

    const runAction = async (action: 'connect' | 'disconnect' | 'unsend' | 'accept' | 'reject' | 'chat') => {
        if (!profile) return;
        setBusyAction(action);
        try {
            if (action === 'connect') {
                await socialApi.createConnection(profile.id);
                emitConnectionsUpdated();
                await loadProfile();
                return;
            }
            if (action === 'disconnect' || action === 'unsend') {
                await socialApi.disconnectConnection(profile.id);
                emitConnectionsUpdated();
                await loadProfile();
                return;
            }
            if (action === 'accept' || action === 'reject') {
                if (!pendingIncomingConnectionId) {
                    throw new Error('Unable to identify pending request.');
                }
                if (action === 'accept') {
                    await socialApi.acceptConnection(pendingIncomingConnectionId);
                } else {
                    await socialApi.rejectConnection(pendingIncomingConnectionId);
                }
                emitConnectionsUpdated();
                await loadProfile();
                return;
            }
            const room = await socialApi.startDirectChat(profile);
            router.push(`/chat?room_id=${room.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Action failed');
        } finally {
            setBusyAction(null);
        }
    };

    const handleLikePost = async (post: Post) => {
        const previous = profilePosts;
        const optimisticLiked = !post.is_liked;
        setProfilePosts((prev) =>
            prev.map((item) =>
                item.id === post.id
                    ? {
                        ...item,
                        is_liked: optimisticLiked,
                        like_count: Math.max(0, (item.like_count || 0) + (optimisticLiked ? 1 : -1)),
                    }
                    : item
            )
        );

        try {
            const result = await postApi.toggleLike(post.id);
            setProfilePosts((prev) =>
                prev.map((item) =>
                    item.id === post.id
                        ? { ...item, is_liked: result.liked, like_count: result.like_count }
                        : item
                )
            );
        } catch {
            setProfilePosts(previous);
        }
    };

    if (authLoading || !user) {
        return (
            <DashboardLayout>
                <main className={styles.main}>
                    <div className="spinner"></div>
                </main>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <main className={styles.main}>
                <section className={styles.pageHeader}>
                    <button className={styles.backBtn} type="button" onClick={() => router.back()}>
                        <span aria-hidden="true">‹</span>
                        Back
                    </button>
                    <div>
                        <p className={styles.eyebrow}>Community Profile</p>
                        <h1>Member Details</h1>
                    </div>
                </section>

                {loading ? (
                    <section className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </section>
                ) : error ? (
                    <section className={styles.errorBox}>{error}</section>
                ) : !profile ? (
                    <section className={styles.errorBox}>Profile not available.</section>
                ) : (
                    <div className={styles.profileLayout}>
                        <section className={styles.heroCard}>
                            <div className={styles.coverGlow}></div>
                            <div className={styles.profileTop}>
                                <div className={styles.avatarWrap}>
                                    <UserAvatar user={profile} size={104} />
                                </div>
                                <div className={styles.profileIdentity}>
                                    <span className={styles.rolePill}>{roleLabel}</span>
                                    <h2 className={styles.username}>{profile.username}</h2>
                                    <p className={styles.headline}>{profile.headline || `${roleLabel} in Rollin Community`}</p>
                                    <p className={styles.joined}>Joined {formatJoinedDate(profile.joined_at)}</p>
                                </div>
                            </div>

                            {isSelf ? (
                                <button className={styles.primaryBtn} type="button" onClick={() => router.push('/profile')}>
                                    Open Profile Settings
                                </button>
                            ) : (
                                <div className={styles.actions}>
                                    {(profile.can_chat || profile.primary_action === 'chat') && (
                                        <button
                                            className={styles.primaryBtn}
                                            type="button"
                                            disabled={busyAction === 'chat'}
                                            onClick={() => runAction('chat')}
                                        >
                                            {busyAction === 'chat' ? 'Opening...' : 'Start Chat'}
                                        </button>
                                    )}

                                    {profile.connection_status === 'pending_incoming' ? (
                                        <div className={styles.dualActions}>
                                            <button
                                                className={styles.rejectBtn}
                                                type="button"
                                                disabled={busyAction === 'reject'}
                                                onClick={() => runAction('reject')}
                                            >
                                                {busyAction === 'reject' ? 'Rejecting...' : 'Reject'}
                                            </button>
                                            <button
                                                className={styles.acceptBtn}
                                                type="button"
                                                disabled={busyAction === 'accept'}
                                                onClick={() => runAction('accept')}
                                            >
                                                {busyAction === 'accept' ? 'Accepting...' : 'Accept'}
                                            </button>
                                        </div>
                                    ) : profile.connection_status === 'pending_outgoing' ? (
                                        <button
                                            className={styles.secondaryBtn}
                                            type="button"
                                            disabled={busyAction === 'unsend'}
                                            onClick={() => runAction('unsend')}
                                        >
                                            {busyAction === 'unsend' ? 'Unsending...' : 'Unsend Request'}
                                        </button>
                                    ) : profile.connection_status === 'connected' ? (
                                        <button
                                            className={styles.secondaryBtn}
                                            type="button"
                                            disabled={busyAction === 'disconnect'}
                                            onClick={() => runAction('disconnect')}
                                        >
                                            {busyAction === 'disconnect' ? 'Disconnecting...' : 'Disconnect'}
                                        </button>
                                    ) : profile.can_connect ? (
                                        <button
                                            className={styles.secondaryBtn}
                                            type="button"
                                            disabled={busyAction === 'connect'}
                                            onClick={() => runAction('connect')}
                                        >
                                            {busyAction === 'connect' ? 'Connecting...' : 'Connect'}
                                        </button>
                                    ) : null}
                                </div>
                            )}
                        </section>

                        <aside className={styles.sidePanel}>
                            <section className={styles.infoCard}>
                                <h3>Relationship</h3>
                                <div className={styles.statusRow}>
                                    <span>Status</span>
                                    <strong>{statusLabel}</strong>
                                </div>
                                <div className={styles.statusRow}>
                                    <span>Availability</span>
                                    <strong>{availabilityLabel}</strong>
                                </div>
                                <div className={styles.statusRow}>
                                    <span>Can Chat</span>
                                    <strong>{profile.can_chat || profile.primary_action === 'chat' ? 'Yes' : 'No'}</strong>
                                </div>
                            </section>

                            <section className={styles.infoCard}>
                                <h3>Profile</h3>
                                <div className={styles.statGrid}>
                                    <div>
                                        <span>Role</span>
                                        <strong>{roleLabel}</strong>
                                    </div>
                                    <div>
                                        <span>Joined</span>
                                        <strong>{formatJoinedDate(profile.joined_at)}</strong>
                                    </div>
                                </div>
                                {profile.agent_status_note && (
                                    <p className={styles.note}>{profile.agent_status_note}</p>
                                )}
                            </section>
                        </aside>

                        <section className={styles.postsSection}>
                            <header className={styles.postsHeader}>
                                <div>
                                    <p className={styles.eyebrow}>Activity</p>
                                    <h2>{isSelf ? 'Your Posts' : `${profile.username}'s Posts`}</h2>
                                </div>
                                <span>{profilePosts.length}</span>
                            </header>

                            {postsError && <p className={styles.errorBox}>{postsError}</p>}

                            {postsLoading ? (
                                <div className={styles.postsState}>
                                    <div className="spinner"></div>
                                </div>
                            ) : profilePosts.length === 0 ? (
                                <div className={styles.postsState}>
                                    {isSelf ? 'You have not posted anything yet.' : `${profile.username} has not shared any visible posts yet.`}
                                </div>
                            ) : (
                                <div className={styles.postsList}>
                                    {profilePosts.map((post) => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            truncateContent
                                            truncateAt={180}
                                            onLike={handleLikePost}
                                            onShare={setSharingPost}
                                            showOwnerActions={post.author.id === user.id}
                                            onEdit={() => router.push(`/posts/${post.id}/edit`)}
                                            onDelete={async () => {
                                                const ok = window.confirm('Delete this post?');
                                                if (!ok) return;
                                                await postApi.delete(post.id);
                                                setProfilePosts((prev) => prev.filter((item) => item.id !== post.id));
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </main>
            <ShareToChatModal post={sharingPost} isOpen={!!sharingPost} onClose={() => setSharingPost(null)} />
        </DashboardLayout>
    );
}
