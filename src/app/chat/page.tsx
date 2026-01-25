'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTypingThrottle } from '@/hooks/useTypingThrottle';
import { apiClient } from '@/lib/api';
import { Room, Message } from '@/types';
import { MessageActionMenu } from '@/components/chat/MessageActionMenu';
import { Modal } from '@/components/ui/Modal';
import styles from './page.module.css';

export default function ChatPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [supportRooms, setSupportRooms] = useState<any[]>([]);
    const [mySupportRoom, setMySupportRoom] = useState<any | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showRoomList, setShowRoomList] = useState(true); // Default to list on mobile
    const [isUploading, setIsUploading] = useState(false);

    // Infinite Scroll State
    const [hasMore, setHasMore] = useState(true);
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
            alert('Failed to upload file');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
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
            setEditingMessageId(null);
            setEditContent('');
        } catch (error) {
            console.error('Failed to edit message:', error);
            alert('Failed to edit message');
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
            setIsDeleteModalOpen(false);
            setMessageToDelete(null);
        } catch (error) {
            console.error('Failed to delete message:', error);
            alert('Failed to delete message');
        }
    };





    const handlePin = async (messageId: number) => {
        try {
            await apiClient.post(`/api/messages/${messageId}/pin/`, {});
        } catch (error) {
            console.error('Failed to pin message:', error);
        }
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Looad Support Rooms (for Staff)
    useEffect(() => {
        if (user && user.user_type === 'staff' && !mySupportRoom) {
            const loadSupportRooms = async () => {
                try {
                    const data = await apiClient.get<any[]>('/api/support-rooms/');
                    setSupportRooms(data);
                    // Check if I am already in a room
                    const myRoom = data.find(r => r.staff?.id === user.id);
                    if (myRoom) {
                        setMySupportRoom(myRoom);
                    }
                } catch (error) {
                    console.error('Error loading support rooms:', error);
                }
            };
            loadSupportRooms();
            // Poll for updates? Or just load once.
            const interval = setInterval(loadSupportRooms, 5000); // Polling for status updates
            return () => clearInterval(interval);
        }
    }, [user, mySupportRoom]);

    // Load Chats (If Player or Staff in Support Room)
    useEffect(() => {
        const loadRooms = async () => {
            try {
                const data = await apiClient.get<Room[]>('/api/rooms/');
                setRooms(data);
                // Auto-select first room if none selected
                if (data.length > 0 && !selectedRoom) {
                    // For player, always select their room. For staff, maybe not?
                    // Staff might want to see list first.
                    // But old logic selected first room.
                    // Let's keep it but be careful.
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

        if (user) {
            if (user.user_type !== 'staff' || mySupportRoom) {
                loadRooms();
                // set interval to refresh rooms list (new requests)
                const interval = setInterval(loadRooms, 5000);
                return () => clearInterval(interval);
            } else {
                setLoading(false);
            }
        }
    }, [user, mySupportRoom]);

    // ... (rest of message loading logic logic)
    // Load Messages Function
    const loadMessages = async (isInitialLog = false, beforeId?: number) => {
        if (!selectedRoom) return;

        try {
            const params = new URLSearchParams();
            if (beforeId) params.append('before_id', beforeId.toString());
            params.append('limit', '20');

            const url = `/api/rooms/${selectedRoom}/messages/?${params.toString()}`;
            const data = await apiClient.get<Message[]>(url);

            if (data.length < 20) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            if (beforeId) {
                // Prepend older messages
                setMessages(prev => [...data, ...prev]);
                // Scroll position maintenance handled in useEffect or manually
            } else {
                // Initial load
                setMessages(data);
                if (isInitialLog) {
                    // Scroll to bottom only on initial fresh load
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
                }
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsFetchingMore(false);
        }
    };

    useEffect(() => {
        if (selectedRoom) {
            setMessages([]);
            setHasMore(true);
            loadMessages(true);

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

    // Handle Scroll for Infinite Loading
    const handleScroll = () => {
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;

            if (scrollTop === 0 && hasMore && !isFetchingMore && messages.length > 0) {
                setIsFetchingMore(true);
                const oldestMessageId = messages[0].id; // Assuming sorted oldest first

                // Save current scroll height to maintain position
                const currentScrollHeight = scrollHeight;

                loadMessages(false, oldestMessageId).then(() => {
                    // Restore scroll position
                    requestAnimationFrame(() => {
                        if (messagesContainerRef.current) {
                            const newScrollHeight = messagesContainerRef.current.scrollHeight;
                            messagesContainerRef.current.scrollTop = newScrollHeight - currentScrollHeight;
                        }
                    });
                });
            }
        }
    };

    // Unified Message List Logic
    const unifiedMessages = useMemo(() => {
        // 1. Start with historical messages
        let allMessages = [...messages];

        // 2. Add NEW WS messages (chat_message type)
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

        // 3. Apply Update/Delete/Pin events to the FULL list
        wsMessages.forEach(wsMsg => {
            if (wsMsg.type === 'chat_message_update' && wsMsg.message_id) {
                const index = allMessages.findIndex(m => m.id === wsMsg.message_id);
                if (index !== -1) {
                    allMessages[index] = {
                        ...allMessages[index],
                        content: wsMsg.message || allMessages[index].content,
                        is_edited: true,
                        edited_at: wsMsg.edited_at,
                    };
                }
            } else if (wsMsg.type === 'chat_message_delete' && wsMsg.message_id) {
                const index = allMessages.findIndex(m => m.id === wsMsg.message_id);
                if (index !== -1) {
                    allMessages[index] = {
                        ...allMessages[index],
                        is_deleted: true,
                        content: 'This message was deleted.',
                        attachment: undefined // Remove attachment reference
                    } as any;
                }
            } else if (wsMsg.type === 'chat_message_pin' && wsMsg.message_id) {
                const index = allMessages.findIndex(m => m.id === wsMsg.message_id);
                if (index !== -1) {
                    allMessages[index] = {
                        ...allMessages[index],
                        is_pinned: wsMsg.is_pinned
                    } as any;
                }
            }
        });

        return allMessages;
    }, [messages, wsMessages, selectedRoom]);

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
    useEffect(() => {
        if (!isFetchingMore && wsMessages.length > 0) {
            const lastMsg = wsMessages[wsMessages.length - 1];
            // Only scroll for new messages, not updates/pins/deletes
            if (lastMsg.type === 'chat_message') {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [wsMessages]);


    const closeChat = async () => {
        if (!selectedRoom) return;

        try {
            await apiClient.post(`/api/rooms/${selectedRoom}/close/`);
            // Refresh rooms
            const data = await apiClient.get<Room[]>('/api/rooms/');
            setRooms(data);
            setSelectedRoom(null);
        } catch (err: any) {
            alert(err.message || 'Failed to close chat');
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




    const enterSupportRoom = async (roomId: number) => {
        try {
            const response = await apiClient.post<any>(`/api/support-rooms/${roomId}/enter/`);
            setMySupportRoom(response.room); // Backend should return room
        } catch (err: any) {
            alert(err.message || 'Failed to enter room');
        }
    };

    const leaveSupportRoom = async () => {
        if (!mySupportRoom) return;
        try {
            await apiClient.post(`/api/support-rooms/${mySupportRoom.id}/leave/`);
            setMySupportRoom(null);
            setRooms([]); // Clear chats
            setSelectedRoom(null);
        } catch (err: any) {
            alert(err.message);
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
    if (user.user_type === 'staff' && !mySupportRoom) {
        return (
            <>
                <Header />
                <main className={styles.main}>
                    <div className={styles.container}>
                        <h1 className="gradient-text" style={{ marginBottom: '2rem' }}>Support Workstations</h1>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                            {supportRooms.map(room => (
                                <div key={room.id} className="glass" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <h3>{room.name}</h3>
                                    <div style={{
                                        display: 'inline-block',
                                        padding: '0.2rem 0.6rem',
                                        borderRadius: '999px',
                                        fontSize: '0.7rem',
                                        backgroundColor: 'var(--color-bg-tertiary)',
                                        marginBottom: '0.5rem',
                                        marginTop: '0.2rem'
                                    }}>
                                        {room.room_type === 'all' ? 'General' :
                                            room.room_type === 'player' ? 'Player Support' :
                                                room.room_type === 'agent' ? 'Agent Support' : room.room_type}
                                    </div>
                                    <div style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{
                                            width: '10px', height: '10px', borderRadius: '50%',
                                            backgroundColor: room.is_active ? '#ef4444' : '#22c55e'
                                        }}></div>
                                        <span style={{ color: 'var(--color-text-secondary)' }}>
                                            {room.is_active ? (room.staff?.username === user.username ? 'Occupied by YOU' : `Occupied by ${room.staff?.username}`) : 'Available'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => enterSupportRoom(room.id)}
                                        disabled={room.is_active}
                                        className={styles.sendButton}
                                        style={{ width: '100%', opacity: room.is_active ? 0.5 : 1, cursor: room.is_active ? 'not-allowed' : 'pointer' }}
                                    >
                                        {room.is_active ? 'Occupied' : 'Enter Workstation'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </>
        );
    }

    const selectedRoomData = rooms.find(r => r.id === selectedRoom);

    return (
        <div className={styles.pageWrapper}>
            {/* Hide Header for Staff in Workstation */}
            {!(user.user_type === 'staff' && mySupportRoom) && <Header />}
            <main className={styles.main}>
                <div className={styles.container}>
                    {/* Leave Room Button for Staff */}
                    {user.user_type === 'staff' && (
                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <div>
                                <strong style={{ color: '#fff' }}>{mySupportRoom?.name}</strong>
                            </div>
                            <button
                                onClick={leaveSupportRoom}
                                style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Leave Station
                            </button>
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
                                                                {room.unread_count}
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
                                            : 'Chat with Support'}
                                    </h2>
                                </div>

                                {/* Right Side: Actions & Status */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                                            <div key={m.id} className={styles.pinnedItem} onClick={() => {
                                                // Scroll to message
                                                document.getElementById(`msg-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }}>
                                                <span className={styles.pinnedSender}>{m.sender.username}: </span>
                                                {m.content.substring(0, 50)}{m.content.length > 50 ? '...' : ''}
                                            </div>
                                        ))}
                                    </div>
                                </div>
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
        </div>
    );
}
