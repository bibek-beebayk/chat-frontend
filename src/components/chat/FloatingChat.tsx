'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation'; // Only need pathname for context
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTypingThrottle } from '@/hooks/useTypingThrottle';
import { apiClient } from '@/lib/api';
import { Room, Message } from '@/types';
import styles from './FloatingChat.module.css';
import EmojiPicker, { Theme } from 'emoji-picker-react';

export const FloatingChat: React.FC = () => {
    const { user } = useAuth();
    const { unreadCount, clearNotifications } = useNotification();
    const { resolvedTheme } = useTheme();
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
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

    // UI State
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Determine Context
    const isEventPage = pathname?.startsWith('/events/');
    const desiredRoomType = isEventPage ? 'event' : (user?.user_type === 'agent' ? 'agent' : 'player');

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

                const history = await apiClient.get<Message[]>(`/api/rooms/${room.id}/messages/?limit=50`);
                setMessages(history.reverse());
            } else {
                setRoomData(null);
                setSelectedRoom(null);
                setMessages([]);
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
        if (!isOpen) {
            clearNotifications();
        }
        setIsOpen(!isOpen);
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();

        // Upload files first if any are selected
        if (selectedFiles.length > 0 && selectedRoom) {
            try {
                setIsUploading(true);
                setUploadProgress({ current: 0, total: selectedFiles.length });

                // Upload files sequentially
                for (let i = 0; i < selectedFiles.length; i++) {
                    setUploadProgress({ current: i + 1, total: selectedFiles.length });
                    const formData = new FormData();
                    formData.append('file', selectedFiles[i]);
                    await apiClient.postFormData(`/api/rooms/${selectedRoom}/attachments/`, formData);
                }

                setSelectedFiles([]);
                setUploadProgress({ current: 0, total: 0 });
            } catch (error) {
                console.error('Upload failed:', error);
                setUploadProgress({ current: 0, total: 0 });
            } finally {
                setIsUploading(false);
            }
        }

        // Send text message if there is one
        if (messageInput.trim() && isConnected) {
            sendMessage(messageInput);
            setMessageInput('');
        }

        setShowEmojiPicker(false);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageInput(e.target.value);
        if (isConnected) sendTyping();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Add new files to the selected files array
        const newFiles = Array.from(files);
        setSelectedFiles(prev => [...prev, ...newFiles]);

        // Clear the input so the same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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

    // Only for Players/Agents and hide on full chat page
    if (!user || user.user_type === 'staff' || pathname?.startsWith('/chat') || pathname?.startsWith('/username-setup') || pathname?.startsWith('/onboarding') || pathname?.startsWith('/post-login')) return null;

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
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className={styles.messagesContainer}>
                        {!loading && !roomData && (
                            <div className={`${styles.message} ${styles.system}`} style={{ marginTop: '2rem' }}>
                                <div className={styles.systemContent}>
                                    No chat history found.
                                </div>
                            </div>
                        )}

                        {!loading && roomData && unifiedMessages.map((msg, index) => {
                            const isOwn = msg.sender.id === user.id;
                            const isSystem = msg.content.startsWith('System:');

                            // Check previous message for grouping (am I a continuation?)
                            const prevMsg = index > 0 ? unifiedMessages[index - 1] : null;
                            const isContinued = prevMsg &&
                                prevMsg.sender.id === msg.sender.id &&
                                !prevMsg.content.startsWith('System:') &&
                                (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 10 * 60 * 1000);

                            // Check next message (is the next one a continuation of me?)
                            const nextMsg = index < unifiedMessages.length - 1 ? unifiedMessages[index + 1] : null;
                            const isNextContinued = nextMsg &&
                                nextMsg.sender.id === msg.sender.id &&
                                !nextMsg.content.startsWith('System:') &&
                                (new Date(nextMsg.timestamp).getTime() - new Date(msg.timestamp).getTime() < 10 * 60 * 1000);

                            if (isSystem) {
                                return (
                                    <div key={msg.id} className={`${styles.message} ${styles.system}`}>
                                        <div className={styles.systemContent}>{msg.content.replace('System: ', '')}</div>
                                    </div>
                                );
                            }

                            // Dynamic classes for visual merging
                            const groupClass = isContinued ? styles.groupedTop : '';
                            const nextGroupClass = isNextContinued ? styles.groupedBottom : '';

                            return (
                                <div
                                    key={msg.id}
                                    className={`${styles.message} ${isOwn ? styles.own : ''} ${groupClass} ${nextGroupClass}`}
                                >
                                    <div className={styles.messageContent}>
                                        {msg.attachment && (
                                            <div className={styles.attachmentPreview}>
                                                {msg.attachment.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                                                    <video
                                                        src={msg.attachment}
                                                        controls
                                                        className={styles.videoPreview}
                                                        style={{ maxWidth: '200px', borderRadius: '8px' }}
                                                    />
                                                ) : msg.attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                    <div className={styles.imagePreview}>
                                                        <a href={msg.attachment} target="_blank" rel="noopener noreferrer">
                                                            <img src={msg.attachment} alt="attachment" />
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <a href={msg.attachment} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                                                        📄 Download Attachment
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                        {msg.content}
                                    </div>
                                    {/* Only show timestamp if it's the LAST message in the group */}
                                    {!isNextContinued && (
                                        <div className={styles.messageMeta}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Notice if no active support room (staff offline)
                        {!loading && roomData && roomData.is_staff_online === false && (
                            <div className={`${styles.message} ${styles.system}`} style={{ margin: '1rem 0' }}>
                                <div className={styles.systemContent} style={{ background: '#fee2e2', color: '#dc2626' }}>
                                    ⚠️ No active support agents are currently available. You can leave a message, and we'll get back to you.
                                </div>
                            </div>
                        )} */}

                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.inputArea}>
                        {/* File Preview Section */}
                        {selectedFiles.length > 0 && (
                            <div className={styles.filePreviewContainer}>
                                {selectedFiles.map((file, index) => {
                                    const isImage = file.type.startsWith('image/');
                                    const previewUrl = isImage ? URL.createObjectURL(file) : null;

                                    return (
                                        <div key={index} className={styles.filePreviewItem}>
                                            <button
                                                className={styles.removeFileBtn}
                                                onClick={() => removeFile(index)}
                                                title="Remove file"
                                            >
                                                ×
                                            </button>
                                            {isImage && previewUrl ? (
                                                <img src={previewUrl} alt={file.name} className={styles.previewImage} />
                                            ) : (
                                                <div className={styles.fileIcon}>📄</div>
                                            )}
                                            <div className={styles.fileName}>{file.name}</div>
                                            <div className={styles.fileSize}>
                                                {(file.size / 1024).toFixed(1)} KB
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Upload Progress Indicator */}
                        {isUploading && uploadProgress.total > 0 && (
                            <div className={styles.uploadProgressContainer}>
                                <div className={styles.uploadProgressBar}>
                                    <div
                                        className={styles.uploadProgressFill}
                                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                    />
                                </div>
                                <div className={styles.uploadProgressText}>
                                    Uploading file {uploadProgress.current} of {uploadProgress.total}...
                                </div>
                            </div>
                        )}

                        {showEmojiPicker && (
                            <div style={{ position: 'absolute', bottom: '80px', left: '1rem', zIndex: 10 }}>
                                <EmojiPicker
                                    onEmojiClick={(e) => setMessageInput(prev => prev + e.emoji)}
                                    theme={resolvedTheme === 'light' ? Theme.LIGHT : Theme.DARK}
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
                                    multiple
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
                                disabled={(!messageInput.trim() && selectedFiles.length === 0) || !isConnected}
                            >
                                ➤
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Launcher Bubble */}
            {!isOpen && (
                <button className={styles.launcher} onClick={handleToggleOpen} style={{ position: 'relative' }} aria-label="Support Chat">
                    <span style={{ fontSize: '1.3rem' }}>💬</span>
                    {unreadCount > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            background: '#ef4444',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            zIndex: 20
                        }}>
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}
        </div>
    );
};
