'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { xpApi } from '@/lib/xp';
import { XpStatus } from '@/types';

const REFRESH_EVENT = 'xp:updated';

export function emitXpUpdated() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(REFRESH_EVENT));
}

interface UseXpStatusResult {
    data: XpStatus | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useXpStatus(intervalMs: number = 30000): UseXpStatusResult {
    const { user } = useAuth();
    const [data, setData] = useState<XpStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!user || user.user_type !== 'player') {
            setData(null);
            setLoading(false);
            return;
        }
        setError(null);
        try {
            setData(await xpApi.getStatus());
        } catch (err: any) {
            setError(err?.message || 'Unable to load XP status.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user || user.user_type !== 'player') {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        refresh();
        const timer = window.setInterval(refresh, intervalMs);
        const onExternalRefresh = () => refresh();
        window.addEventListener(REFRESH_EVENT, onExternalRefresh);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener(REFRESH_EVENT, onExternalRefresh);
        };
    }, [intervalMs, refresh, user]);

    return { data, loading, error, refetch: refresh };
}
