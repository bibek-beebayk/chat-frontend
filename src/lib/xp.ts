import { apiClient } from '@/lib/api';
import { Achievement, DailyProgressItem, XpStatus } from '@/types';

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
};

// XPAction.label (backend, xp/models.py) is free text an admin can set
// independently of challenge_target_count - editing the target count in
// Django admin does not update the label, so a naive item.label render can
// silently show a stale round count. daily_challenge_rounds is the only
// checklist item whose copy embeds a count, so its display label is built
// from the live target_count here instead of trusted verbatim from the API.
export function displayLabelForDailyProgressItem(item: DailyProgressItem): string {
    if (item.slug === 'daily_challenge_rounds') {
        return `Daily Challenge: Play ${item.target_count} Round${item.target_count === 1 ? '' : 's'}`;
    }
    return item.label;
}
