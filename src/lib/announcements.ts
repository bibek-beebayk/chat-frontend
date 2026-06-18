import { apiClient } from '@/lib/api';
import { Announcement } from '@/types';

function unwrapList(data: Announcement[] | { results: Announcement[] }): Announcement[] {
    return Array.isArray(data) ? data : data.results || [];
}

export const announcementApi = {
    async list(): Promise<Announcement[]> {
        const data = await apiClient.get<Announcement[] | { results: Announcement[] }>('/api/announcements/');
        return unwrapList(data);
    },

    async listPinned(): Promise<Announcement[]> {
        const data = await apiClient.get<Announcement[] | { results: Announcement[] }>('/api/announcements/pinned/');
        return unwrapList(data);
    },

    async getById(id: number): Promise<Announcement> {
        return apiClient.get<Announcement>(`/api/announcements/${id}/`);
    },
};
