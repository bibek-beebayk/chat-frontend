"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { apiClient } from '@/lib/api';
import { useAuth } from './AuthContext'; // Assuming AuthContext exists

const firebaseConfig = {
    apiKey: "AIzaSyBiRh7NVaLQmQjagl8WN9olD9nOMQbo37A",
    authDomain: "rollin-community.firebaseapp.com",
    projectId: "rollin-community",
    storageBucket: "rollin-community.firebasestorage.app",
    messagingSenderId: "195206028710",
    appId: "1:195206028710:web:679e28b5500192f4284367"
};

// Initialize Firebase with error handling for unsupported browsers (in-app browsers)
let app;
let messaging = null;

try {
    app = initializeApp(firebaseConfig);
    // Only initialize messaging if in browser environment and supported
    if (typeof window !== 'undefined') {
        try {
            messaging = getMessaging(app);
        } catch (messagingError) {
            console.warn('[Firebase] Messaging not supported in this browser:', messagingError);
            messaging = null;
        }
    }
} catch (error) {
    console.error('[Firebase] Initialization error:', error);
}

// VAPID Key must be a valid P-256 public key (approx 87-88 characters)
// Get this from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "YOUR_VALID_VAPID_KEY_HERE";

interface NotificationContextType {
    token: string | null;
    permission: NotificationPermission;
    requestPermission: () => Promise<void>;
    notifications: any[]; // TODO: Define type
    unreadCount: number;
    clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
    token: null,
    permission: 'default',
    requestPermission: async () => { },
    notifications: [],
    unreadCount: 0,
    clearNotifications: () => { },
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [notifications, setNotifications] = useState<any[]>([]);
    const { user } = useAuth(); // We need user to sync token

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);

            // Auto-fetch token if already granted
            if (Notification.permission === 'granted' && messaging) {
                (async () => {
                    let registration;
                    if ('serviceWorker' in navigator) {
                        registration = await navigator.serviceWorker.ready;
                    }
                    try {
                        const currentToken = await getToken(messaging, {
                            vapidKey: VAPID_KEY,
                            serviceWorkerRegistration: registration
                        });
                        if (currentToken) {
                            setToken(currentToken);
                            syncToken(currentToken);
                        }
                    } catch (err) {
                        console.error("Auto-fetch token failed", err);
                    }
                })();
            }
        }
    }, [user]); // Re-run if user changes (to sync with new user)

    const requestPermission = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            console.warn('Notifications not supported in this browser.');
            return;
        }
        try {
            const permission = await Notification.requestPermission();
            setPermission(permission);
            if (permission === 'granted' && messaging) {
                // Wait for Service Worker to be ready (PWA)
                let registration;
                if ('serviceWorker' in navigator) {
                    registration = await navigator.serviceWorker.ready;
                }

                // Pass existing registration to getToken to avoid conflict
                const currentToken = await getToken(messaging, {
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: registration
                });

                if (currentToken) {
                    alert("FCM Token Retrieved!");
                    setToken(currentToken);
                    await syncToken(currentToken);
                } else {
                    alert("No Instance ID Token available.");
                }
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
            alert("Error requesting permission: " + error);
        }
    };

    const syncToken = async (fcmToken: string) => {
        if (!user) return;
        // alert("Syncing Token: " + fcmToken.slice(0, 10) + "..."); 
        try {
            await apiClient.post('/api/notifications/devices/', {
                fcm_token: fcmToken,
                device: 'web', // Helper to detect device?
                browser: navigator.userAgent
            });
            console.log("Syncing token to backend:", fcmToken);
        } catch (e) {
            console.error("Failed to sync token", e);
        }
    };

    // Handle foreground messages
    useEffect(() => {
        if (!messaging) return;

        const unsubscribe = onMessage(messaging, (payload) => {
            console.log("Foreground message:", payload);
            setNotifications(prev => [payload, ...prev]);

            // Play Sound
            try {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(e => console.log('Audio play failed (user interaction needed):', e));
            } catch (e) {
                console.error('Audio initialization failed', e);
            }

            // Show toast?
            if (document.hidden && 'Notification' in window) {
                new Notification(payload.notification?.title || 'New Message', {
                    body: payload.notification?.body,
                    icon: '/logo.png'
                });
            }
        });

        return () => unsubscribe();
    }, []);

    // Heartbeat loop
    useEffect(() => {
        if (!user) return;

        let socket: WebSocket | null = null;
        let heartbeatInterval: NodeJS.Timeout;

        const connectWebSocket = () => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            // Extract host from apiUrl or just use window.location.host if we expect proxy
            // But usually for backend we want to target the backend host.
            // If we use 'http://localhost:8000', we want 'ws://localhost:8000'.
            const wsBase = apiUrl.replace(/^http/, 'ws');

            // If user works locally with proxy, window.location.host is 3000.
            // If backend is 8000.
            // Let's rely on wsBase derived from API URL.

            // Get Access Token from LocalStorage (managed by ApiClient)
            const accessToken = localStorage.getItem('accessToken');
            socket = new WebSocket(`${wsBase}/ws/notifications/?token=${accessToken}`);

            socket.onopen = () => {
                console.log('Notification WS Connected');
                // Start heartbeat
                heartbeatInterval = setInterval(() => {
                    if (socket?.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'heartbeat' }));
                    }
                }, 30000); // 30 seconds
            };

            const playSound = () => {
                try {
                    const audio = new Audio('/notification.mp3');
                    audio.play().catch(e => console.log('Audio play failed (user interaction needed):', e));
                } catch (e) {
                    console.error('Audio initialization failed', e);
                }
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'new_message_notification') {
                        // Play sound for incoming message
                        if (data.sender_username !== user?.username) {
                            playSound();
                        }

                        setNotifications(prev => [data, ...prev]);

                        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
                            new Notification(data.sender_username || 'New Message', {
                                body: 'You have a new message',
                                icon: '/logo.png'
                            });
                        }
                    }
                } catch (e) {
                    console.error("WS Message Error", e);
                }
            };

            socket.onclose = () => {
                console.log('Notification WS Disconnected');
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                // Simple reconnect
                setTimeout(connectWebSocket, 5000);
            };
        };

        const timeoutId = setTimeout(connectWebSocket, 1000); // Small delay to ensure auth

        return () => {
            clearTimeout(timeoutId);
            if (socket) socket.close();
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [user]);

    const clearNotifications = () => {
        setNotifications([]);
    };

    return (
        <NotificationContext.Provider value={{ token, permission, requestPermission, notifications, unreadCount: notifications.length, clearNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};
