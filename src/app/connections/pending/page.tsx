'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
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
    const totalPending = incoming.length + outgoing.length;

    if (authLoading || !user) {
        return (
            <DashboardLayout>
                <PageShell title="Pending Connections" eyebrow="Community Network" description="Loading connection requests.">
                    <div className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </div>
                </PageShell>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <PageShell
                title="Pending Connections"
                eyebrow="Community Network"
                description="Review requests waiting on you and manage the ones you have already sent."
                width="wide"
            >
                <section className={styles.heroPanel}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroEyebrow}>Request Center</span>
                        <h2>Keep your Rollin circle current.</h2>
                        <p>Accept useful contacts, decline requests you do not need, and pull back outgoing invites from one focused queue.</p>
                    </div>
                    <div className={styles.statGrid}>
                        <div className={styles.statCard}>
                            <span>Incoming</span>
                            <strong>{incoming.length}</strong>
                        </div>
                        <div className={styles.statCard}>
                            <span>Outgoing</span>
                            <strong>{outgoing.length}</strong>
                        </div>
                        <div className={styles.statCard}>
                            <span>Total Pending</span>
                            <strong>{totalPending}</strong>
                        </div>
                    </div>
                </section>

                <section className={styles.controlPanel}>
                    <div className={styles.tabs} role="tablist" aria-label="Pending request type">
                        <button
                            className={`${styles.tabBtn} ${tab === 'incoming' ? styles.activeTab : ''}`}
                            onClick={() => setTab('incoming')}
                            type="button"
                            role="tab"
                            aria-selected={tab === 'incoming'}
                        >
                            Incoming
                            <span>{incoming.length}</span>
                        </button>
                        <button
                            className={`${styles.tabBtn} ${tab === 'outgoing' ? styles.activeTab : ''}`}
                            onClick={() => setTab('outgoing')}
                            type="button"
                            role="tab"
                            aria-selected={tab === 'outgoing'}
                        >
                            Outgoing
                            <span>{outgoing.length}</span>
                        </button>
                    </div>
                    <button className={styles.backBtn} type="button" onClick={() => router.push('/connections')}>
                        Back to Connections
                    </button>
                </section>

                {error && <p className={styles.errorBox}>{error}</p>}

                {loading ? (
                    <div className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </div>
                ) : activeList.length === 0 ? (
                    <section className={styles.emptyCard}>
                        <span>{tab === 'incoming' ? 'No incoming requests' : 'No outgoing requests'}</span>
                        <p>
                            {tab === 'incoming'
                                ? 'You are all caught up. New connection requests will appear here.'
                                : 'You do not have any sent requests waiting for a response.'}
                        </p>
                    </section>
                ) : (
                    <section className={styles.requestPanel}>
                        <div className={styles.sectionHeader}>
                            <div>
                                <h2>{tab === 'incoming' ? 'Incoming Requests' : 'Outgoing Requests'}</h2>
                                <p>{tab === 'incoming' ? 'People asking to connect with you.' : 'Requests waiting for someone else to respond.'}</p>
                            </div>
                            <span>{activeList.length}</span>
                        </div>

                        <ul className={styles.list}>
                            {activeList.map((connection) => {
                                const targetUser = tab === 'incoming' ? connection.requester : connection.receiver;
                                const statusLabel = tab === 'incoming' ? 'Requested to connect' : 'Awaiting response';
                                return (
                                    <li
                                        key={connection.id}
                                        className={styles.userCard}
                                        onClick={() => router.push(`/users/${targetUser.id}`)}
                                    >
                                        <div className={styles.userMain}>
                                            <UserAvatar user={targetUser} size={46} />
                                            <div className={styles.userInfo}>
                                                <div className={styles.userNameRow}>
                                                    <p className={styles.userName}>{capitalizeUsername(targetUser.username)}</p>
                                                    <span className={styles.userType}>{targetUser.user_type}</span>
                                                </div>
                                                <p className={styles.userMeta}>{targetUser.headline || statusLabel}</p>
                                            </div>
                                        </div>

                                        <span className={styles.statusPill}>{statusLabel}</span>

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
                    </section>
                )}
            </PageShell>
        </DashboardLayout>
    );
}

function capitalizeUsername(name: string): string {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1);
}
