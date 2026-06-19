import { apiClient } from '@/lib/api';
import { FAQ } from '@/types';

function unwrapList(data: FAQ[] | { results: FAQ[] }): FAQ[] {
    return Array.isArray(data) ? data : data.results || [];
}

export const faqApi = {
    async list(params: { category?: string; search?: string } = {}): Promise<FAQ[]> {
        const query = new URLSearchParams();

        if (params.category && params.category !== 'all') {
            query.set('category', params.category);
        }

        if (params.search?.trim()) {
            query.set('search', params.search.trim());
        }

        const suffix = query.toString() ? `?${query.toString()}` : '';
        const data = await apiClient.get<FAQ[] | { results: FAQ[] }>(`/api/faqs/${suffix}`);
        return unwrapList(data);
    },

    async listFeatured(): Promise<FAQ[]> {
        const data = await apiClient.get<FAQ[] | { results: FAQ[] }>('/api/faqs/featured/');
        return unwrapList(data);
    },

    async getById(id: number): Promise<FAQ> {
        return apiClient.get<FAQ>(`/api/faqs/${id}/`);
    },
};
