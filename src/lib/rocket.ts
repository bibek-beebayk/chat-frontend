import { apiClient } from '@/lib/api';
import { RocketConfig, RocketHistoryItem, RocketRoundState } from '@/types';

export const rocketApi = {
    getConfig(): Promise<RocketConfig> {
        return apiClient.get<RocketConfig>('/api/rocket/config/');
    },

    play(payload: { wager_amount: number; auto_cashout_multiplier?: number; client_request_id?: string }): Promise<RocketRoundState> {
        return apiClient.post<RocketRoundState>('/api/rocket/play/', payload);
    },

    getCurrent(): Promise<RocketRoundState | null> {
        return apiClient.get<RocketRoundState | null>('/api/rocket/current/');
    },

    cashOut(): Promise<RocketRoundState> {
        return apiClient.post<RocketRoundState>('/api/rocket/cashout/', {});
    },

    getHistory(): Promise<RocketHistoryItem[]> {
        return apiClient.get<RocketHistoryItem[]>('/api/rocket/history/');
    },
};
