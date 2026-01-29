'use client';

import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTypingThrottle } from '@/hooks/useTypingThrottle';
import { apiClient } from '@/lib/api';
import { Room, Message, SupportRoom } from '@/types';
import { MessageActionMenu } from '@/components/chat/MessageActionMenu';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import styles from './page.module.css';

function ChatPageContent() {
    const { user, loading: authLoading } = useAuth();
    // ... rest of component logic

    const router = useRouter();
    const [supportRooms, setSupportRooms] = useState<any[]>([]);
    // Multi-room support
    const [mySupportRooms, setMySupportRooms] = useState<any[]>([]);
    // const [mySupportRoom, setMySupportRoom] = useState<any>(null); // Legacy

    // Station Browser & Menu State
    const [showStationBrowser, setShowStationBrowser] = useState(false);
    const [showQueueMenu, setShowQueueMenu] = useState(false);

    // Modal State
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [leaveAllModalOpen, setLeaveAllModalOpen] = useState(false);
    const [roomToLeave, setRoomToLeave] = useState<number | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

    // Switch Station Modal
    const [switchModalOpen, setSwitchModalOpen] = useState(false);

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, isVisible: true });
    };

    const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]); // New State
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showRoomList, setShowRoomList] = useState(true); // Default to list on mobile
    const [isUploading, setIsUploading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);

    const onEmojiClick = (emojiObject: any) => {
        setMessageInput(prev => prev + emojiObject.emoji);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                showEmojiPicker &&
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target as Node) &&
                emojiButtonRef.current &&
                !emojiButtonRef.current.contains(event.target as Node)
            ) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    // Infinite Scroll State
    const [hasMore, setHasMore] = useState(true); // older
    const [hasMoreNewer, setHasMoreNewer] = useState(false); // newer
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const { sendMessage, sendJsonMessage, messages: wsMessages, isConnected } = useWebSocket(selectedRoom);
    const sendTyping = useTypingThrottle(sendJsonMessage);

    // ... (logic)



    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageInput(e.target.value);

        if (isConnected && selectedRoom) {
            sendTyping();
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (messageInput.trim() && isConnected) {
            sendMessage(messageInput);
            setMessageInput('');
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedRoom) return;

        const formData = new FormData();
        formData.append('file', file);

        // Optional: add text content if needed, or backend can handle it
        // formData.append('content', `Uploaded ${file.name}`);

        try {
            setIsUploading(true);
            await apiClient.postFormData(`/api/rooms/${selectedRoom}/attachments/`, formData);
            // Success - message will come via WebSocket
        } catch (error) {
            console.error('Error uploading file:', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            showToast('Failed to upload file', 'error');
        }
    };

    // Message Actions State
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<number | null>(null);

    // Action Handlers
    const handleEditStart = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditContent(msg.content);
    };

    const handleEditCancel = () => {
        setEditingMessageId(null);
        setEditContent('');
    };

    const handleEditSave = async (messageId: number) => {
        if (!editContent.trim()) return;
        try {
            await apiClient.patch(`/api/messages/${messageId}/edit/`, { content: editContent });

            // Update messages
            setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, content: editContent, is_edited: true } : m
            ));

            // Update pinned messages if applicable
            setPinnedMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, content: editContent, is_edited: true } : m
            ));

            setEditingMessageId(null);
            setEditContent('');
        } catch (error) {
            console.error('Failed to edit message:', error);
            showToast('Failed to edit message', 'error');
        }
    };

    const handleDelete = (messageId: number) => {
        setMessageToDelete(messageId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!messageToDelete) return;

        try {
            await apiClient.delete(`/api/messages/${messageToDelete}/delete/`);

            // Update messages
            setMessages(prev => prev.map(m =>
                m.id === messageToDelete ? { ...m, is_deleted: true, content: '', attachment: undefined } : m
            ));

            // Remove from pinned if deleted
            setPinnedMessages(prev => prev.filter(m => m.id !== messageToDelete));

            setIsDeleteModalOpen(false);
            setMessageToDelete(null);
        } catch (error) {
            console.error('Failed to delete message:', error);
            showToast('Failed to delete message', 'error');
        }
    };





    const handlePin = async (messageId: number) => {
        try {
            const response = await apiClient.post(`/api/messages/${messageId}/pin/`, {});
            // Assume API returns updated message or status. Logic usually toggles.

            // Optimistically toggle for now, or fetch updated message logic
            // Let's find current status
            const msg = messages.find(m => m.id === messageId);
            if (!msg) return;

            const newIsPinned = !msg.is_pinned; // Toggle

            setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, is_pinned: newIsPinned } : m
            ));

            if (newIsPinned) {
                // Add to pinned list (need to fetch latest or reuse msg? Reuse for now)
                setPinnedMessages(prev => [...prev, { ...msg, is_pinned: true }]);
            } else {
                setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
            }

        } catch (error) {
            console.error('Failed to pin message:', error);
            // Revert if needed, but for now just log
        }
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const searchParams = useSearchParams();

    // ... (existing code)

    const fetchRooms = async () => {
        try {
            const roomType = searchParams.get('room_type');
            const url = roomType ? `/api/rooms/?room_type=${roomType}` : '/api/rooms/';

            const data = await apiClient.get<Room[]>(url);
            setRooms(data);
            // Auto-select first room if none selected
            if (data.length > 0 && !selectedRoom) {
                if (user?.user_type !== 'staff') {
                    setSelectedRoom(data[0].id);
                }
            }
        } catch (error) {
            console.error('Error loading rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    // Looad Support Rooms (for Staff)
    useEffect(() => {
        if (user && user.user_type === 'staff') {
            const loadSupportRooms = async () => {
                try {
                    const data = await apiClient.get<any[]>('/api/support-rooms/');
                    setSupportRooms(data);
                    // Check if I am already in any rooms
                    const myRooms = data.filter(r => r.staff?.id === user.id);
                    setMySupportRooms(myRooms);
                } catch (error) {
                    console.error('Error loading support rooms:', error);
                }
            };
            loadSupportRooms();
            // Poll for updates? Or just load once.
            const interval = setInterval(loadSupportRooms, 5000); // Polling for status updates
            return () => clearInterval(interval);
        }
    }, [user]);

    // Load Chats (If Player or Staff in Support Room)
    useEffect(() => {
        if (user) {
            if (user.user_type !== 'staff' || mySupportRooms.length > 0) {
                fetchRooms();
                // set interval to refresh rooms list (new requests)
                const interval = setInterval(fetchRooms, 5000);
                return () => clearInterval(interval);
            } else {
                setLoading(false);
            }
        }
    }, [user, mySupportRooms.length]);

    // ... (rest of message loading logic logic)
    // Load Messages Function
    const loadMessages = async (direction: 'older' | 'newer' | 'around' | 'initial' = 'initial', referenceId?: number) => {
        if (!selectedRoom) return;
        if (isFetchingMore) return;

        try {
            setIsFetchingMore(true);
            const params = new URLSearchParams();
            params.append('limit', '20');

            if (direction === 'older' && referenceId) params.append('before_id', referenceId.toString());
            if (direction === 'newer' && referenceId) params.append('after_id', referenceId.toString());
            if (direction === 'around' && referenceId) params.append('around_id', referenceId.toString());

            const url = `/api/rooms/${selectedRoom}/messages/?${params.toString()}`;
            const data = await apiClient.get<Message[]>(url);

            if (direction === 'initial') {
                setMessages(data);
                setHasMore(data.length >= 20);
                setHasMoreNewer(false);
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
            }
            else if (direction === 'older') {
                if (data.length < 20) setHasMore(false);
                setMessages(prev => [...data, ...prev]);
            }
            else if (direction === 'newer') {
                if (data.length < 20) setHasMoreNewer(false);
                setMessages(prev => [...prev, ...data]);
            }
            else if (direction === 'around') {
                setMessages(data);
                setHasMore(true); // Assumption: history exists
                setHasMoreNewer(true); // Assumption: newer messages exist

                // Scroll to target message
                setTimeout(() => {
                    document.getElementById(`msg-${referenceId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }

        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsFetchingMore(false);
        }
    };

    // Load Pinned Messages
    const loadPinnedMessages = async () => {
        if (!selectedRoom) return;
        try {
            const data = await apiClient.get<Message[]>(`/api/rooms/${selectedRoom}/pinned/`);
            console.log('Fetched Pinned Messages:', data);
            setPinnedMessages(data);
        } catch (error) {
            console.error('Error loading pinned messages:', error);
        }
    };

    useEffect(() => {
        if (selectedRoom) {
            setMessages([]);
            setPinnedMessages([]); // Clear pinned
            setHasMore(true);
            setHasMoreNewer(false);
            loadMessages('initial');
            loadPinnedMessages(); // Fetch pinned

            const joinRoom = async () => {
                try {
                    await apiClient.post(`/api/rooms/${selectedRoom}/join/`);
                } catch (error) {
                    console.error('Error joining room:', error);
                }
            };
            joinRoom();
        }
    }, [selectedRoom]);

    // Jump / Scroll to Bottom Helper
    const scrollToBottom = () => {
        setMessages([]);
        setHasMoreNewer(false);
        loadMessages('initial');
    };

    const handleJumpToMessage = (messageId: number) => {
        loadMessages('around', messageId);
    };

    // Handle Scroll for Infinite Loading
    const handleScroll = () => {
        if (messagesContainerRef.current && !isFetchingMore) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;

            // Scroll Up (Older)
            if (scrollTop === 0 && hasMore && messages.length > 0) {
                const oldestMessageId = messages[0].id;
                const currentScrollHeight = scrollHeight;

                loadMessages('older', oldestMessageId).then(() => {
                    requestAnimationFrame(() => {
                        if (messagesContainerRef.current) {
                            const newScrollHeight = messagesContainerRef.current.scrollHeight;
                            messagesContainerRef.current.scrollTop = newScrollHeight - currentScrollHeight;
                        }
                    });
                });
            }

            // Scroll Down (Newer)
            if (scrollTop + clientHeight >= scrollHeight - 10 && hasMoreNewer && messages.length > 0) {
                const newestMessageId = messages[messages.length - 1].id;
                loadMessages('newer', newestMessageId);
            }
        }
    };

    // Unified Message List Logic
    const unifiedMessages = useMemo(() => {
        // 1. Start with historical messages
        let allMessages = [...messages];

        // 2. Merge Pinned Messages (deduplicated)
        pinnedMessages.forEach(pinMsg => {
            if (!allMessages.some(m => m.id === pinMsg.id)) {
                allMessages.push(pinMsg);
            }
        });

        // Sort after merging to ensure order
        allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // 3. Add NEW WS messages (chat_message type)
        const newWsMessages = wsMessages
            .filter(msg => msg.type === 'chat_message')
            .map(msg => ({
                id: msg.message_id || Date.now() + Math.random(),
                room: selectedRoom || 0,
                sender: {
                    id: msg.user_id || 0,
                    username: msg.username || 'Unknown',
                    user_type: 'player' as const
                },
                content: msg.message || '',
                attachment: msg.attachment,
                timestamp: msg.timestamp || new Date().toISOString(),
                is_read: false,
                is_edited: false,
                is_pinned: false,
                is_deleted: false,
            } as Message));

        // Deduplicate and Append
        newWsMessages.forEach(wsMsg => {
            if (!allMessages.some(m => m.id === wsMsg.id)) {
                allMessages.push(wsMsg);
            }
        });

        // 4. Apply Update/Delete/Pin events to the FULL list
        wsMessages.forEach(wsMsg => {
            // ... (existing logic)
        });

        console.log('Unified Debug:', {
            messagesCount: messages.length,
            pinnedCount: pinnedMessages.length,
            wsCount: wsMessages.length,
            finalCount: allMessages.length,
            pinnedIds: pinnedMessages.map(m => m.id)
        });

        return allMessages;
    }, [messages, pinnedMessages, wsMessages, selectedRoom]);

    useEffect(() => {
        // Simple logic: if we are near bottom, or it's a new message just added

        // For now, let's auto scroll if we are not fetching more
        if (!isFetchingMore && messages.length > 0) {
            // Only if last message is recent?
            // Or if it's an initial load?
            // Ideally we check if user was at bottom.
            // For simplicity, we just scroll to bottom if it's a websocket update (length changed by 1 and at end)
            // But here we just scroll to bottom for now as per classic chat behavior, 
            // unless user is scrolling up?
            // Let's rely on refs.

            // Check if the last message is new/from ws.
            // Actually, simplest is: if not fetching more, we scroll.
            // But prepending changes messages array too.
            // So we should only scroll to bottom if the LAST message changed?
            // messages[messages.length-1]
        }
    }, [messages, wsMessages]);

    // Separate effect for WS messages to scroll to bottom
    // Separate effect for WS messages to scroll to bottom - ONLY for new messages
    // Separate effect for WS messages to scroll to bottom - ONLY for new messages
    useEffect(() => {
        if (!isFetchingMore && wsMessages.length > 0) {
            const lastMsg = wsMessages[wsMessages.length - 1];
            // Only scroll for new messages if we are NOT viewing history (hasMoreNewer is false)
            if (lastMsg.type === 'chat_message' && !hasMoreNewer) {
                // Check if user is near bottom? Or just force?
                // For simplicity, force scroll if live.
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [wsMessages, hasMoreNewer]);


    const closeChat = async () => {
        if (!selectedRoom) return;

        try {
            await apiClient.post(`/api/rooms/${selectedRoom}/close/`);
            // Refresh rooms
            const data = await apiClient.get<Room[]>('/api/rooms/');
            setRooms(data);
            setSelectedRoom(null);
            showToast('Chat closed successfully');
        } catch (err: any) {
            showToast(err.message || 'Failed to close chat', 'error');
        }
    };

    const handleSwitchStation = () => {
        setSwitchModalOpen(true);
    };

    const confirmSwitchStation = async () => {
        try {
            const res = await apiClient.post<any>('/api/rooms/switch-station/');
            showToast(res.message || 'Switched station successfully', 'success');

            // Refresh rooms/chat
            const data = await apiClient.get<Room[]>('/api/rooms/');
            setRooms(data);
            // Ensure valid room is selected
            if (data.length > 0) setSelectedRoom(data[0].id);
            setSwitchModalOpen(false);
        } catch (error: any) {
            console.error('Error switching station:', error);
            showToast(error.response?.data?.error || 'Failed to switch station', 'error');
            setSwitchModalOpen(false);
        }
    };

    const [typingUser, setTypingUser] = useState<string | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ... (existing helper functions)

    // Handle WebSocket Messages including Typing
    useEffect(() => {
        const lastMsg = wsMessages[wsMessages.length - 1];
        if (lastMsg && lastMsg.type === 'typing' && lastMsg.username !== user?.username) {
            setTypingUser(lastMsg.username || 'Someone');

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                setTypingUser(null);
            }, 3000);
        }
    }, [wsMessages, user]);




    const handleEnterSupportRoom = async (roomId: number) => {
        try {
            const res = await apiClient.post<any>(`/api/support-rooms/${roomId}/enter/`);
            // Add to our list
            setMySupportRooms(prev => [...prev, res.room]);

            // Refresh rooms list
            const updatedRooms = supportRooms.map(r =>
                r.id === roomId ? res.room : r
            );
            setSupportRooms(updatedRooms);

            // Refresh chats
            await fetchRooms();
        } catch (error: any) {
            console.error('Error entering room:', error);
            showToast(error.response?.data?.error || 'Failed to enter room', 'error');
        }
    };

    const handleLeaveSupportRoom = (roomId: number) => {
        setRoomToLeave(roomId);
        setLeaveModalOpen(true);
    };

    const confirmLeaveRoom = async () => {
        if (!roomToLeave) return;

        try {
            console.log('Sending leave request for room:', roomToLeave);
            await apiClient.post(`/api/support-rooms/${roomToLeave}/leave/`);

            // Remove from our list
            setMySupportRooms(prev => prev.filter(r => r.id !== roomToLeave));

            // Update master list
            const updatedRooms = supportRooms.map(r =>
                r.id === roomToLeave ? { ...r, staff: null, is_active: false } : r
            );
            setSupportRooms(updatedRooms);

            // Refresh chats
            await fetchRooms();
            setLeaveModalOpen(false);
            setRoomToLeave(null);
        } catch (error) {
            console.error('Error leaving room:', error);
            showToast('Failed to leave room. Please check console.', 'error');
        }
    };

    const confirmLeaveAllRooms = async () => {
        try {
            await Promise.all(mySupportRooms.map(r => apiClient.post(`/api/support-rooms/${r.id}/leave/`)));

            setMySupportRooms([]);

            // Update master list to clear all occupations by self
            // Note: This matches simple optimistic update, real sync happens on fetchRooms
            setSupportRooms(prev => prev.map(r => {
                // if it was my room, clear it
                if (mySupportRooms.some(mr => mr.id === r.id)) {
                    return { ...r, staff: null, is_active: false };
                }
                return r;
            }));

            // Refresh chats
            await fetchRooms();
            setLeaveAllModalOpen(false);
        } catch (error) {
            console.error('Error leaving all rooms:', error);
            showToast('Failed to leave some rooms. Please check console.', 'error');
        }
    };
    if (authLoading || loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) return null;

    // STAFF VIEW: Selection Mode
    if (user.user_type === 'staff' && mySupportRooms.length === 0) {
        return (
            <>
                <Header />
                <main className={styles.main}>
                    <div className={styles.container}>
                        <h1 className="gradient-text" style={{ marginBottom: '2rem' }}>Support Workstations</h1>

                        {mySupportRooms.length > 0 && (
                            <div className={styles.activeRoomIndicator}>
                                <div className={styles.activeRoomHeader}>Active Queues ({mySupportRooms.length})</div>
                                <div className={styles.activeRoomList}>
                                    {mySupportRooms.map(room => (
                                        <div key={room.id} className={styles.activeRoomItem}>
                                            <span>{room.name}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleLeaveSupportRoom(room.id); }}
                                                className={styles.leaveRoomBtn}
                                                title="Leave Queue"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={styles.supportRoomGrid}>
                            {supportRooms.map(room => {
                                const isMyRoom = mySupportRooms.some(r => r.id === room.id);
                                const isOccupied = room.staff && !isMyRoom;

                                return (
                                    <div
                                        key={room.id}
                                        className={`${styles.supportRoomCard} ${isMyRoom ? styles.active : ''} ${isOccupied ? styles.occupied : ''}`}
                                        onClick={() => !isOccupied && !isMyRoom ? handleEnterSupportRoom(room.id) : null}
                                    >
                                        <div className={styles.roomName}>{room.name}</div>
                                        <div className={styles.roomStatus}>
                                            {isMyRoom ? 'Active' : isOccupied ? `Occupied by ${room.staff.username}` : 'Available'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>

                <Modal
                    isOpen={leaveModalOpen}
                    onClose={() => setLeaveModalOpen(false)}
                    title="Leave Queue"
                    footer={
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                onClick={() => setLeaveModalOpen(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '5px',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg-tertiary)',
                                    color: 'var(--color-text-primary)',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLeaveRoom}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '5px',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Leave Queue
                            </button>
                        </div>
                    }
                >
                    <p>Are you sure you want to stop monitoring this queue? You will stop receiving new chats from it.</p>
                </Modal>
            </>
        );
    }

    const selectedRoomData = rooms.find(r => r.id === selectedRoom);

    return (
        <div className={styles.pageWrapper}>
            {/* Hide Header for Staff in Workstation */}
            {!(user.user_type === 'staff' && mySupportRooms.length > 0) && <Header />}
            <main className={styles.main}>
                <div className={styles.container}>
                    {/* Queue Management Menu for Staff */}
                    {user.user_type === 'staff' && (
                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', position: 'relative', zIndex: 50 }}>
                            <div className={styles.queueMenuWrapper}>
                                <button
                                    className={styles.queueMenuBtn}
                                    onClick={() => setShowQueueMenu(!showQueueMenu)}
                                >
                                    <span>Stations</span>
                                    <span style={{
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        borderRadius: '10px',
                                        padding: '0 6px',
                                        fontSize: '0.75rem',
                                        height: '18px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        {mySupportRooms.length}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', transform: showQueueMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                                </button>

                                {showQueueMenu && (
                                    <div className={styles.queueMenuDropdown}>
                                        <div className={styles.queueMenuHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Active Stations</span>
                                            {mySupportRooms.length > 0 && (
                                                <button
                                                    onClick={() => setLeaveAllModalOpen(true)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                        textDecoration: 'underline'
                                                    }}
                                                >
                                                    Leave All
                                                </button>
                                            )}
                                        </div>
                                        <div className={styles.queueMenuList}>
                                            {mySupportRooms.length === 0 && (
                                                <div style={{ padding: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                                                    Not monitoring any stations.
                                                </div>
                                            )}
                                            {mySupportRooms.map(room => (
                                                <div key={room.id} className={styles.queueMenuItem}>
                                                    <span className={styles.queueMenuItemName}>{room.name}</span>
                                                    <button
                                                        className={styles.queueLeaveBtn}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleLeaveSupportRoom(room.id);
                                                            // Optional: close menu or keep open? Keep open for quick management
                                                        }}
                                                        title="Leave Queue"
                                                    >
                                                        Leave
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div
                                            className={styles.queueAddItem}
                                            onClick={() => {
                                                setShowStationBrowser(true);
                                                setShowQueueMenu(false);
                                            }}
                                        >
                                            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Add Queue
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={`${styles.chatContainer} ${user.user_type !== 'staff' ? styles.singleColumn : ''}`}>
                        {user.user_type === 'staff' && (
                            <div className={`${styles.roomList} glass ${!showRoomList && user.user_type !== 'staff' ? styles.hidden : ''}`}>
                                <h2>Active Chats</h2>
                                <div className={styles.rooms}>
                                    {rooms.length > 0 ? (
                                        rooms.map((room) => {
                                            const displayName = room.client ? room.client.username : room.name;
                                            const initial = displayName.charAt(0).toUpperCase();

                                            return (
                                                <button
                                                    key={room.id}
                                                    className={`${styles.roomButton} ${selectedRoom === room.id ? styles.active : ''}`}
                                                    onClick={() => {
                                                        setSelectedRoom(room.id);
                                                        // setShowRoomList(false); // No longer needed for staff mini-sidebar
                                                    }}
                                                >
                                                    <div className={styles.roomAvatar}>
                                                        {initial}
                                                    </div>

                                                    <div className={styles.roomInfo}>
                                                        <div className={styles.roomName}>
                                                            {displayName}
                                                        </div>
                                                        {/* <div className={styles.roomSubtext}>
                                                            {room.room_type === 'player' ? 'Player' : room.room_type} • {room.participant_count || 1} online
                                                        </div> */}
                                                    </div>

                                                    <div className={styles.roomMeta}>
                                                        {room.unread_count && room.unread_count > 0 ? (
                                                            <div className={styles.roomUnread}>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </button>
                                            )
                                        })
                                    ) : (
                                        <div className={styles.noRooms}>No active chats</div>
                                    )}
                                </div>
                            </div>
                        )}



                        <div className={`${styles.chatArea} glass ${user.user_type !== 'staff' ? styles.fullWidth : ''} ${showRoomList && user.user_type !== 'staff' ? styles.hidden : ''}`}>
                            <div className={styles.chatHeader}>
                                {/* Left Side: Title & Back Button */}
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {/* Back Button for non-staff */}
                                    {user.user_type !== 'staff' && (
                                        <button
                                            className={styles.backButton}
                                            onClick={() => setShowRoomList(true)}
                                        >
                                            ←
                                        </button>
                                    )}
                                    <h2>
                                        {user.user_type === 'staff'
                                            ? (selectedRoomData
                                                ? (selectedRoomData.client ? `${selectedRoomData.client.username}` : selectedRoomData.name)
                                                : 'Select a chat')
                                            : (selectedRoomData?.queue_name || 'Support')}
                                    </h2>
                                </div>

                                {/* Right Side: Actions & Status */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {/* Close Chat button disabled for now 
                                    {user.user_type === 'staff' && selectedRoomData && (
                                        <button
                                            onClick={closeChat}
                                            style={{
                                                padding: '0.25rem 0.75rem',
                                                fontSize: '0.8rem',
                                                backgroundColor: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Close Chat
                                        </button>
                                    )}
                                    */}

                                    {/* Switch Station for Clients */}
                                    {user.user_type !== 'staff' && selectedRoomData?.can_switch_station && (
                                        <button
                                            onClick={handleSwitchStation}
                                            style={{
                                                padding: '0.3rem 0.8rem',
                                                fontSize: '0.8rem',
                                                backgroundColor: 'var(--color-bg-tertiary)',
                                                color: 'var(--color-text-primary)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '20px',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                                whiteSpace: 'nowrap'
                                            }}
                                            title="Switch to another support agent"
                                        >
                                            Switch Station ⇄
                                        </button>
                                    )}
                                    <div className={styles.status}>
                                        <span className={isConnected ? styles.connected : styles.disconnected} title={isConnected ? 'Connected' : 'Disconnected'}></span>
                                    </div>
                                </div>
                            </div>

                            {/* Away Message Banner */}
                            {user.user_type !== 'staff' && selectedRoomData && (!selectedRoomData.current_handler && !selectedRoomData.is_staff_online) && (
                                <div className={styles.awayMessageBanner}>
                                    All our staffs are away right now. Your messages might take some time to be responded.
                                </div>
                            )}

                            {/* Pinned Messages Header - Show if any pinned messages exists in current room */}
                            {unifiedMessages.some(m => m.is_pinned && !m.is_deleted) && (
                                <div className={styles.pinnedMessagesBar}>
                                    <div className={styles.pinnedIcon}>📌</div>
                                    <div className={styles.pinnedContent}>
                                        {unifiedMessages.filter(m => m.is_pinned && !m.is_deleted).map(m => (
                                            <div key={m.id} className={styles.pinnedItem} onClick={() => handleJumpToMessage(m.id)}>
                                                <span className={styles.pinnedSender}>{m.sender.username}: </span>
                                                {m.content.substring(0, 50)}{m.content.length > 50 ? '...' : ''}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Scroll to Bottom Button */}
                            {hasMoreNewer && (
                                <button
                                    onClick={scrollToBottom}
                                    style={{
                                        position: 'absolute',
                                        bottom: '80px',
                                        right: '20px',
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '40px',
                                        height: '40px',
                                        cursor: 'pointer',
                                        zIndex: 10,
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.2rem'
                                    }}
                                    title="Scroll to Bottom"
                                >
                                    ↓
                                </button>
                            )}

                            <div
                                className={styles.messagesContainer}
                                ref={messagesContainerRef}
                                onScroll={handleScroll}
                            >
                                <div className={styles.messagesList}>
                                    {isFetchingMore && (
                                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-secondary)' }}>
                                            <div className="spinner-small" style={{ display: 'inline-block', marginRight: '0.5rem' }}></div>
                                            Loading previous messages...
                                        </div>
                                    )}
                                    {unifiedMessages.map((msg, index) => {
                                        if (msg.is_deleted) {
                                            // Render deleted placeholder? Or hide?
                                            // Let's render a simpler deleted placeholder
                                            return (
                                                <div key={msg.id} className={`${styles.message} ${msg.sender.id === user.id ? styles.own : ''}`}>
                                                    <div className={styles.messageContent} style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                                                        This message was deleted
                                                    </div>
                                                </div>
                                            )
                                        }

                                        const prevMsg = unifiedMessages[index - 1];
                                        const isGrouped = prevMsg &&
                                            prevMsg.sender.username === msg.sender.username &&
                                            (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 5 * 60 * 1000) &&
                                            !prevMsg.is_deleted; // Don't group if prev is deleted/placeholder

                                        const isEditing = editingMessageId === msg.id;

                                        return (
                                            <div
                                                key={msg.id}
                                                id={`msg-${msg.id}`}
                                                className={`${styles.message} ${msg.sender.id === user.id ? styles.own : ''} ${isGrouped ? styles.grouped : ''} ${msg.is_pinned ? styles.pinnedMessage : ''}`}
                                            >
                                                {!isGrouped && (
                                                    <div className={styles.messageHeader}>
                                                        <span className={styles.sender}>{msg.sender.username}</span>
                                                        <span className={styles.time}>
                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {msg.is_pinned && <span style={{ marginLeft: '6px' }}>📌</span>}
                                                        </span>
                                                    </div>
                                                )}

                                                {isEditing ? (
                                                    <div className={styles.editContainer}>
                                                        <input
                                                            type="text"
                                                            value={editContent}
                                                            onChange={(e) => setEditContent(e.target.value)}
                                                            className={styles.editInput}
                                                            autoFocus
                                                        />
                                                        <div className={styles.editActions}>
                                                            <button onClick={() => handleEditSave(msg.id)} className={styles.saveButton}>Save</button>
                                                            <button onClick={handleEditCancel} className={styles.cancelButton}>Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {msg.attachment && (
                                                            <div className={styles.mediaContent} style={{ marginBottom: (!msg.attachment || !msg.content.startsWith('Sent a file:')) && msg.content ? '0.5rem' : '0' }}>
                                                                {msg.attachment.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) ? (
                                                                    <a href={msg.attachment} target="_blank" rel="noopener noreferrer">
                                                                        <img src={msg.attachment} alt="Attachment" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', cursor: 'pointer', display: 'block' }} />
                                                                    </a>
                                                                ) : msg.attachment.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ? (
                                                                    <video src={msg.attachment} controls style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }} />
                                                                ) : (
                                                                    <a href={msg.attachment} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', textDecoration: 'none', padding: '0.5rem', background: 'rgba(0,0,0,0.05)', borderRadius: '6px' }}>
                                                                        <span style={{ fontSize: '1.2rem' }}>📄</span>
                                                                        <span>Download File</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}

                                                        {(!msg.attachment || !msg.content.startsWith('Sent a file:')) && msg.content && (
                                                            <div className={styles.messageContent}>
                                                                {msg.content}
                                                                {msg.is_edited && <span className={styles.editedLabel}>(edited)</span>}
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {/* Action Menu - Show for all messages to allow pinning, but specific actions are protected inside the component */}
                                                {!isEditing && !msg.is_deleted && (
                                                    <div className={styles.actionMenuWrapper}>
                                                        <MessageActionMenu
                                                            isOwner={msg.sender.id === user.id}
                                                            isStaff={user.user_type === 'staff'}
                                                            isPinned={!!msg.is_pinned}
                                                            onEdit={() => handleEditStart(msg)}
                                                            onDelete={() => handleDelete(msg.id)}
                                                            onPin={() => handlePin(msg.id)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            {typingUser && (
                                <div style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8rem',
                                    color: 'var(--color-text-secondary)',
                                    fontStyle: 'italic'
                                }}>
                                    {typingUser} is typing...
                                </div>
                            )}



                            <form className={styles.messageForm} onSubmit={handleSendMessage}>
                                {showEmojiPicker && (
                                    <div ref={emojiPickerRef} style={{ position: 'absolute', bottom: '80px', left: '1rem', zIndex: 10 }}>
                                        <EmojiPicker
                                            onEmojiClick={onEmojiClick}
                                            theme={Theme.DARK}
                                            width={300}
                                            height={400}
                                            autoFocusSearch={false}
                                        />
                                    </div>
                                )}
                                {isUploading && (
                                    <div className={styles.uploadingIndicator}>
                                        <div className="spinner-small"></div>
                                        <span>Uploading file...</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={styles.attachButton}
                                    disabled={!isConnected}
                                    style={{
                                        marginRight: '0.5rem',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        color: 'var(--color-text-secondary)'
                                    }}
                                    title="Attach file"
                                >
                                    📎
                                </button>
                                <button
                                    type="button"
                                    ref={emojiButtonRef}
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={styles.emojiButton}
                                    style={{
                                        marginRight: '0.5rem',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        color: 'var(--color-text-secondary)'
                                    }}
                                    title="Add emoji"
                                >
                                    😊
                                </button>
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={handleInput}
                                    placeholder="Type your message..."
                                    className={styles.messageInput}
                                    disabled={!isConnected || (selectedRoomData && selectedRoomData.status !== 'OPEN')}
                                />
                                <button
                                    type="submit"
                                    className={styles.sendButton}
                                    disabled={!isConnected || !messageInput.trim()}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            <Modal
                isOpen={leaveModalOpen}
                onClose={() => setLeaveModalOpen(false)}
                title="Leave Queue"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                            onClick={() => setLeaveModalOpen(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '5px',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmLeaveRoom}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '5px',
                                border: 'none',
                                background: '#ef4444',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Leave Queue
                        </button>
                    </div>
                }
            >
                <p>Are you sure you want to stop monitoring this queue? You will stop receiving new chats from it.</p>
            </Modal>

            <Modal
                isOpen={leaveAllModalOpen}
                onClose={() => setLeaveAllModalOpen(false)}
                title="Leave All Stations"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                            onClick={() => setLeaveAllModalOpen(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '5px',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmLeaveAllRooms}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '5px',
                                border: 'none',
                                background: '#ef4444',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Leave All
                        </button>
                    </div>
                }
            >
                <p>Are you sure you want to stop monitoring <strong>ALL</strong> stations? You will stop receiving chats from all queues.</p>
            </Modal>

            <Modal
                isOpen={showStationBrowser}
                onClose={() => setShowStationBrowser(false)}
                title="Select a Station to Join"
            >
                <div style={{ display: 'grid', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
                    {supportRooms.filter(room => {
                        const isMyRoom = mySupportRooms.some(r => r.id === room.id);
                        const isOccupied = room.staff && !isMyRoom;
                        return !isOccupied && !isMyRoom; // Show only if free and not already joined
                    }).map(room => {
                        const isMyRoom = mySupportRooms.some(r => r.id === room.id);
                        const isOccupied = room.staff && !isMyRoom;

                        return (
                            <div
                                key={room.id}
                                className={`${styles.supportRoomCard} ${isMyRoom ? styles.active : ''} ${isOccupied ? styles.occupied : ''}`}
                                onClick={() => {
                                    if (!isOccupied && !isMyRoom) {
                                        handleEnterSupportRoom(room.id);
                                        setShowStationBrowser(false);
                                    }
                                }}
                            >
                                <div className={styles.roomName}>{room.name}</div>
                                <div className={styles.roomStatus}>
                                    {isMyRoom ? 'Active' : isOccupied ? `Occupied by ${room.staff.username}` : 'Available'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Message"
                footer={
                    <>
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'transparent',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--color-text-primary)',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            style={{
                                padding: '0.5rem 1rem',
                                background: '#ef4444',
                                border: 'none',
                                color: 'white',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Delete
                        </button>
                    </>
                }
            >
                <p>Are you sure you want to delete this message? This action cannot be undone.</p>
            </Modal>

            {/* Switch Station Modal */}
            <Modal
                isOpen={switchModalOpen}
                onClose={() => setSwitchModalOpen(false)}
                title="Switch Support Station"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                            onClick={() => setSwitchModalOpen(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '5px',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmSwitchStation}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '5px',
                                border: 'none',
                                background: 'var(--color-primary)',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Switch Station
                        </button>
                    </div>
                }
            >
                <p>Are you sure you want to switch to a different support station? You will be moved to the next available queue.</p>
            </Modal>

            {/* Toast Notification */}
            {toast.isVisible && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                />
            )}
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="loading"><div className="spinner"></div></div>}>
            <ChatPageContent />
        </Suspense>
    );
}
