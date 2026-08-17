'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsApi } from '@/lib/analytics';
import { eventsApi } from '@/lib/events';
import { plinkoApi } from '@/lib/plinko';
import { postApi } from '@/lib/posts';
import { rewardsApi } from '@/lib/rewards';
import { slotsApi } from '@/lib/slots';
import { socialApi } from '@/lib/social';
import { xpApi } from '@/lib/xp';
import {
    ActivityEvent,
    ConnectionWithPresence,
    DailyProgressItem,
    Event as RollinEvent,
    LoginStreakStatus,
    PlinkoRound,
    Post,
    SlotRound,
} from '@/types';

const STREAK_POLL_MS = 30000;

export interface SectionState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

type SectionKey = 'streak' | 'dailyProgress' | 'events' | 'onlineFriends' | 'recentActivity' | 'recentGames' | 'recentSlotsGames' | 'posts';

export interface PlayerDashboardData {
    streak: SectionState<LoginStreakStatus>;
    dailyProgress: SectionState<DailyProgressItem[]>;
    events: SectionState<RollinEvent[]>;
    onlineFriends: SectionState<ConnectionWithPresence[]>;
    recentActivity: SectionState<ActivityEvent[]>;
    recentGames: SectionState<PlinkoRound[]>;
    recentSlotsGames: SectionState<SlotRound[]>;
    posts: SectionState<Post[]>;
    refetchSection: (key: SectionKey) => void;
}

const EMPTY_SECTION: SectionState<any> = { data: null, loading: true, error: null };

/**
 * Centralizes the ~7 independent data sources the player dashboard needs
 * into one hook (instead of one useEffect scattered per card), while
 * keeping each section's {data, loading, error} genuinely independent - a
 * failed/slow section never blocks or clears another. Mirrors the exact
 * per-widget try/catch pattern RightSidebar.tsx already uses, just
 * consolidated. Only `streak` polls (matches usePointsBalance/useXpStatus'
 * live-counter convention); the rest fetch once per mount since they rarely
 * change mid-session - refetchSection() covers manual "Retry" buttons.
 */
