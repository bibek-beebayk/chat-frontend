'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { Room } from '@/types';

const REFRESH_EVENT = 'chat:messages-read';

export function emitMessagesRead() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(REFRESH_EVENT));
}

/**
 * Real per-user unread message total, summed from GET /api/rooms/'s
 * `unread_count` per room (the same server-computed field the /chat page
 * itself uses). This intentionally does NOT reuse NotificationContext's
 * `unreadCount` - that counter only reflects live WS/FCM pushes received
 * while the current tab is connected, starting over at 0 on every load, so
 * it misses real backlog for a returning user and can't be trusted as "do
 * they have unread messages" for a persistent nav badge.
 */
export function useUnreadMessagesCount(intervalMs: number = 15000): number {
    const { user } = useAuth();
    const [count, setCount] = useState(0);

    const refreshCount = useCallback(async () => {
        if (!user) {
            setCount(0);
            return;
        }
        try {
            const rooms = await apiClient.get<Room[]>('/api/rooms/');
            const total = rooms.reduce((sum, room) => sum + (room.unread_count || 0), 0);
            setCount(total);
        } catch {
            // Keep current count on transient errors
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            setCount(0);
            return;
        }

        refreshCount();
        const timer = window.setInterval(refreshCount, intervalMs);
        const onExternalRefresh = () => refreshCount();
        window.addEventListener(REFRESH_EVENT, onExternalRefresh);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener(REFRESH_EVENT, onExternalRefresh);
        };
    }, [intervalMs, refreshCount, user]);

    return count;
}
