import { apiClient } from '@/lib/api';
import { StreakRedemptionRequest } from '@/types';

export interface ScratchRedemptionPayload {
    source: string;
    amount: string;
    reward_id: string;
    expires: string;
    signature: string;
    hi_rollin_username: string;
    query_params: Record<string, string>;
}

export const scratchRedemptionsApi = {
    create(payload: ScratchRedemptionPayload): Promise<StreakRedemptionRequest> {
        return apiClient.post<StreakRedemptionRequest>('/api/rewards/scratch-redemptions/', payload);
    },
};