export function usePlayerDashboardData(): PlayerDashboardData {
    const { user } = useAuth();
    const isPlayer = user?.user_type === 'player';

    const [streak, setStreak] = useState<SectionState<LoginStreakStatus>>(EMPTY_SECTION);
    const [dailyProgress, setDailyProgress] = useState<SectionState<DailyProgressItem[]>>(EMPTY_SECTION);
    const [events, setEvents] = useState<SectionState<RollinEvent[]>>(EMPTY_SECTION);
    const [onlineFriends, setOnlineFriends] = useState<SectionState<ConnectionWithPresence[]>>(EMPTY_SECTION);
    const [recentActivity, setRecentActivity] = useState<SectionState<ActivityEvent[]>>(EMPTY_SECTION);
    const [recentGames, setRecentGames] = useState<SectionState<PlinkoRound[]>>(EMPTY_SECTION);
    const [recentSlotsGames, setRecentSlotsGames] = useState<SectionState<SlotRound[]>>(EMPTY_SECTION);
    const [posts, setPosts] = useState<SectionState<Post[]>>(EMPTY_SECTION);

    const fetchStreak = useCallback(async () => {
        if (!isPlayer) return;
        try {
            const data = await rewardsApi.getStreak();
            setStreak({ data, loading: false, error: null });
        } catch (err: any) {
            setStreak((prev) => ({ data: prev.data, loading: false, error: err?.message || 'Unable to load streak.' }));
        }
    }, [isPlayer]);

    const fetchDailyProgress = useCallback(async () => {
        if (!isPlayer) return;
        setDailyProgress((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const data = await xpApi.getDailyProgress();
            setDailyProgress({ data, loading: false, error: null });
        } catch (err: any) {
            setDailyProgress({ data: null, loading: false, error: err?.message || 'Unable to load challenges.' });
        }
    }, [isPlayer]);

    const fetchEvents = useCallback(async () => {
        if (!isPlayer) return;
        setEvents((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const data = await eventsApi.listUpcoming(3);
            setEvents({ data, loading: false, error: null });
        } catch (err: any) {
            setEvents({ data: null, loading: false, error: err?.message || 'Unable to load events.' });
        }
    }, [isPlayer]);

    const fetchOnlineFriends = useCallback(async () => {
        if (!isPlayer) return;
        setOnlineFriends((prev) => ({ ...prev, loading: true, error: null }));
        try {
            // The connections endpoint now always includes presence_status
            // per-user (see social/serializers.py::ConnectionUserSerializer);
            // lib/social.ts's declared return type wasn't widened to avoid
            // touching other call sites, so this cast reflects real runtime data.
            const data = (await socialApi.fetchConnections()) as unknown as ConnectionWithPresence[];
            setOnlineFriends({ data, loading: false, error: null });
        } catch (err: any) {
            setOnlineFriends({ data: null, loading: false, error: err?.message || 'Unable to load connections.' });
        }
    }, [isPlayer]);

    const fetchRecentActivity = useCallback(async () => {
        if (!isPlayer) return;
        setRecentActivity((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const data = await analyticsApi.getRecentActivity(5);
            setRecentActivity({ data, loading: false, error: null });
        } catch (err: any) {
            setRecentActivity({ data: null, loading: false, error: err?.message || 'Unable to load activity.' });
        }
    }, [isPlayer]);

    const fetchRecentGames = useCallback(async () => {
        if (!isPlayer) return;
        setRecentGames((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const data = await plinkoApi.getHistory();
            setRecentGames({ data, loading: false, error: null });
        } catch (err: any) {
            setRecentGames({ data: null, loading: false, error: err?.message || 'Unable to load recent games.' });
        }
    }, [isPlayer]);

    const fetchRecentSlotsGames = useCallback(async () => {
        if (!isPlayer) return;
        setRecentSlotsGames((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const data = await slotsApi.getHistory();
            setRecentSlotsGames({ data, loading: false, error: null });
        } catch (err: any) {
            setRecentSlotsGames({ data: null, loading: false, error: err?.message || 'Unable to load recent games.' });
        }
    }, [isPlayer]);

    const fetchPosts = useCallback(async () => {
        if (!isPlayer) return;
        setPosts((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const data = await postApi.listFeed({ limit: 3 });
            setPosts({ data, loading: false, error: null });
        } catch (err: any) {
            setPosts({ data: null, loading: false, error: err?.message || 'Unable to load community posts.' });
        }
    }, [isPlayer]);

    const fetchersRef = useRef({
        streak: fetchStreak,
        dailyProgress: fetchDailyProgress,
        events: fetchEvents,
        onlineFriends: fetchOnlineFriends,
        recentActivity: fetchRecentActivity,
        recentGames: fetchRecentGames,
        recentSlotsGames: fetchRecentSlotsGames,
        posts: fetchPosts,
    });
    fetchersRef.current = {
        streak: fetchStreak,
        dailyProgress: fetchDailyProgress,
        events: fetchEvents,
        onlineFriends: fetchOnlineFriends,
        recentActivity: fetchRecentActivity,
        recentGames: fetchRecentGames,
        recentSlotsGames: fetchRecentSlotsGames,
        posts: fetchPosts,
    };

    useEffect(() => {
        if (!isPlayer) return;
        fetchDailyProgress();
        fetchEvents();
        fetchOnlineFriends();
        fetchRecentActivity();
        fetchRecentGames();
        fetchRecentSlotsGames();
        fetchPosts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlayer]);

    useEffect(() => {
        if (!isPlayer) return;
        fetchStreak();
        const timer = window.setInterval(fetchStreak, STREAK_POLL_MS);
        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlayer]);

    const refetchSection = useCallback((key: SectionKey) => {
        fetchersRef.current[key]();
    }, []);

    return { streak, dailyProgress, events, onlineFriends, recentActivity, recentGames, recentSlotsGames, posts, refetchSection };
}
