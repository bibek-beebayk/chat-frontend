'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTypingThrottle } from '@/hooks/useTypingThrottle';
import { apiClient } from '@/lib/api';
import { Room, Message } from '@/types';
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
    useEffect(() => {
        const loadMessages = async () => {
            if (!selectedRoom) return;
            try {
                const data = await apiClient.get<Message[]>(`/api/rooms/${selectedRoom}/messages/`);
                setMessages(data);
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        };

        const joinRoom = async () => {
            if (!selectedRoom) return;
            try {
                await apiClient.post(`/api/rooms/${selectedRoom}/join/`);
            } catch (error) {
                console.error('Error joining room:', error);
            }
        };

        if (selectedRoom) {
            loadMessages();
            joinRoom();
        }
    }, [selectedRoom]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, wsMessages]);

    const closeChat = async () => {
        if (!selectedRoom) return;
        if (!confirm('Are you sure you want to close this chat?')) return;

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
        )
    }

    const selectedRoomData = rooms.find(r => r.id === selectedRoom);

    return (
        <>
            <Header />
            <main className={styles.main}>
                <div className={styles.container}>
                    {/* Leave Room Button for Staff */}
                    {user.user_type === 'staff' && (
                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Current Workstation: </span>
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
                            <div className={`${styles.roomList} glass`}>
                                <h2>Active Chats</h2>
                                <div className={styles.rooms}>
                                    {rooms.filter(r => r.staff_assigned?.id === user.id).length > 0 ? (
                                        rooms.filter(r => r.staff_assigned?.id === user.id).map((room) => (
                                            <button
                                                key={room.id}
                                                className={`${styles.roomButton} ${selectedRoom === room.id ? styles.active : ''}`}
                                                onClick={() => setSelectedRoom(room.id)}
                                            >
                                                <div className={styles.roomName}>
                                                    {room.client ? room.client.username : room.name}
                                                </div>
                                                <div className={styles.roomStaff}>
                                                    {room.participant_count || 0} participants
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className={styles.noRooms}>No active chats</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className={`${styles.chatArea} glass ${user.user_type !== 'staff' ? styles.fullWidth : ''}`}>
                            <div className={styles.chatHeader}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <h2>
                                        {user.user_type === 'staff'
                                            ? (selectedRoomData
                                                ? (selectedRoomData.client ? `Chat with ${selectedRoomData.client.username}` : selectedRoomData.name)
                                                : 'Select a chat to start')
                                            : 'Chat with Support'}
                                    </h2>
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
                                </div>
                                <div className={styles.status}>
                                    <span className={isConnected ? styles.connected : styles.disconnected}></span>
                                    {isConnected ? 'Connected' : 'Disconnected'}
                                </div>
                            </div>

                            <div className={styles.messagesContainer}>
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`${styles.message} ${msg.sender.id === user.id ? styles.own : ''
                                            }`}
                                    >
                                        <div className={styles.messageHeader}>
                                            <span className={styles.sender}>{msg.sender.username}</span>
                                            <span className={styles.time}>
                                                {new Date(msg.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className={styles.messageContent}>{msg.content}</div>
                                    </div>
                                ))}

                                {wsMessages
                                    .filter(msg => msg.type === 'chat_message')
                                    .map((msg, idx) => (
                                        <div
                                            key={`ws-${idx}`}
                                            className={`${styles.message} ${msg.user_id === user.id ? styles.own : ''
                                                }`}
                                        >
                                            <div className={styles.messageHeader}>
                                                <span className={styles.sender}>{msg.username}</span>
                                                <span className={styles.time}>
                                                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : 'Just now'}
                                                </span>
                                            </div>
                                            <div className={styles.messageContent}>{msg.message}</div>
                                        </div>
                                    ))}

                                <div ref={messagesEndRef} />
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
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={handleInput}
                                    placeholder="Type your message..."
                                    className={styles.messageInput}
                                    disabled={!isConnected}
                                />
                                <button
                                    type="submit"
                                    className={styles.sendButton}
                                    disabled={!isConnected || !messageInput.trim()}
                                >
                                    Send
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
