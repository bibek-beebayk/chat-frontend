import { apiClient } from '@/lib/api';
import { PointsBalance, PointsInfo, PointsLedgerPage, PointsRedemptionRequest, PointsRedemptionStatus } from '@/types';

function unwrapList(data: PointsRedemptionRequest[] | { results: PointsRedemptionRequest[] }): PointsRedemptionRequest[] {
    return Array.isArray(data) ? data : data.results || [];
}

/** Points balances/payouts are Decimal on the backend (serialized as strings) - format consistently to 2 decimal places wherever they're displayed. */
export function formatPoints(value: number | string): string {
    return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const pointsApi = {
    getBalance(): Promise<PointsBalance> {
        return apiClient.get<PointsBalance>('/api/points/balance/');
    },

    getInfo(): Promise<PointsInfo> {
        return apiClient.get<PointsInfo>('/api/points/info/');
    },

    getLedger(params?: { limit?: number; offset?: number }): Promise<PointsLedgerPage> {
        const query = new URLSearchParams();
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.offset) query.set('offset', String(params.offset));
        const suffix = query.toString() ? `?${query.toString()}` : '';
        return apiClient.get<PointsLedgerPage>(`/api/points/ledger/${suffix}`);
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
