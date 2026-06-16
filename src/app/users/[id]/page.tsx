'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/social/UserAvatar';
import { emitConnectionsUpdated } from '@/hooks/usePendingConnectionsCount';
import { socialApi } from '@/lib/social';
import { User } from '@/types';
import styles from './page.module.css';

function formatJoinedDate(value?: string): string {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function UserProfilePage() {
    const params = useParams();
    const rawId = params?.id;
    const userId = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [profile, setProfile] = useState<User | null>(null);
    const [pendingIncomingConnectionId, setPendingIncomingConnectionId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyAction, setBusyAction] = useState<string | null>(null);

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

    useEffect(() => {
        if (!user || Number.isNaN(userId)) return;
        loadProfile();
    }, [loadProfile, user, userId]);

    useEffect(() => {
        hydrateIncomingConnectionId().catch(() => {
            // Keep UI usable even if pending ID lookup fails.
        });
    }, [hydrateIncomingConnectionId]);

    const isSelf = useMemo(() => (user ? user.id === userId : false), [user, userId]);

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
                <button className={styles.backBtn} type="button" onClick={() => router.back()}>
                    Back
                </button>

                {loading ? (
                    <section className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </section>
                ) : error ? (
                    <section className={styles.errorBox}>{error}</section>
                ) : !profile ? (
                    <section className={styles.errorBox}>Profile not available.</section>
                ) : (
                    <section className={styles.profileCard}>
                        <div className={styles.profileTop}>
                            <UserAvatar user={profile} size={84} />
                            <div className={styles.profileIdentity}>
                                <h1 className={styles.username}>{profile.username}</h1>
                                <p className={styles.headline}>{profile.headline || profile.user_type}</p>
                                <p className={styles.joined}>Joined {formatJoinedDate(profile.joined_at)}</p>
                            </div>
                        </div>

                        {isSelf ? (
                            <button className={styles.primaryBtn} type="button" onClick={() => router.push('/profile')}>
                                Open Profile
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
                                        {busyAction === 'chat' ? 'Opening...' : 'Chat'}
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
                                        {busyAction === 'unsend' ? 'Unsending...' : 'Unsend Connection Request'}
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
                )}
            </main>
        </DashboardLayout>
    );
}
