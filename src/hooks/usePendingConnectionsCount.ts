'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingConnectionBuckets, socialApi } from '@/lib/social';

const REFRESH_EVENT = 'social:connections-updated';

export function emitConnectionsUpdated() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function usePendingConnectionsCount(intervalMs: number = 15000): number {
    const { user } = useAuth();
    const [count, setCount] = useState(0);

    const refreshCount = useCallback(async () => {
        if (!user) {
            setCount(0);
            return;
        }
        try {
            const connections = await socialApi.fetchConnections();
            const pending = getPendingConnectionBuckets(connections, user.id);
            setCount(pending.incoming.length);
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

