import { apiClient } from '@/lib/api';
import { Game } from '@/types';

export const gamesApi = {
    list(): Promise<Game[]> {
        return apiClient.get<Game[]>('/api/games/');
    },
};
