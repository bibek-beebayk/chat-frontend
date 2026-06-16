'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/social/UserAvatar';
import { emitConnectionsUpdated } from '@/hooks/usePendingConnectionsCount';
import { getPendingConnectionBuckets, socialApi } from '@/lib/social';
import { SocialConnection } from '@/types';
import styles from './page.module.css';

type PendingTab = 'incoming' | 'outgoing';

export default function PendingConnectionsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [tab, setTab] = useState<PendingTab>('incoming');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [incoming, setIncoming] = useState<SocialConnection[]>([]);
    const [outgoing, setOutgoing] = useState<SocialConnection[]>([]);
    const [busyAction, setBusyAction] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, router, user]);

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const connections = await socialApi.fetchConnections();
            const pending = getPendingConnectionBuckets(connections, user.id);
            setIncoming(pending.incoming);
            setOutgoing(pending.outgoing);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load pending requests');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        load();
    }, [load, user]);

    const respond = async (connection: SocialConnection, action: 'accept' | 'reject' | 'unsend') => {
        setBusyAction(`${action}-${connection.id}`);
        try {
            if (action === 'accept') {
                await socialApi.acceptConnection(connection.id);
            } else if (action === 'reject') {
                await socialApi.rejectConnection(connection.id);
            } else {
                await socialApi.disconnectConnection(connection.receiver.id);
            }
            emitConnectionsUpdated();
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Request failed');
        } finally {
            setBusyAction(null);
        }
    };

    const activeList = useMemo(() => (tab === 'incoming' ? incoming : outgoing), [incoming, outgoing, tab]);

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
                <section className={styles.headRow}>
                    <h1 className={styles.title}>Pending Connections</h1>
                    <button className={styles.backBtn} type="button" onClick={() => router.push('/connections')}>
                        Back to Connections
                    </button>
                </section>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tabBtn} ${tab === 'incoming' ? styles.activeTab : ''}`}
                        onClick={() => setTab('incoming')}
                        type="button"
                    >
                        Incoming ({incoming.length})
                    </button>
                    <button
                        className={`${styles.tabBtn} ${tab === 'outgoing' ? styles.activeTab : ''}`}
                        onClick={() => setTab('outgoing')}
                        type="button"
                    >
                        Outgoing ({outgoing.length})
                    </button>
                </div>

                {error && <p className={styles.errorBox}>{error}</p>}

                {loading ? (
                    <div className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </div>
                ) : activeList.length === 0 ? (
                    <section className={styles.emptyCard}>
                        {tab === 'incoming' ? 'No incoming pending requests.' : 'No outgoing pending requests.'}
                    </section>
                ) : (
                    <ul className={styles.list}>
                        {activeList.map((connection) => {
                            const targetUser = tab === 'incoming' ? connection.requester : connection.receiver;
                            return (
                                <li
                                    key={connection.id}
                                    className={styles.userCard}
                                    onClick={() => router.push(`/users/${targetUser.id}`)}
                                >
                                    <div className={styles.userMain}>
                                        <UserAvatar user={targetUser} size={40} />
                                        <div className={styles.userInfo}>
                                            <p className={styles.userName}>{targetUser.username}</p>
                                            <p className={styles.userMeta}>
                                                {tab === 'incoming' ? 'Requested to connect' : 'Awaiting response'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                                        {tab === 'incoming' ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className={styles.rejectBtn}
                                                    disabled={busyAction === `reject-${connection.id}`}
                                                    onClick={() => respond(connection, 'reject')}
                                                >
                                                    {busyAction === `reject-${connection.id}` ? 'Rejecting...' : 'Reject'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.acceptBtn}
                                                    disabled={busyAction === `accept-${connection.id}`}
                                                    onClick={() => respond(connection, 'accept')}
                                                >
                                                    {busyAction === `accept-${connection.id}` ? 'Accepting...' : 'Accept'}
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                className={styles.unsendBtn}
                                                disabled={busyAction === `unsend-${connection.id}`}
                                                onClick={() => respond(connection, 'unsend')}
                                            >
                                                {busyAction === `unsend-${connection.id}` ? 'Unsending...' : 'Unsend'}
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </main>
        </DashboardLayout>
    );
}

