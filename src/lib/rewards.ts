import { apiClient } from '@/lib/api';
import { LoginStreakStatus, RedemptionSource, StreakRedemptionRequest, StreakRedemptionStatus } from '@/types';

function unwrapList(data: StreakRedemptionRequest[] | { results: StreakRedemptionRequest[] }): StreakRedemptionRequest[] {
    return Array.isArray(data) ? data : data.results || [];
}

export const rewardsApi = {
    getStreak(): Promise<LoginStreakStatus> {
        return apiClient.get<LoginStreakStatus>('/api/rewards/streak/');
    },

    recordVisit(): Promise<LoginStreakStatus> {
        return apiClient.post<LoginStreakStatus>('/api/rewards/streak/visit/', {});
    },

    requestRedemption(payload: { hi_rollin_username: string; note?: string }): Promise<StreakRedemptionRequest> {
        return apiClient.post<StreakRedemptionRequest>('/api/rewards/streak/redeem/', payload);
    },

    async listRedemptions(status?: StreakRedemptionStatus, source?: RedemptionSource): Promise<StreakRedemptionRequest[]> {
        const params = new URLSearchParams();
        if (status) {
            params.set('status', status);
        }
        if (source) {
            params.set('source', source);
        }
        const suffix = params.toString() ? `?${params.toString()}` : '';
        const data = await apiClient.get<StreakRedemptionRequest[] | { results: StreakRedemptionRequest[] }>(`/api/rewards/streak/redemptions/${suffix}`);
        return unwrapList(data);
    },

    updateRedemption(id: number, payload: { status: StreakRedemptionStatus; staff_note?: string }): Promise<StreakRedemptionRequest> {
        return apiClient.patch<StreakRedemptionRequest>(`/api/rewards/streak/redemptions/${id}/`, payload);
    },
};
