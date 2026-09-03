import { apiClient } from '@/lib/api';
import { Achievement, ChallengePeriod, DailyProgressItem, RankTiersResponse, XpStatus } from '@/types';

export const xpApi = {
    getStatus(): Promise<XpStatus> {
        return apiClient.get<XpStatus>('/api/xp/status/');
    },

    getDailyProgress(): Promise<DailyProgressItem[]> {
        return apiClient.get<DailyProgressItem[]>('/api/xp/daily-progress/');
    },

    getAchievements(): Promise<Achievement[]> {
        return apiClient.get<Achievement[]>('/api/xp/achievements/');
    },

    getRankTiers(): Promise<RankTiersResponse> {
        return apiClient.get<RankTiersResponse>('/api/xp/rank-tiers/');
    },

    acknowledgeLevelUp(): Promise<XpStatus> {
        return apiClient.post<XpStatus>('/api/xp/acknowledge-level-up/', {});
    },
};

const PERIOD_BADGE: Record<ChallengePeriod, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    event: 'Limited Time',
};

/** Short label for a period badge/pill next to a challenge tile. */
export function challengePeriodLabel(period: ChallengePeriod): string {
    return PERIOD_BADGE[period];
}

/**
 * A short "resets in 4h" / "ends in 3d" countdown, driven entirely by
 * `period` + `resets_at` off the API - never by the challenge's slug. This
 * is what lets a brand-new weekly or event challenge (created purely in
 * Django admin) render a correct countdown with no matching frontend
 * change: the period type, not the specific challenge, decides the wording.
 */
export function describeChallengeTiming(period: ChallengePeriod, resetsAt: string, now: Date = new Date()): string {
    const msRemaining = new Date(resetsAt).getTime() - now.getTime();
    if (msRemaining <= 0) return period === 'event' ? 'Ending soon' : 'Resetting soon';

    const totalMinutes = Math.floor(msRemaining / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const verb = period === 'event' ? 'Ends' : 'Resets';
    if (days >= 1) return `${verb} in ${days}d ${hours}h`;
    if (hours >= 1) return `${verb} in ${hours}h ${minutes}m`;
    return `${verb} in ${minutes}m`;
}
