import { apiClient } from '@/lib/api';
import { Event } from '@/types';


export const eventsApi = {
    listUpcoming(limit = 3): Promise<Event[]> {
        return apiClient.get<Event[]>(`/api/events/upcoming/?limit=${limit}`);
    },
};
