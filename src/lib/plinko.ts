import { apiClient } from '@/lib/api';
import { FreeDropConfig, PlinkoConfig, PlinkoRiskLevel, PlinkoRound, PlinkoRows, PlinkoWager } from '@/types';

export const plinkoApi = {
    getConfig(): Promise<PlinkoConfig> {
        return apiClient.get<PlinkoConfig>('/api/plinko/config/');
    },

    play(payload: { rows: PlinkoRows; risk_level: PlinkoRiskLevel; wager_amount: PlinkoWager }): Promise<PlinkoRound> {
        return apiClient.post<PlinkoRound>('/api/plinko/play/', payload);
    },

    getHistory(): Promise<PlinkoRound[]> {
        return apiClient.get<PlinkoRound[]>('/api/plinko/history/');
    },

    getFreeDropConfig(): Promise<FreeDropConfig> {
        return apiClient.get<FreeDropConfig>('/api/plinko/free-drop/config/');
    },

    playFreeDrop(payload: { rows: PlinkoRows; risk_level: PlinkoRiskLevel; wager_amount: PlinkoWager; drop_position: number }): Promise<PlinkoRound> {
        return apiClient.post<PlinkoRound>('/api/plinko/free-drop/play/', payload);
    },
};
