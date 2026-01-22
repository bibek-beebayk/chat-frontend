'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WSMessage } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

interface UseWebSocketReturn {
    sendMessage: (message: string) => void;
    sendJsonMessage: (data: any) => void;
    messages: WSMessage[];
    isConnected: boolean;
    error: string | null;
}

export const useWebSocket = (roomId: number | null): UseWebSocketReturn => {
    const [messages, setMessages] = useState<WSMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (!roomId) return;

        try {
            const wsUrl = `${WS_URL}/ws/chat/${roomId}/`;
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                setError(null);
            };

            ws.current.onmessage = (event) => {
                try {
                    const data: WSMessage = JSON.parse(event.data);
                    setMessages((prev) => [...prev, data]);
                } catch (err) {
                    console.error('Error parsing WebSocket message:', err);
                }
            };

            ws.current.onerror = (event) => {
                console.error('WebSocket error:', event);
                setError('WebSocket connection error');
            };

            ws.current.onclose = () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);

                // Attempt to reconnect after 3 seconds
                reconnectTimeout.current = setTimeout(() => {
                    console.log('Attempting to reconnect...');
                    connect();
                }, 3000);
            };
        } catch (err) {
            console.error('Error creating WebSocket:', err);
            setError('Failed to create WebSocket connection');
        }
    }, [roomId]);

    useEffect(() => {
        setMessages([]); // Clear messages when switching rooms
        connect();

        return () => {
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [connect]);

    const sendMessage = useCallback((message: string) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(
                JSON.stringify({
                    type: 'chat_message',
                    message,
                })
            );
        } else {
            console.error('WebSocket is not connected');
            setError('Cannot send message: Not connected');
        }
    }, []);

    const sendJsonMessage = useCallback((data: any) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
        }
    }, []);

    return { sendMessage, sendJsonMessage, messages, isConnected, error };
};
