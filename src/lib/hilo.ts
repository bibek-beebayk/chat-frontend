import { apiClient } from '@/lib/api';
import {
    HiLoConfig,
    HiLoDirection,
    HiLoHistoryItem,
    HiLoPredictResponse,
    HiLoRoundState,
    HiLoStats,
} from '@/types';

export const hiloApi = {
    getConfig(): Promise<HiLoConfig> {
        return apiClient.get<HiLoConfig>('/api/hilo/config/');
    },

    play(payload: { wager_amount: number; client_request_id?: string }): Promise<HiLoRoundState> {
        return apiClient.post<HiLoRoundState>('/api/hilo/play/', payload);
    },

    getCurrent(): Promise<HiLoRoundState | null> {
        return apiClient.get<HiLoRoundState | null>('/api/hilo/current/');
    },

    // step_index is the round's current steps_taken - the server rejects a
    // stale one rather than drawing a second card for the same face-up card.
    predict(payload: { prediction: HiLoDirection; step_index: number }): Promise<HiLoPredictResponse> {
        return apiClient.post<HiLoPredictResponse>('/api/hilo/predict/', payload);
    },

    cashOut(): Promise<HiLoRoundState> {
        return apiClient.post<HiLoRoundState>('/api/hilo/cashout/', {});
    },

    getHistory(): Promise<HiLoHistoryItem[]> {
        return apiClient.get<HiLoHistoryItem[]>('/api/hilo/history/');
    },

    getStats(): Promise<HiLoStats> {
        return apiClient.get<HiLoStats>('/api/hilo/stats/');
    },
};
