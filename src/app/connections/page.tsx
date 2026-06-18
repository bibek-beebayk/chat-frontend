'use client';

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/social/UserAvatar';
import { emitConnectionsUpdated, usePendingConnectionsCount } from '@/hooks/usePendingConnectionsCount';
import { socialApi } from '@/lib/social';
import { User } from '@/types';
import styles from './page.module.css';

const PAGE_SIZE = 10;

type SectionKey = 'connected' | 'not_connected';
type TargetType = 'agents' | 'players';

interface SectionState {
    items: User[];
    offset: number;
    hasMore: boolean;
    loadingMore: boolean;
}

const emptySectionState: SectionState = {
    items: [],
    offset: 0,
    hasMore: false,
    loadingMore: false,
};

function capitalizeUsername(name: string): string {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1);
}

export default function ConnectionsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const pendingIncomingCount = usePendingConnectionsCount();

    const [activeTab, setActiveTab] = useState<TargetType>('agents');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [openMenuUserId, setOpenMenuUserId] = useState<number | null>(null);

    const [agentQuery, setAgentQuery] = useState('');
    const [playerQuery, setPlayerQuery] = useState('');
    const [debouncedAgentQuery, setDebouncedAgentQuery] = useState('');
    const [debouncedPlayerQuery, setDebouncedPlayerQuery] = useState('');

    const [agentConnected, setAgentConnected] = useState<SectionState>(emptySectionState);
    const [agentNotConnected, setAgentNotConnected] = useState<SectionState>(emptySectionState);
    const [playerConnected, setPlayerConnected] = useState<SectionState>(emptySectionState);
    const [playerNotConnected, setPlayerNotConnected] = useState<SectionState>(emptySectionState);

    const isAgentUser = user?.user_type === 'agent';

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedAgentQuery(agentQuery.trim());
        }, 280);
        return () => window.clearTimeout(timer);
    }, [agentQuery]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedPlayerQuery(playerQuery.trim());
        }, 280);
        return () => window.clearTimeout(timer);
    }, [playerQuery]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, router, user]);

    useEffect(() => {
        if (isAgentUser) {
            setActiveTab('players');
        }
    }, [isAgentUser]);

    const fetchSection = useCallback(
        async (target: TargetType, section: SectionKey, options: { reset: boolean; offset?: number }) => {
            const setState = getSectionSetter(target, section, {
                setAgentConnected,
                setAgentNotConnected,
                setPlayerConnected,
                setPlayerNotConnected,
            });
            const offset = options.reset ? 0 : options.offset ?? 0;
            const query = target === 'agents' ? debouncedAgentQuery : debouncedPlayerQuery;

            if (!options.reset) {
                setState((prev) => ({ ...prev, loadingMore: true }));
            }

            const response = target === 'agents'
                ? await socialApi.searchAgents({
                    query,
                    section,
                    limit: PAGE_SIZE,
                    offset,
                })
                : await socialApi.searchPlayers({
                    query,
                    section,
                    limit: PAGE_SIZE,
                    offset,
            });

            setState((prev) => {
                const nextItems = options.reset ? response.results : [...prev.items, ...response.results];
                return {
                    items: nextItems,
                    offset: offset + response.results.length,
                    hasMore: response.meta.has_more,
                    loadingMore: false,
                };
            });
        },
        [debouncedAgentQuery, debouncedPlayerQuery]
    );

    const loadAll = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setError(null);
        try {
            if (isAgentUser) {
                await Promise.all([
                    fetchSection('players', 'connected', { reset: true }),
                    fetchSection('players', 'not_connected', { reset: true }),
                ]);
            } else {
                await Promise.all([
                    fetchSection('agents', 'connected', { reset: true }),
                    fetchSection('agents', 'not_connected', { reset: true }),
                    fetchSection('players', 'connected', { reset: true }),
                    fetchSection('players', 'not_connected', { reset: true }),
                ]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load connections');
        } finally {
            setIsLoading(false);
        }
    }, [fetchSection, isAgentUser, user]);

    useEffect(() => {
        if (!user) return;
        loadAll();
    }, [loadAll, user]);

    useEffect(() => {
        if (!user) return;
        if (isAgentUser) {
            return;
        }
        Promise.all([
            fetchSection('agents', 'connected', { reset: true }),
            fetchSection('agents', 'not_connected', { reset: true }),
        ]).catch(() => {
            // noop to keep previous results
        });
    }, [debouncedAgentQuery, fetchSection, isAgentUser, user]);

    useEffect(() => {
        if (!user) return;
        Promise.all([
            fetchSection('players', 'connected', { reset: true }),
            fetchSection('players', 'not_connected', { reset: true }),
        ]).catch(() => {
            // noop to keep previous results
        });
    }, [debouncedPlayerQuery, fetchSection, user]);

    const handleConnectionAction = async (targetUser: User, action: 'connect' | 'unsend_request' | 'disconnect' | 'chat') => {
        setBusyKey(`${action}-${targetUser.id}`);
        setOpenMenuUserId(null);
        try {
            if (action === 'connect') {
                await socialApi.createConnection(targetUser.id);
            } else if (action === 'unsend_request') {
                await socialApi.disconnectConnection(targetUser.id);
            } else if (action === 'disconnect') {
                const ok = window.confirm(`Disconnect from ${capitalizeUsername(targetUser.username)}?`);
                if (!ok) {
                    setBusyKey(null);
                    return;
                }
                await socialApi.disconnectConnection(targetUser.id);
            } else {
                const room = await socialApi.startDirectChat(targetUser);
                router.push(`/chat?room_id=${room.id}`);
                setBusyKey(null);
                return;
            }
            emitConnectionsUpdated();
            await loadAll();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Action failed');
        } finally {
            setBusyKey(null);
        }
    };

    const openProfile = (targetUser: User) => {
        router.push(`/users/${targetUser.id}`);
    };

    const currentTabData = useMemo(() => {
        if (activeTab === 'agents') {
            return {
                connected: agentConnected,
                notConnected: agentNotConnected,
                query: agentQuery,
                onQueryChange: setAgentQuery,
                searchPlaceholder: 'Search agents',
            };
        }
        return {
            connected: playerConnected,
            notConnected: playerNotConnected,
            query: playerQuery,
            onQueryChange: setPlayerQuery,
            searchPlaceholder: 'Search players',
        };
    }, [activeTab, agentConnected, agentNotConnected, agentQuery, playerConnected, playerNotConnected, playerQuery]);

    const connectionStats = useMemo(() => {
        const connectedCount = currentTabData.connected.items.length;
        const discoverCount = currentTabData.notConnected.items.length;

        return [
            { label: activeTab === 'agents' ? 'Connected Agents' : 'Connected Players', value: connectedCount },
            { label: activeTab === 'agents' ? 'Agents to Discover' : 'Players to Discover', value: discoverCount },
            { label: 'Pending Requests', value: pendingIncomingCount },
        ];
    }, [activeTab, currentTabData.connected.items.length, currentTabData.notConnected.items.length, pendingIncomingCount]);

    const loadMore = async (target: TargetType, section: SectionKey) => {
        try {
            const currentState = getSectionState(target, section, {
                agentConnected,
                agentNotConnected,
                playerConnected,
                playerNotConnected,
            });
            await fetchSection(target, section, { reset: false, offset: currentState.offset });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load more users');
            const setState = getSectionSetter(target, section, {
                setAgentConnected,
                setAgentNotConnected,
                setPlayerConnected,
                setPlayerNotConnected,
            });
            setState((prev) => ({ ...prev, loadingMore: false }));
        }
    };

    if (authLoading || !user) {
        return (
            <DashboardLayout>
                <PageShell title="Connections" eyebrow="Community" description="Loading your community network.">
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
                title="Connections"
                eyebrow="Community Network"
                description="Find players and agents, manage requests, and jump straight into direct chats."
                width="wide"
            >
                <section className={styles.heroPanel}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroEyebrow}>{isAgentUser ? 'Player Network' : 'Agent and Player Network'}</span>
                        <h2>Build your trusted Rollin circle.</h2>
                        <p>Keep useful contacts close, discover new community members, and open chats from one focused workspace.</p>
                    </div>
                    <div className={styles.statGrid}>
                        {connectionStats.map((stat) => (
                            <div key={stat.label} className={styles.statCard}>
                                <span>{stat.label}</span>
                                <strong>{stat.value}</strong>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={styles.controlPanel}>
                    <div className={styles.controlHeader}>
                        {isAgentUser ? (
                            <div>
                                <h2>Players</h2>
                                <p>Manage player connections and message requests.</p>
                            </div>
                        ) : (
                            <div className={styles.tabs} role="tablist" aria-label="Connection type">
                                <button
                                    className={`${styles.tabBtn} ${activeTab === 'agents' ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab('agents')}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === 'agents'}
                                >
                                    Agents
                                </button>
                                <button
                                    className={`${styles.tabBtn} ${activeTab === 'players' ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab('players')}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === 'players'}
                                >
                                    Players
                                </button>
                            </div>
                        )}

                        <button className={styles.pendingBtn} type="button" onClick={() => router.push('/connections/pending')}>
                            Pending Requests
                            {pendingIncomingCount > 0 && <span className={styles.badge}>{pendingIncomingCount > 99 ? '99+' : pendingIncomingCount}</span>}
                        </button>
                    </div>

                    <div className={styles.searchRow}>
                        <span className={styles.searchIcon} aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
                        </span>
                        <input
                            type="text"
                            value={currentTabData.query}
                            onChange={(e) => currentTabData.onQueryChange(e.target.value)}
                            placeholder={currentTabData.searchPlaceholder}
                            className={styles.searchInput}
                        />
                        <button className={styles.refreshBtn} type="button" onClick={loadAll}>
                            Refresh
                        </button>
                    </div>
                </section>

                {error && <p className={styles.errorBox}>{error}</p>}

                {isLoading ? (
                    <div className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <div className={styles.sections}>
                        <ConnectionSection
                            title="Connected"
                            section={currentTabData.connected}
                            emptyMessage="No connected users yet."
                            onShowMore={() => loadMore(activeTab, 'connected')}
                            onAction={handleConnectionAction}
                            onOpenProfile={openProfile}
                            busyKey={busyKey}
                            openMenuUserId={openMenuUserId}
                            setOpenMenuUserId={setOpenMenuUserId}
                        />
                        <ConnectionSection
                            title="Not Connected"
                            section={currentTabData.notConnected}
                            emptyMessage="No users found."
                            onShowMore={() => loadMore(activeTab, 'not_connected')}
                            onAction={handleConnectionAction}
                            onOpenProfile={openProfile}
                            busyKey={busyKey}
                            openMenuUserId={openMenuUserId}
                            setOpenMenuUserId={setOpenMenuUserId}
                        />
                    </div>
                )}
            </PageShell>
        </DashboardLayout>
    );
}

function ConnectionSection({
    title,
    section,
    emptyMessage,
    onShowMore,
    onAction,
    onOpenProfile,
    busyKey,
    openMenuUserId,
    setOpenMenuUserId,
}: {
    title: string;
    section: SectionState;
    emptyMessage: string;
    onShowMore: () => void;
    onAction: (targetUser: User, action: 'connect' | 'unsend_request' | 'disconnect' | 'chat') => Promise<void>;
    onOpenProfile: (targetUser: User) => void;
    busyKey: string | null;
    openMenuUserId: number | null;
    setOpenMenuUserId: (id: number | null) => void;
}) {
    const totalCount = section.items.length;

    return (
        <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>{title}</h2>
                    <p>{title === 'Connected' ? 'People you can message and follow up with.' : 'Community members available to connect with.'}</p>
                </div>
                <span className={styles.sectionCount}>{totalCount}</span>
            </div>
            {section.items.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>{emptyMessage}</p>
                </div>
            ) : (
                <ul className={styles.userList}>
                    {section.items.map((targetUser) => {
                        const pendingOutgoing = targetUser.connection_status === 'pending_outgoing';
                        const connected = targetUser.connection_status === 'connected' || targetUser.can_disconnect === true;
                        const menuOpen = openMenuUserId === targetUser.id;
                        const actionBusy = busyKey?.includes(`-${targetUser.id}`) || false;
                        const canChat = targetUser.can_chat === true || connected;
                        const canConnect = targetUser.can_connect === true;
                        const canDisconnect = targetUser.can_disconnect === true || connected;

                        return (
                            <li key={targetUser.id} className={styles.userCard} onClick={() => onOpenProfile(targetUser)}>
                                <div className={styles.userMain}>
                                    <UserAvatar user={targetUser} size={46} />
                                    <div className={styles.userInfo}>
                                        <div className={styles.userNameRow}>
                                            <p className={styles.userName}>{capitalizeUsername(targetUser.username)}</p>
                                            <span className={styles.userType}>{targetUser.user_type}</span>
                                        </div>
                                        <p className={styles.userMeta}>{targetUser.headline || getConnectionLabel(targetUser)}</p>
                                    </div>
                                </div>

                                <div className={styles.quickActions} onClick={(e) => e.stopPropagation()}>
                                    {connected && canChat && (
                                        <button type="button" className={styles.chatBtn} disabled={actionBusy} onClick={() => onAction(targetUser, 'chat')}>
                                            Chat
                                        </button>
                                    )}
                                    {!connected && pendingOutgoing && (
                                        <span className={styles.pendingStatus}>Pending</span>
                                    )}
                                    {!connected && !pendingOutgoing && canConnect && (
                                        <button type="button" className={styles.connectBtn} disabled={actionBusy} onClick={() => onAction(targetUser, 'connect')}>
                                            Connect
                                        </button>
                                    )}
                                </div>

                                <div className={styles.menuWrap} onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        className={styles.menuTrigger}
                                        onClick={() => setOpenMenuUserId(menuOpen ? null : targetUser.id)}
                                    >
                                        •••
                                    </button>

                                    {menuOpen && (
                                        <div className={styles.menuPanel}>
                                            {connected ? (
                                                <>
                                                    {canChat && (
                                                        <button type="button" disabled={actionBusy} onClick={() => onAction(targetUser, 'chat')}>
                                                            Chat
                                                        </button>
                                                    )}
                                                    {canDisconnect && (
                                                        <button type="button" disabled={actionBusy} onClick={() => onAction(targetUser, 'disconnect')}>
                                                            Disconnect
                                                        </button>
                                                    )}
                                                </>
                                            ) : pendingOutgoing ? (
                                                <button type="button" disabled={actionBusy} onClick={() => onAction(targetUser, 'unsend_request')}>
                                                    Unsend Connection Request
                                                </button>
                                            ) : canConnect ? (
                                                <button type="button" disabled={actionBusy} onClick={() => onAction(targetUser, 'connect')}>
                                                    Connect
                                                </button>
                                            ) : canChat ? (
                                                <button type="button" disabled={actionBusy} onClick={() => onAction(targetUser, 'chat')}>
                                                    Chat
                                                </button>
                                            ) : (
                                                <button type="button" disabled>
                                                    No Actions
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {section.hasMore && (
                <button type="button" className={styles.showMoreBtn} disabled={section.loadingMore} onClick={onShowMore}>
                    {section.loadingMore ? 'Loading...' : 'Show More'}
                </button>
            )}
        </section>
    );
}

function getConnectionLabel(targetUser: User): string {
    if (targetUser.connection_status === 'pending_outgoing') return 'Connection request sent';
    if (targetUser.connection_status === 'connected') return 'Connected member';
    return targetUser.user_type;
}

function getSectionSetter(
    target: TargetType,
    section: SectionKey,
    setters: {
        setAgentConnected: Dispatch<SetStateAction<SectionState>>;
        setAgentNotConnected: Dispatch<SetStateAction<SectionState>>;
        setPlayerConnected: Dispatch<SetStateAction<SectionState>>;
        setPlayerNotConnected: Dispatch<SetStateAction<SectionState>>;
    }
) {
    if (target === 'agents' && section === 'connected') return setters.setAgentConnected;
    if (target === 'agents' && section === 'not_connected') return setters.setAgentNotConnected;
    if (target === 'players' && section === 'connected') return setters.setPlayerConnected;
    return setters.setPlayerNotConnected;
}

function getSectionState(
    target: TargetType,
    section: SectionKey,
    state: {
        agentConnected: SectionState;
        agentNotConnected: SectionState;
        playerConnected: SectionState;
        playerNotConnected: SectionState;
    }
) {
    if (target === 'agents' && section === 'connected') return state.agentConnected;
    if (target === 'agents' && section === 'not_connected') return state.agentNotConnected;
    if (target === 'players' && section === 'connected') return state.playerConnected;
    return state.playerNotConnected;
}
