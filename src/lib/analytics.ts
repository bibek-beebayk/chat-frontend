import { apiClient } from '@/lib/api';
import { ActivityEvent, AnalyticsDashboard, AnalyticsTrackInput, HomeStats, UserType } from '@/types';


export const analyticsApi = {
    getHomeStats(): Promise<HomeStats> {
        return apiClient.get<HomeStats>('/api/analytics/home-stats/');
    },

    getRecentActivity(limit = 6): Promise<ActivityEvent[]> {
        return apiClient.get<ActivityEvent[]>(`/api/analytics/recent-activity/?limit=${limit}`);
    },

    track(input: AnalyticsTrackInput): Promise<{ tracked: boolean }> {
        return apiClient.post<{ tracked: boolean }>('/api/analytics/track/', input, { skipAuth: true });
    },

    getDashboard(params: { days?: number; userType?: UserType | ''; eventType?: string } = {}): Promise<AnalyticsDashboard> {
        const query = new URLSearchParams();
        if (params.days) query.set('days', String(params.days));
        if (params.userType) query.set('user_type', params.userType);
        if (params.eventType) query.set('event_type', params.eventType);
        const suffix = query.toString() ? `?${query.toString()}` : '';
        return apiClient.get<AnalyticsDashboard>(`/api/analytics/dashboard/${suffix}`);
    },
};
