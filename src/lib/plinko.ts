import { apiClient } from '@/lib/api';
import { PlinkoConfig, PlinkoRiskLevel, PlinkoRound, PlinkoRows } from '@/types';

export const plinkoApi = {
    getConfig(): Promise<PlinkoConfig> {
        return apiClient.get<PlinkoConfig>('/api/plinko/config/');
    },

    play(payload: { rows: PlinkoRows; risk_level: PlinkoRiskLevel; wager_amount: number }): Promise<PlinkoRound> {
        return apiClient.post<PlinkoRound>('/api/plinko/play/', payload);
    },

    getHistory(): Promise<PlinkoRound[]> {
        return apiClient.get<PlinkoRound[]>('/api/plinko/history/');
    },
};
