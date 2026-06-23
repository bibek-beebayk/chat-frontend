'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsApi } from '@/lib/analytics';

const ANONYMOUS_ID_KEY = 'rollin_analytics_anonymous_id';
const SESSION_ID_KEY = 'rollin_analytics_session_id';
const SENSITIVE_QUERY_KEYS = new Set(['access', 'auth', 'credential', 'otp', 'password', 'refresh', 'reset_token', 'signature', 'token']);

export function AnalyticsTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!pathname || loading) return;
        if (user?.user_type === 'staff') return;

        const query = sanitizeQuery(searchParams);
        const fullPath = query ? `${pathname}?${query}` : pathname;
        const params = new URLSearchParams(searchParams?.toString() || '');

        analyticsApi.track({
            event_type: 'page_view',
            event_name: 'route_view',
            path: pathname,
            full_path: fullPath,
            referrer: typeof document !== 'undefined' ? document.referrer : '',
            anonymous_id: getOrCreateStorageId(ANONYMOUS_ID_KEY),
            session_id: getOrCreateStorageId(SESSION_ID_KEY),
            source: params.get('utm_source') || params.get('source') || '',
            medium: params.get('utm_medium') || '',
            campaign: params.get('utm_campaign') || '',
            metadata: {
                user_type: user?.user_type || '',
                screen_width: typeof window !== 'undefined' ? window.innerWidth : undefined,
                screen_height: typeof window !== 'undefined' ? window.innerHeight : undefined,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: typeof navigator !== 'undefined' ? navigator.language : '',
            },
        }).catch(() => {
            // Analytics must never interrupt navigation or app usage.
        });
    }, [loading, pathname, searchParams, user?.user_type]);

    return null;
}

function getOrCreateStorageId(key: string) {
    if (typeof window === 'undefined') return '';
    const storage = key === SESSION_ID_KEY ? window.sessionStorage : window.localStorage;
    const existing = storage.getItem(key);
    if (existing) return existing;

    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    storage.setItem(key, id);
    return id;
}

function sanitizeQuery(searchParams: { forEach: (callback: (value: string, key: string) => void) => void } | null) {
    if (!searchParams) return '';
    const safeParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
        safeParams.set(key, SENSITIVE_QUERY_KEYS.has(key.toLowerCase()) ? '[redacted]' : value);
    });
    return safeParams.toString();
}
