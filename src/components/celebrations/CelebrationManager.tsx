'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useXpStatus } from '@/hooks/useXpStatus';
import { xpApi } from '@/lib/xp';
import { rewardsApi } from '@/lib/rewards';
import { hasShownToday } from '@/lib/dailyPopups';
import { LoginStreakStatus } from '@/types';
import { LevelUpModal } from './LevelUpModal';
import { DailyLoginModal } from './DailyLoginModal';
import { StreakProgressModal } from './StreakProgressModal';

type ActivePopup = 'level_up' | 'daily_login' | 'streak_progress' | null;

/**
 * Global, single mount point (see app/layout.tsx) for the real event-driven
 * celebration popups. Shows at most one at a time - priority: a fresh rank-
 * up (rare, most significant) > today's daily-login reward > in-progress
 * streak nudge. Player-only, same gating as MobileBottomNav.
 */
export function CelebrationManager() {
    const { user } = useAuth();
    const pathname = usePathname();
    const { data: xpStatus } = useXpStatus();
    const [active, setActive] = useState<ActivePopup>(null);
    const [dailyLoginXp, setDailyLoginXp] = useState<number | null>(null);
    const [streak, setStreak] = useState<LoginStreakStatus | null>(null);
    const [checkedDaily, setCheckedDaily] = useState(false);

    // /onboarding has its own first-run WelcomeModal (same visual family,
    // see WelcomeModal.tsx) - suppress every other celebration there so the
    // two backdrops never stack on top of each other.
    const isPlayer = user?.user_type === 'player' && !pathname?.startsWith('/onboarding');

    useEffect(() => {
        if (!isPlayer) return;
        let cancelled = false;
        Promise.allSettled([xpApi.getDailyProgress(), rewardsApi.getStreak()]).then(([dailyRes, streakRes]) => {
            if (cancelled) return;
            if (dailyRes.status === 'fulfilled') {
                const dailyLogin = dailyRes.value.find((item) => item.slug === 'daily_login');
                if (dailyLogin?.completed) setDailyLoginXp(dailyLogin.xp_value);
            }
            if (streakRes.status === 'fulfilled') setStreak(streakRes.value);
            setCheckedDaily(true);
        });
        return () => {
            cancelled = true;
        };
    }, [isPlayer]);

    useEffect(() => {
        if (!isPlayer) return;
        // Level up is highest priority and can arrive after a lower-priority
        // popup is already showing (its data comes from a separate, slower-
        // polled source) - preempt whatever's active rather than only
        // checking when nothing is showing yet.
        if (xpStatus?.pending_level_up) {
            if (active !== 'level_up') setActive('level_up');
            return;
        }
        if (active) return;
        if (!checkedDaily) return;
        if (dailyLoginXp != null && !hasShownToday('daily_login')) {
            setActive('daily_login');
            return;
        }
        if (streak && streak.current_streak >= 1 && streak.current_streak < streak.target_days && !hasShownToday('streak_progress')) {
            setActive('streak_progress');
        }
    }, [isPlayer, active, xpStatus, checkedDaily, dailyLoginXp, streak]);

    if (!isPlayer) return null;

    if (active === 'level_up' && xpStatus?.pending_level_up) {
        return <LevelUpModal pendingLevelUp={xpStatus.pending_level_up} onDismissed={() => setActive(null)} />;
    }
    if (active === 'daily_login' && dailyLoginXp != null) {
        return <DailyLoginModal xpValue={dailyLoginXp} onDismissed={() => setActive(null)} />;
    }
    if (active === 'streak_progress' && streak) {
        return <StreakProgressModal streak={streak} onDismissed={() => setActive(null)} />;
    }
    return null;
}
