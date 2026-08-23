import { apiClient } from '@/lib/api';
import { Story, StoryGroup } from '@/types';

export const storiesApi = {
    list(): Promise<StoryGroup[]> {
        return apiClient.get<StoryGroup[]>('/api/stories/');
    },

    create(media: File, caption?: string): Promise<Story> {
        const formData = new FormData();
        formData.append('media', media);
        if (caption) formData.append('caption', caption);
        return apiClient.postFormData<Story>('/api/stories/', formData);
    },

    markViewed(storyId: number): Promise<void> {
        return apiClient.post<void>(`/api/stories/${storyId}/view/`, {});
    },

    delete(storyId: number): Promise<void> {
        return apiClient.delete<void>(`/api/stories/${storyId}/`);
    },
};
