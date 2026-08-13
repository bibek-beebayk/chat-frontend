import { apiClient } from '@/lib/api';
import { PointsBalance, PointsLedgerEntry, PointsRedemptionRequest, PointsRedemptionStatus } from '@/types';

function unwrapList(data: PointsRedemptionRequest[] | { results: PointsRedemptionRequest[] }): PointsRedemptionRequest[] {
    return Array.isArray(data) ? data : data.results || [];
}

export const pointsApi = {
    getBalance(): Promise<PointsBalance> {
        return apiClient.get<PointsBalance>('/api/points/balance/');
    },

    getLedger(): Promise<PointsLedgerEntry[]> {
        return apiClient.get<PointsLedgerEntry[]>('/api/points/ledger/');
    },

    requestRedemption(payload: { points_amount: number; reward_description?: string; note?: string }): Promise<PointsRedemptionRequest> {
        return apiClient.post<PointsRedemptionRequest>('/api/points/redeem/', payload);
    },

    async listRedemptions(status?: PointsRedemptionStatus): Promise<PointsRedemptionRequest[]> {
        const params = new URLSearchParams();
        if (status) {
            params.set('status', status);
        }
        const suffix = params.toString() ? `?${params.toString()}` : '';
        const data = await apiClient.get<PointsRedemptionRequest[] | { results: PointsRedemptionRequest[] }>(`/api/points/redemptions/${suffix}`);
        return unwrapList(data);
    },

    updateRedemption(id: number, payload: { status: PointsRedemptionStatus; staff_note?: string }): Promise<PointsRedemptionRequest> {
        return apiClient.patch<PointsRedemptionRequest>(`/api/points/redemptions/${id}/`, payload);
    },
};
