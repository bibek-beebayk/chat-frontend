import { apiClient } from '@/lib/api';
import { DailyProgressItem, XpStatus } from '@/types';

export const xpApi = {
    getStatus(): Promise<XpStatus> {
        return apiClient.get<XpStatus>('/api/xp/status/');
    },

    getDailyProgress(): Promise<DailyProgressItem[]> {
        return apiClient.get<DailyProgressItem[]>('/api/xp/daily-progress/');
    },
};
