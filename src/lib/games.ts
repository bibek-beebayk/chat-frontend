import { apiClient } from '@/lib/api';
import { Game, PlayerGameStats } from '@/types';

export const gamesApi = {
    list(): Promise<Game[]> {
        return apiClient.get<Game[]>('/api/games/');
    },

    getStats(range: 'all' | 'week' | 'month' = 'all'): Promise<PlayerGameStats> {
        return apiClient.get<PlayerGameStats>(`/api/games/stats/?range=${range}`);
    },
};
