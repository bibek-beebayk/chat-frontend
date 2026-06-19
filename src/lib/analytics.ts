import { apiClient } from '@/lib/api';
import { ActivityEvent, HomeStats } from '@/types';


export const analyticsApi = {
    getHomeStats(): Promise<HomeStats> {
        return apiClient.get<HomeStats>('/api/analytics/home-stats/');
    },

    getRecentActivity(limit = 6): Promise<ActivityEvent[]> {
        return apiClient.get<ActivityEvent[]>(`/api/analytics/recent-activity/?limit=${limit}`);
    },
};
