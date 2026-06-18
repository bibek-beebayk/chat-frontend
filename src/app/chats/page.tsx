'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { resolveProfileImageUrl } from '@/lib/social';
import { Room } from '@/types';
import styles from './page.module.css';

export default function ChatsListPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [rooms, setRooms] = useState<Room[]>([]);
    const [messageRequestRooms, setMessageRequestRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [requestActionRoomId, setRequestActionRoomId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [collapsed, setCollapsed] = useState({
        requests: true,
        chats: false,
        groups: false,
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, router, user]);

    const fetchRooms = async () => {
        try {
            const data = await apiClient.get<Room[]>('/api/rooms/');
            setRooms(data);
        } catch (error) {
            console.error('Failed to load rooms', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessageRequests = async () => {
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
    };

    useEffect(() => {
        if (!user) return;
        fetchRooms();
        fetchMessageRequests();
        const interval = setInterval(() => {
            fetchRooms();
            fetchMessageRequests();
        }, 8000);
        return () => clearInterval(interval);
    }, [user]);

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
    const unreadRequestCount = messageRequestRooms.reduce((total, room) => total + (room.unread_count || 0), 0);
    const hasAnyResults = filteredRequestRooms.length > 0 || filteredDirectRooms.length > 0 || filteredGroupRooms.length > 0;

    const openRoom = (roomId: number) => {
        router.push(`/chat?room_id=${roomId}`);
    };

    const toggleSection = (key: keyof typeof collapsed) => {
        setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const renderRoomItem = (room: Room) => {
        const displayName = roomDisplayName(room);
        const imageUrl = resolveProfileImageUrl(room.counterpart || room.client || null);
        const fallback = displayName.trim().charAt(0).toUpperCase() || 'C';

        return (
            <button key={room.id} className={styles.roomItem} onClick={() => openRoom(room.id)}>
                <div className={styles.roomAvatar}>
                    {imageUrl ? (
                        <img src={imageUrl} alt={displayName} className={styles.roomAvatarImage} />
                    ) : (
                        <span>{fallback}</span>
                    )}
                </div>
                <div className={styles.roomTextWrap}>
                    <div className={styles.roomName}>{displayName}</div>
                    <div className={styles.roomSubtitle}>{roomSubtitle(room)}</div>
                </div>
                {(room.unread_count || 0) > 0 && (
                    <span className={styles.badge}>{(room.unread_count || 0) > 99 ? '99+' : room.unread_count}</span>
                )}
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

    return (
        <DashboardLayout>
            <main className={styles.main}>
                <section className={styles.panel}>
                    <div className={styles.headerRow}>
                        <div className={styles.topRow}>
                            <h1 className={styles.title}>Chats</h1>
                            {supportRoom && (
                                <button
                                    type="button"
                                    className={styles.supportQuickBtn}
                                    onClick={() => openRoom(supportRoom.id)}
                                >
                                    Support Chat
                                </button>
                            )}
                        </div>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search chats"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {loading ? (
                        <div className={styles.empty}>Loading chats...</div>
                    ) : (
                        <div className={styles.sections}>
                            {(filteredRequestRooms.length > 0 || !normalizedQuery) && (
                                <div className={styles.section}>
                                    <button
                                        className={styles.sectionToggle}
                                        onClick={() => toggleSection('requests')}
                                        type="button"
                                        aria-expanded={!collapsed.requests}
                                    >
                                        <div className={styles.sectionTitleWrap}>
                                            <h2 className={styles.sectionTitle}>Message Requests</h2>
                                            {unreadRequestCount > 0 && (
                                                <span className={styles.sectionBadge}>
                                                    {unreadRequestCount > 99 ? '99+' : unreadRequestCount}
                                                </span>
                                            )}
                                        </div>
                                        <svg
                                            viewBox="0 0 24 24"
                                            className={`${styles.chevron} ${collapsed.requests ? styles.chevronCollapsed : ''}`}
                                            aria-hidden="true"
                                        >
                                            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    <div className={`${styles.sectionBody} ${collapsed.requests ? styles.sectionBodyCollapsed : styles.sectionBodyExpanded}`}>
                                        {filteredRequestRooms.length > 0 ? (
                                            filteredRequestRooms.map((room) => renderRequestItem(room))
                                        ) : (
                                            <div className={styles.empty}>No message requests</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {(filteredDirectRooms.length > 0 || !normalizedQuery) && (
                                <div className={styles.section}>
                                    <button
                                        className={styles.sectionToggle}
                                        onClick={() => toggleSection('chats')}
                                        type="button"
                                        aria-expanded={!collapsed.chats}
                                    >
                                        <h2 className={styles.sectionTitle}>Chats</h2>
                                        <svg
                                            viewBox="0 0 24 24"
                                            className={`${styles.chevron} ${collapsed.chats ? styles.chevronCollapsed : ''}`}
                                            aria-hidden="true"
                                        >
                                            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    <div className={`${styles.sectionBody} ${collapsed.chats ? styles.sectionBodyCollapsed : styles.sectionBodyExpanded}`}>
                                        {filteredDirectRooms.length > 0 ? (
                                            filteredDirectRooms.map((room) => renderRoomItem(room))
                                        ) : (
                                            <div className={styles.empty}>No direct chats</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {(filteredGroupRooms.length > 0 || !normalizedQuery) && (
                                <div className={styles.section}>
                                    <button
                                        className={styles.sectionToggle}
                                        onClick={() => toggleSection('groups')}
                                        type="button"
                                        aria-expanded={!collapsed.groups}
                                    >
                                        <h2 className={styles.sectionTitle}>Groups</h2>
                                        <svg
                                            viewBox="0 0 24 24"
                                            className={`${styles.chevron} ${collapsed.groups ? styles.chevronCollapsed : ''}`}
                                            aria-hidden="true"
                                        >
                                            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    <div className={`${styles.sectionBody} ${collapsed.groups ? styles.sectionBodyCollapsed : styles.sectionBodyExpanded}`}>
                                        {filteredGroupRooms.length > 0 ? (
                                            filteredGroupRooms.map((room) => renderRoomItem(room))
                                        ) : (
                                            <div className={styles.empty}>No groups</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {normalizedQuery && !hasAnyResults && (
                                <div className={styles.empty}>No chats matched &quot;{searchQuery.trim()}&quot;</div>
                            )}
                        </div>
                    )}
                </section>
            </main>
        </DashboardLayout>
    );
}
