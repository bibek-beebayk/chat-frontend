import { apiClient } from '@/lib/api';
import { Post, PostComment, Room } from '@/types';

const POST_SHARE_PREFIX = 'POST_SHARE::';

export interface SharePostPayload {
    post_id: number;
    title: string;
    excerpt: string;
    post_url: string;
    image_url?: string | null;
    author_username?: string;
}

export interface ShareToChatsResult {
    shared_to_count: number;
    shared_room_ids: number[];
    denied_room_ids: number[];
}

export interface ShareableRoom extends Room {
    display_name: string;
    subtitle: string;
    avatar_url: string | null;
}

export interface CreateOrUpdatePostInput {
    title: string;
    content: string;
    visibility: 'public' | 'private' | 'connections';
    newImages?: File[];
    removeImageIds?: number[];
}

export const postApi = {
    async listPinned(): Promise<Post[]> {
        const data = await apiClient.get<Post[] | { results: Post[] }>('/api/posts/');
        return Array.isArray(data) ? data : data.results || [];
    },

    async listFeed(options?: { limit?: number }): Promise<Post[]> {
        const suffix = options?.limit ? `?limit=${options.limit}` : '';
        const data = await apiClient.get<Post[] | { results: Post[] }>(`/api/posts/feed/${suffix}`);
        return Array.isArray(data) ? data : data.results || [];
    },

    async listMine(): Promise<Post[]> {
        const data = await apiClient.get<Post[] | { results: Post[] }>('/api/posts/my-posts/');
        return Array.isArray(data) ? data : data.results || [];
    },

    async listByUser(userId: number): Promise<Post[]> {
        const data = await apiClient.get<Post[] | { results: Post[] }>(`/api/posts/feed/?author=${userId}`);
        const posts = Array.isArray(data) ? data : data.results || [];
        return posts.filter((post) => post.author?.id === userId);
    },

    async getById(id: number): Promise<Post> {
        return apiClient.get<Post>(`/api/posts/${id}/`);
    },

    async create(input: CreateOrUpdatePostInput): Promise<Post> {
        const formData = new FormData();
        formData.append('title', input.title || '');
        formData.append('raw_content', input.content || '');
        formData.append('visibility', input.visibility);

        for (const file of input.newImages || []) {
            formData.append('images', file);
        }

        return apiClient.postFormData<Post>('/api/posts/', formData);
    },

    async update(postId: number, input: CreateOrUpdatePostInput): Promise<Post> {
        const formData = new FormData();
        formData.append('title', input.title || '');
        formData.append('raw_content', input.content || '');
        formData.append('visibility', input.visibility);

        for (const file of input.newImages || []) {
            formData.append('images', file);
        }

        if ((input.removeImageIds || []).length > 0) {
            formData.append('remove_image_ids', (input.removeImageIds || []).join(','));
        }

        return apiClient.patchFormData<Post>(`/api/posts/${postId}/`, formData);
    },

    async delete(postId: number): Promise<void> {
        await apiClient.delete<void>(`/api/posts/${postId}/`);
    },

    async toggleLike(postId: number): Promise<{ liked: boolean; like_count: number }> {
        return apiClient.post<{ liked: boolean; like_count: number }>(`/api/posts/${postId}/like/`, {});
    },

    async listComments(postId: number): Promise<PostComment[]> {
        return apiClient.get<PostComment[]>(`/api/posts/${postId}/comments/`);
    },

    async createComment(postId: number, content: string, parentId?: number | null): Promise<PostComment> {
        return apiClient.post<PostComment>(`/api/posts/${postId}/comments/`, {
            content,
            parent: parentId ?? null,
        });
    },

    async updateComment(postId: number, commentId: number, content: string): Promise<PostComment> {
        return apiClient.patch<PostComment>(`/api/posts/${postId}/comments/${commentId}/`, { content });
    },

    async deleteComment(postId: number, commentId: number): Promise<{ deleted_count: number }> {
        return apiClient.delete<{ deleted_count: number }>(`/api/posts/${postId}/comments/${commentId}/`);
    },

    async shareToChats(postId: number, roomIds: number[]): Promise<ShareToChatsResult> {
        return apiClient.post<ShareToChatsResult>(`/api/posts/${postId}/share-to-chats/`, {
            room_ids: roomIds,
        });
    },

    async listShareableRooms(): Promise<ShareableRoom[]> {
        const rooms = await apiClient.get<Room[]>('/api/rooms/');
        return rooms
            .filter((room) => room.room_type !== 'support' && room.status === 'OPEN')
            .map((room) => ({
                ...room,
                display_name: getRoomDisplayName(room),
                subtitle: getRoomSubtitle(room),
                avatar_url: getRoomAvatar(room),
            }));
    },
};

export function parsePostSharePayload(rawContent: string): SharePostPayload | null {
    if (!rawContent || !rawContent.startsWith(POST_SHARE_PREFIX)) {
        return null;
    }

    const rawPayload = rawContent.slice(POST_SHARE_PREFIX.length);
    try {
        const decoded = JSON.parse(rawPayload) as SharePostPayload;
        if (!decoded || typeof decoded.post_id !== 'number') return null;
        return decoded;
    } catch {
        return null;
    }
}

function getRoomDisplayName(room: Room): string {
    if (room.room_type === 'direct_agent') {
        return room.counterpart?.username || room.name;
    }
    if (room.room_type === 'group') {
        return room.name;
    }
    return room.name;
}

function getRoomSubtitle(room: Room): string {
    if (room.room_type === 'direct_agent') {
        return room.counterpart?.user_type === 'agent' ? 'Agent chat' : 'Player chat';
    }
    if (room.room_type === 'group') {
        const memberCount = room.group_member_count || room.participant_count || 0;
        return `${memberCount} members`;
    }
    return 'Chat';
}

function getRoomAvatar(room: Room): string | null {
    if (room.counterpart) {
        return room.counterpart.profile_thumbnail || room.counterpart.avatar || room.counterpart.profile_picture || null;
    }
    if (room.client) {
        return room.client.profile_thumbnail || room.client.avatar || room.client.profile_picture || null;
    }
    return null;
}
