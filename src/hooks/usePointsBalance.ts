'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { pointsApi } from '@/lib/points';

const REFRESH_EVENT = 'points:updated';

export function emitPointsUpdated() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function usePointsBalance(intervalMs: number = 30000): number {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);

    const refreshBalance = useCallback(async () => {
        if (!user || user.user_type !== 'player') {
            setBalance(0);
            return;
        }
        try {
            const data = await pointsApi.getBalance();
            // balance is a Decimal, serialized as a string - normalize to a
            // number once here so every consumer of this hook can keep
            // treating it as a plain number.
            setBalance(Number(data.balance));
        } catch {
            // Keep current value on transient errors
        }
    }, [user]);

    useEffect(() => {
        if (!user || user.user_type !== 'player') {
            setBalance(0);
            return;
        }

        refreshBalance();
        const timer = window.setInterval(refreshBalance, intervalMs);
        const onExternalRefresh = () => refreshBalance();
        window.addEventListener(REFRESH_EVENT, onExternalRefresh);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener(REFRESH_EVENT, onExternalRefresh);
        };
    }, [intervalMs, refreshBalance, user]);

    return balance;
}
