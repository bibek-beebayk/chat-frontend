import { apiClient } from '@/lib/api';
import { Announcement } from '@/types';

export interface AnnouncementInput {
    title: string;
    summary?: string;
    content?: string;
    category: string;
    audience: string;
    priority: string;
    is_pinned: boolean;
    is_published: boolean;
    cover_image?: File | null;
}

function unwrapList(data: Announcement[] | { results: Announcement[] }): Announcement[] {
    return Array.isArray(data) ? data : data.results || [];
}

function buildAnnouncementFormData(input: AnnouncementInput): FormData {
    const formData = new FormData();
    formData.append('title', input.title);
    formData.append('summary', input.summary || '');
    formData.append('content', input.content || '');
    formData.append('category', input.category);
    formData.append('audience', input.audience);
    formData.append('priority', input.priority);
    formData.append('is_pinned', String(input.is_pinned));
    formData.append('is_published', String(input.is_published));
    if (input.cover_image) {
        formData.append('cover_image', input.cover_image);
    }
    return formData;
}

export const announcementApi = {
    async list(): Promise<Announcement[]> {
        const data = await apiClient.get<Announcement[] | { results: Announcement[] }>('/api/announcements/');
        return unwrapList(data);
    },

    async listManage(): Promise<Announcement[]> {
        const data = await apiClient.get<Announcement[] | { results: Announcement[] }>('/api/announcements/manage/');
        return unwrapList(data);
    },

    async listPinned(): Promise<Announcement[]> {
        const data = await apiClient.get<Announcement[] | { results: Announcement[] }>('/api/announcements/pinned/');
        return unwrapList(data);
    },

    async getById(id: number): Promise<Announcement> {
        return apiClient.get<Announcement>(`/api/announcements/${id}/`);
    },

    create(input: AnnouncementInput): Promise<Announcement> {
        return apiClient.postFormData<Announcement>('/api/announcements/', buildAnnouncementFormData(input));
    },

    update(id: number, input: AnnouncementInput): Promise<Announcement> {
        return apiClient.patchFormData<Announcement>(`/api/announcements/${id}/`, buildAnnouncementFormData(input));
    },

    delete(id: number): Promise<void> {
        return apiClient.delete<void>(`/api/announcements/${id}/`);
    },
};
