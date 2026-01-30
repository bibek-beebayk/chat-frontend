'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation'; // Only need pathname for context
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTypingThrottle } from '@/hooks/useTypingThrottle';
import { apiClient } from '@/lib/api';
import { Room, Message } from '@/types';
import styles from './FloatingChat.module.css';
import EmojiPicker, { Theme } from 'emoji-picker-react';

export const FloatingChat: React.FC = () => {
    const { user } = useAuth();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimizing, setIsMinimizing] = useState(false); // For animation handling if needed

    // Room Context
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
    const [roomData, setRoomData] = useState<Room | null>(null);
    const [loading, setLoading] = useState(false);

    // Chat State
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // UI State
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Determine Context
    const isEventPage = pathname?.startsWith('/events/');
    const desiredRoomType = isEventPage ? 'event' : undefined;

    // WebSocket
    const { sendMessage, sendJsonMessage, messages: wsMessages, isConnected } = useWebSocket(selectedRoom);
    const sendTyping = useTypingThrottle(sendJsonMessage);

    // Initial Load / Context Switch
    const fetchRoom = async (forceType?: string) => {
        if (!user) return;
        setLoading(true);
        try {
            // Construct URL based on desired context
            const typeToFetch = forceType || desiredRoomType;
            const url = typeToFetch ? `/api/rooms/?room_type=${typeToFetch}` : '/api/rooms/';

            const rooms = await apiClient.get<Room[]>(url);
            if (rooms.length > 0) {
                const room = rooms[0];
                setSelectedRoom(room.id);
                setRoomData(room);

                // Fetch Request History
                const history = await apiClient.get<Message[]>(`/api/rooms/${room.id}/messages/?limit=50`);
                setMessages(history.reverse());
            }
        } catch (error) {
            console.error('Error fetching room:', error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-connect when opening, or when context changes while open
    useEffect(() => {
        if (isOpen && user) {
            // If already connected to a room of the WRONG type for this context, re-fetch
            if (roomData && desiredRoomType && roomData.queue_type !== desiredRoomType) {
                fetchRoom(desiredRoomType);
            } else if (!selectedRoom) {
                fetchRoom();
            }
        }
    }, [isOpen, user, isEventPage]); // Re-check when context (isEventPage) changes

    // Unified Messages
    const unifiedMessages = useMemo(() => {
        const all = [...messages];
        wsMessages.forEach(wsMsg => {
            if (wsMsg.type === 'chat_message' && wsMsg.message_id && !all.some(m => m.id === wsMsg.message_id)) {
                all.push({
                    id: wsMsg.message_id,
                    room: selectedRoom!,
                    sender: { id: wsMsg.user_id || 0, username: wsMsg.username || 'User', user_type: 'player' },
                    content: wsMsg.message || '',
                    attachment: wsMsg.attachment,
                    timestamp: wsMsg.timestamp || new Date().toISOString(),
                    is_read: false,
                    is_edited: false,
                    is_pinned: false,
                    is_deleted: false,
                });
            }
        });
        return all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [messages, wsMessages, selectedRoom]);

    // Auto Scroll
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [unifiedMessages.length, isOpen]);

    // Handlers
    const handleToggleOpen = () => {
        setIsOpen(!isOpen);
    };

    const handleSendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!messageInput.trim() || !isConnected) return;
        sendMessage(messageInput);
        setMessageInput('');
        setShowEmojiPicker(false);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageInput(e.target.value);
        if (isConnected) sendTyping();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedRoom) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setIsUploading(true);
            await apiClient.postFormData(`/api/rooms/${selectedRoom}/attachments/`, formData);
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSwitchStation = async () => {
        if (!roomData?.can_switch_station) return;
        try {
            await apiClient.post('/api/rooms/switch-station/');
            // Re-fetch to get new station
            fetchRoom();
        } catch (error) {
            console.error('Switch failed', error);
        }
    };

    // Only for Players/Agents
    if (!user || user.user_type === 'staff') return null;

    return (
        <div className={styles.container}>
            {/* Chat Window */}
            {isOpen && (
                <div className={styles.window}>
                    <div className={styles.header}>
                        <div className={styles.headerTitle}>
                            <span>
                                {roomData?.queue_name || (isEventPage ? 'Event Support' : 'Live Support')}
                            </span>
                            <span className={styles.headerSubtitle}>
                                {isConnected ? 'Online' : 'Connecting...'}
                            </span>
                        </div>
                        <div className={styles.headerActions}>
                            {roomData?.can_switch_station && (
                                <button
                                    className={styles.switchBtn}
                                    onClick={handleSwitchStation}
                                    title="Switch to another agent"
                                >
                                    ⇄ Switch Agent
                                </button>
                            )}
                            <button className={styles.iconBtn} onClick={handleToggleOpen} aria-label="Minimize">
                                −
                            </button>
                        </div>
                    </div>

                    <div className={styles.messagesContainer}>
                        {loading && <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>Loading...</div>}

                        {!loading && unifiedMessages.map((msg) => {
                            const isOwn = msg.sender.id === user.id;
                            const isSystem = msg.content.startsWith('System:');

                            if (isSystem) {
                                return (
                                    <div key={msg.id} className={`${styles.message} ${styles.system}`}>
                                        <div className={styles.systemContent}>{msg.content.replace('System: ', '')}</div>
                                    </div>
                                );
                            }

                            return (
                                <div key={msg.id} className={`${styles.message} ${isOwn ? styles.own : ''}`}>
                                    <div className={styles.messageContent}>
                                        {msg.attachment && (
                                            <div className={styles.imagePreview}>
                                                <a href={msg.attachment} target="_blank" rel="noopener noreferrer">
                                                    <img src={msg.attachment} alt="attachment" />
                                                </a>
                                            </div>
                                        )}
                                        {msg.content}
                                    </div>
                                    <div className={styles.messageMeta}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.inputArea}>
                        {showEmojiPicker && (
                            <div style={{ position: 'absolute', bottom: '80px', left: '1rem', zIndex: 10 }}>
                                <EmojiPicker
                                    onEmojiClick={(e) => setMessageInput(prev => prev + e.emoji)}
                                    theme={Theme.DARK}
                                    width={300}
                                    height={300}
                                />
                            </div>
                        )}

                        <div className={styles.inputRow}>
                            <div className={styles.tools}>
                                <button
                                    className={styles.toolBtn}
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Upload File"
                                    disabled={!isConnected}
                                >
                                    📎
                                </button>
                                <button
                                    className={styles.toolBtn}
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    title="Add Emoji"
                                >
                                    😊
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                    accept="image/*,.pdf"
                                />
                            </div>

                            <input
                                className={styles.input}
                                value={messageInput}
                                onChange={handleInput}
                                placeholder="Type a message..."
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                disabled={!isConnected}
                            />

                            <button
                                className={styles.sendBtn}
                                onClick={() => handleSendMessage()}
                                disabled={!messageInput.trim() || !isConnected}
                            >
                                ➤
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Launcher Bubble */}
            {!isOpen && (
                <button className={styles.launcher} onClick={handleToggleOpen}>
                    <span style={{ fontSize: '1.5rem' }}>💬</span>
                    <span>Support Chat</span>
                </button>
            )}
        </div>
    );
};
