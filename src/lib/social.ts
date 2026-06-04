import { apiClient } from '@/lib/api';
import { ConnectionSearchResult, Room, SocialConnection, User } from '@/types';

type SearchSection = 'all' | 'connected' | 'not_connected';

export type SocialOnboardingState = {
    has_seen_agent_suggestions: boolean;
    has_seen_player_suggestions: boolean;
    has_completed_social_onboarding: boolean;
    completed_at?: string | null;
    onboarding_version?: number;
};

export function hasCompletedSocialOnboarding(state: Partial<SocialOnboardingState> | null | undefined): boolean {
    if (!state) return false;
    const value = (state as Record<string, unknown>).has_completed_social_onboarding;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    if (typeof value === 'number') return value === 1;
    return false;
}

export const socialApi = {
    async fetchOnboardingState(): Promise<SocialOnboardingState> {
        return apiClient.get<SocialOnboardingState>('/api/social/onboarding/state/');
    },

    async updateOnboardingState(payload: Partial<SocialOnboardingState>): Promise<SocialOnboardingState> {
        return apiClient.patch<SocialOnboardingState>('/api/social/onboarding/state/', payload);
    },

    async fetchSuggestedAgents(): Promise<User[]> {
        return apiClient.get<User[]>('/api/social/suggestions/agents/');
    },

    async fetchSuggestedPlayers(): Promise<User[]> {
        return apiClient.get<User[]>('/api/social/suggestions/players/');
    },

    async fetchConnections(): Promise<SocialConnection[]> {
        return apiClient.get<SocialConnection[]>('/api/social/connections/');
    },

    async searchAgents(params: { query?: string; section?: SearchSection; limit?: number; offset?: number }): Promise<ConnectionSearchResult> {
        const queryParts = buildSearchParams(params);
        return apiClient.get<ConnectionSearchResult>(`/api/social/connections/search/agents/?${queryParts}`);
    },

    async searchPlayers(params: { query?: string; section?: SearchSection; limit?: number; offset?: number }): Promise<ConnectionSearchResult> {
        const queryParts = buildSearchParams(params);
        return apiClient.get<ConnectionSearchResult>(`/api/social/connections/search/players/?${queryParts}`);
    },

    async fetchPublicProfile(userId: number): Promise<User> {
        return apiClient.get<User>(`/api/social/profiles/${userId}/`);
    },

    async createConnection(targetUserId: number, options?: { initiatedFromOnboarding?: boolean }): Promise<SocialConnection> {
        return apiClient.post<SocialConnection>('/api/social/connections/create/', {
            target_user_id: targetUserId,
            initiated_from_onboarding: options?.initiatedFromOnboarding === true,
        });
    },

    async disconnectConnection(targetUserId: number): Promise<void> {
        await apiClient.post('/api/social/connections/disconnect/', {
            target_user_id: targetUserId,
        });
    },

    async acceptConnection(connectionId: number): Promise<SocialConnection> {
        return apiClient.post<SocialConnection>(`/api/social/connections/${connectionId}/accept/`, {});
    },

    async rejectConnection(connectionId: number): Promise<SocialConnection> {
        return apiClient.post<SocialConnection>(`/api/social/connections/${connectionId}/reject/`, {});
    },

    async startDirectChat(target: User): Promise<Room> {
        if (target.user_type === 'agent') {
            return apiClient.post<Room>('/api/rooms/direct/start/', { agent_id: target.id });
        }
        return apiClient.post<Room>('/api/rooms/direct/player/start/', { player_id: target.id });
    },
};

function buildSearchParams(params: { query?: string; section?: SearchSection; limit?: number; offset?: number }): string {
    const search = new URLSearchParams();
    search.set('section', params.section || 'all');
    search.set('limit', String(params.limit ?? 10));
    search.set('offset', String(params.offset ?? 0));
    const q = params.query?.trim();
    if (q) {
        search.set('q', q);
    }
    return search.toString();
}

export function resolveProfileImageUrl(user?: Pick<User, 'profile_thumbnail' | 'avatar' | 'profile_picture'> | null): string | null {
    if (!user) return null;
    const raw = (user.profile_thumbnail || user.avatar || user.profile_picture || '').trim();
    if (!raw) return null;
    return raw;
}

export function getPendingConnectionBuckets(connections: SocialConnection[], currentUserId: number): {
    incoming: SocialConnection[];
    outgoing: SocialConnection[];
} {
    const incoming: SocialConnection[] = [];
    const outgoing: SocialConnection[] = [];

    for (const connection of connections) {
        if (connection.status !== 'pending') continue;
        if (connection.receiver.id === currentUserId) {
            incoming.push(connection);
        } else if (connection.requester.id === currentUserId) {
            outgoing.push(connection);
        }
    }

    const byDateDesc = (a: SocialConnection, b: SocialConnection) => {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return bDate - aDate;
    };

    incoming.sort(byDateDesc);
    outgoing.sort(byDateDesc);

    return { incoming, outgoing };
}
