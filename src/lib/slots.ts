import { apiClient } from '@/lib/api';
import { SlotConfig, SlotRound } from '@/types';

export const slotsApi = {
    getConfig(): Promise<SlotConfig> {
        return apiClient.get<SlotConfig>('/api/slots/config/');
    },

    play(payload: { wager: number; client_request_id?: string }): Promise<SlotRound> {
        return apiClient.post<SlotRound>('/api/slots/play/', payload);
    },

    getHistory(): Promise<SlotRound[]> {
        return apiClient.get<SlotRound[]>('/api/slots/history/');
    },
};
