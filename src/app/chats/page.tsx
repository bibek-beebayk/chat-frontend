'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StoriesRow } from '@/components/chat/StoriesRow';
import { StoryViewerModal } from '@/components/chat/StoryViewerModal';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { resolveProfileImageUrl } from '@/lib/social';
import { storiesApi } from '@/lib/stories';
import { Room, StoryGroup } from '@/types';
import styles from './page.module.css';

type ChatTab = 'chats' | 'online' | 'groups';

export default function ChatsListPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [rooms, setRooms] = useState<Room[]>([]);
    const [messageRequestRooms, setMessageRequestRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestActionRoomId, setRequestActionRoomId] = useState<number | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<ChatTab>('chats');

    const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
    const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, router, user]);

    const fetchRooms = useCallback(async () => {
        try {
            const data = await apiClient.get<Room[]>('/api/rooms/');
            setRooms(data);
        } catch (error) {
            console.error('Failed to load rooms', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMessageRequests = useCallback(async () => {
        if (!user || user.user_type === 'staff') {
            setMessageRequestRooms([]);
            return;
        }
        try {
            const data = await apiClient.get<Room[]>('/api/rooms/message-requests/');
            setMessageRequestRooms(data);
        } catch (error) {
            console.error('Failed to load message requests', error);
        }
    }, [user]);

    const fetchStories = useCallback(async () => {
        try {
            const data = await storiesApi.list();
            setStoryGroups(data);
        } catch (error) {
            console.error('Failed to load stories', error);
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        fetchRooms();
        fetchMessageRequests();
        fetchStories();
        const interval = setInterval(() => {
            fetchRooms();
            fetchMessageRequests();
        }, 8000);
        return () => clearInterval(interval);
    }, [fetchMessageRequests, fetchRooms, fetchStories, user]);

    const respondToMessageRequest = async (roomId: number, action: 'accept' | 'reject') => {
        setRequestActionRoomId(roomId);
        try {
            await apiClient.post(`/api/rooms/${roomId}/request/respond/`, { action });
            await Promise.all([fetchRooms(), fetchMessageRequests()]);
        } catch (error) {
            console.error('Failed to process request action', error);
        } finally {
            setRequestActionRoomId(null);
        }
    };

    const roomDisplayName = (room: Room) => {
        if (room.room_type === 'support') return 'Support Chat';
        if (room.room_type === 'direct_agent') return room.counterpart?.username || 'Direct Chat';
        if (room.room_type === 'group') return room.name || 'Group Chat';
        return room.name;
    };

    const roomSubtitle = (room: Room) => {
        if (room.last_message_preview) return room.last_message_preview;
        if (room.room_type === 'support') return room.queue_name || 'Support queue';
        if (room.room_type === 'direct_agent') return room.counterpart?.user_type === 'agent' ? 'Agent chat' : 'Player chat';
        if (room.room_type === 'group') {
            const memberCount = room.group_member_count || room.participant_count || 0;
            return `${memberCount} members`;
        }
        return 'Chat';
    };

    const messageRequestRoomIds = useMemo(
        () => new Set(messageRequestRooms.map((room) => room.id)),
        [messageRequestRooms]
    );

    const orderedClientRooms = useMemo(() => {
        const supportRoom = rooms.find((r) => r.room_type === 'support');
        const regularRooms = rooms
            .filter((r) => r.room_type !== 'support' && !messageRequestRoomIds.has(r.id))
            .sort((a, b) => {
                const unreadDiff = (b.unread_count || 0) - (a.unread_count || 0);
                if (unreadDiff !== 0) return unreadDiff;
                const aTs = a.last_activity ? new Date(a.last_activity).getTime() : 0;
                const bTs = b.last_activity ? new Date(b.last_activity).getTime() : 0;
                return bTs - aTs;
            });
        return supportRoom ? [supportRoom, ...regularRooms] : regularRooms;
    }, [rooms, messageRequestRoomIds]);

    const supportRoom = user?.user_type !== 'staff'
        ? orderedClientRooms.find((room) => room.room_type === 'support')
        : undefined;
    const rawDirectRooms = user?.user_type !== 'staff'
        ? orderedClientRooms.filter((room) => room.room_type === 'direct_agent')
        : [];
    const rawGroupRooms = user?.user_type !== 'staff'
        ? orderedClientRooms.filter((room) => room.room_type === 'group')
        : [];
    const rawOnlineRooms = rawDirectRooms.filter((room) => room.counterpart?.presence_status === 'ONLINE');

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesRoom = (room: Room) => {
        if (!normalizedQuery) return true;
        const name = roomDisplayName(room).toLowerCase();
        const subtitle = roomSubtitle(room).toLowerCase();
        return name.includes(normalizedQuery) || subtitle.includes(normalizedQuery);
    };

    const filteredRequestRooms = messageRequestRooms.filter(matchesRoom);
    const filteredDirectRooms = rawDirectRooms.filter(matchesRoom);
    const filteredGroupRooms = rawGroupRooms.filter(matchesRoom);
    const filteredOnlineRooms = rawOnlineRooms.filter(matchesRoom);
    const filteredSupportRoom = supportRoom && matchesRoom(supportRoom) ? supportRoom : null;

    const unreadRequestCount = messageRequestRooms.reduce((total, room) => total + (room.unread_count || 0), 0);

    const openRoom = (roomId: number) => {
        router.push(`/chat?room_id=${roomId}`);
    };

    const renderRoomItem = (room: Room) => {
        const displayName = roomDisplayName(room);
        const counterpart = room.counterpart || room.client || null;
        const imageUrl = resolveProfileImageUrl(counterpart);
        const fallback = displayName.trim().charAt(0).toUpperCase() || 'C';
        const isOnline = room.counterpart?.presence_status === 'ONLINE';

        return (
            <button key={room.id} className={styles.roomItem} onClick={() => openRoom(room.id)}>
                <div className={styles.roomAvatarWrap}>
                    <div className={styles.roomAvatar}>
                        {imageUrl ? (
                            <img src={imageUrl} alt={displayName} className={styles.roomAvatarImage} />
                        ) : (
                            <span>{fallback}</span>
                        )}
                    </div>
                    {room.room_type === 'direct_agent' && isOnline && <span className={styles.onlineDot} aria-hidden="true" />}
                </div>
                <div className={styles.roomTextWrap}>
                    <div className={styles.roomNameRow}>
                        <span className={styles.roomName}>{displayName}</span>
                        {room.counterpart?.is_verified && (
                            <span className={styles.verifiedBadge} aria-label="Verified" title="Verified">
                                <VerifiedIcon />
                            </span>
                        )}
                    </div>
                    <div className={styles.roomSubtitle}>{roomSubtitle(room)}</div>
                </div>
                <div className={styles.roomMeta}>
                    {room.last_activity && <span className={styles.roomTimestamp}>{formatRelativeTime(room.last_activity)}</span>}
                    {(room.unread_count || 0) > 0 && (
                        <span className={styles.badge}>{(room.unread_count || 0) > 99 ? '99+' : room.unread_count}</span>
                    )}
                </div>
            </button>
        );
    };

    const renderRequestItem = (room: Room) => {
        const displayName = roomDisplayName(room);
        const imageUrl = resolveProfileImageUrl(room.counterpart || room.client || null);
        const fallback = displayName.trim().charAt(0).toUpperCase() || 'R';
        const incoming = room.message_request_direction === 'incoming';

        return (
            <div key={`request-${room.id}`} className={styles.requestItem}>
                <button className={styles.roomItem} onClick={() => openRoom(room.id)}>
                    <div className={styles.roomAvatar}>
                        {imageUrl ? (
                            <img src={imageUrl} alt={displayName} className={styles.roomAvatarImage} />
                        ) : (
                            <span>{fallback}</span>
                        )}
                    </div>
                    <div className={styles.roomTextWrap}>
                        <div className={styles.roomName}>{displayName}</div>
                        <div className={styles.roomSubtitle}>
                            {incoming ? 'Incoming message request' : 'Outgoing message request'}
                        </div>
                    </div>
                    {(room.unread_count || 0) > 0 && (
                        <span className={styles.badge}>{(room.unread_count || 0) > 99 ? '99+' : room.unread_count}</span>
                    )}
                </button>
                {incoming && (
                    <div className={styles.requestActions}>
                        <button
                            className={styles.rejectBtn}
                            onClick={() => respondToMessageRequest(room.id, 'reject')}
                            disabled={requestActionRoomId === room.id}
                        >
                            {requestActionRoomId === room.id ? '...' : 'Reject'}
                        </button>
                        <button
                            className={styles.acceptBtn}
                            onClick={() => respondToMessageRequest(room.id, 'accept')}
                            disabled={requestActionRoomId === room.id}
                        >
                            {requestActionRoomId === room.id ? '...' : 'Accept'}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (authLoading || !user) return null;
    if (authLoading || loading || !user) {
        return (
            <DashboardLayout>
                <main className={styles.main}>
                    <div className="spinner"></div>
                </main>
            </DashboardLayout>
        );
    }

    let tabContent: React.ReactNode;
    if (activeTab === 'chats') {
        const hasAnyResults = filteredRequestRooms.length > 0 || filteredDirectRooms.length > 0 || !!filteredSupportRoom;
        tabContent = (
            <div className={styles.sections}>
                {filteredRequestRooms.length > 0 && (
                    <div className={styles.section}>
                        <div className={styles.sectionTitleWrap}>
                            <h2 className={styles.sectionTitle}>Message Requests</h2>
                            {unreadRequestCount > 0 && (
                                <span className={styles.sectionBadge}>{unreadRequestCount > 99 ? '99+' : unreadRequestCount}</span>
                            )}
                        </div>
                        <div className={styles.sectionBody}>{filteredRequestRooms.map(renderRequestItem)}</div>
                    </div>
                )}
                <div className={styles.sectionBody}>
                    {filteredSupportRoom && renderRoomItem(filteredSupportRoom)}
                    {filteredDirectRooms.map(renderRoomItem)}
                </div>
                {normalizedQuery && !hasAnyResults && <div className={styles.empty}>No chats matched &quot;{searchQuery.trim()}&quot;</div>}
                {!normalizedQuery && !filteredSupportRoom && filteredDirectRooms.length === 0 && filteredRequestRooms.length === 0 && (
                    <div className={styles.empty}>No chats yet</div>
                )}
            </div>
        );
    } else if (activeTab === 'online') {
        tabContent = (
            <div className={styles.sections}>
                <div className={styles.sectionBody}>
                    {filteredOnlineRooms.length > 0 ? (
                        filteredOnlineRooms.map(renderRoomItem)
                    ) : (
                        <div className={styles.empty}>No one you chat with is online right now</div>
                    )}
                </div>
            </div>
        );
    } else {
        tabContent = (
            <div className={styles.sections}>
                <div className={styles.sectionBody}>
                    {filteredGroupRooms.length > 0 ? (
                        filteredGroupRooms.map(renderRoomItem)
                    ) : (
                        <div className={styles.empty}>No groups yet</div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout>
            <main className={styles.main}>
                <section className={styles.panel}>
                    <div className={styles.headerRow}>
                        <div className={styles.topRow}>
                            <h1 className={styles.title}>Chat</h1>
                            <div className={styles.headerActions}>
                                <button
                                    type="button"
                                    className={`${styles.iconBtn} ${searchOpen ? styles.iconBtnActive : ''}`}
                                    onClick={() => setSearchOpen((prev) => !prev)}
                                    aria-label="Search chats"
                                    aria-pressed={searchOpen}
                                >
                                    <SearchIcon />
                                </button>
                                <button
                                    type="button"
                                    className={styles.iconBtn}
                                    onClick={() => router.push('/connections')}
                                    aria-label="Start a new chat"
                                >
                                    <PlusIcon />
                                </button>
                            </div>
                        </div>

                        {searchOpen && (
                            <label className={styles.searchBox}>
                                <span aria-hidden="true"><SearchIcon /></span>
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Search chats"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </label>
                        )}

                        <div className={styles.tabRow} role="tablist">
                            {(['chats', 'online', 'groups'] as ChatTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === tab}
                                    className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab === 'chats' ? 'Chats' : tab === 'online' ? 'Online' : 'Groups'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.storiesWrap}>
                        <StoriesRow
                            groups={storyGroups}
                            onOpenViewer={setViewerGroupIndex}
                            onStoryCreated={fetchStories}
                        />
                    </div>

                    {tabContent}
                </section>
            </main>

            {viewerGroupIndex !== null && (
                <StoryViewerModal
                    groups={storyGroups}
                    startGroupIndex={viewerGroupIndex}
                    onClose={() => setViewerGroupIndex(null)}
                    onStoryDeleted={fetchStories}
                />
            )}
        </DashboardLayout>
    );
}

function formatRelativeTime(value: string): string {
    const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function SearchIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

function PlusIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function VerifiedIcon() {
    return (
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
            <path d="M12 2.5 14.4 4.9 17.7 4.4 18.3 7.7 21.1 9.6 19.6 12.6 21.1 15.6 18.3 17.5 17.7 20.8 14.4 20.3 12 22.7 9.6 20.3 6.3 20.8 5.7 17.5 2.9 15.6 4.4 12.6 2.9 9.6 5.7 7.7 6.3 4.4 9.6 4.9 12 2.5Z" />
            <path d="m8.8 12.2 2.2 2.2 4.2-4.6" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
