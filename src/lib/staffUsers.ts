import { apiClient } from '@/lib/api';
import { StaffUsersResponse, UserType } from '@/types';

export type StaffUserStatusFilter = '' | 'active' | 'inactive' | 'verified' | 'unverified' | 'test';

export interface StaffUserListParams {
    userType?: UserType | '';
    status?: StaffUserStatusFilter;
    search?: string;
    limit?: number;
    offset?: number;
}

export const staffUsersApi = {
    list(params: StaffUserListParams = {}): Promise<StaffUsersResponse> {
        const query = new URLSearchParams();

        if (params.userType) {
            query.set('user_type', params.userType);
        }
        if (params.status) {
            query.set('status', params.status);
        }
        if (params.search?.trim()) {
            query.set('search', params.search.trim());
        }
        if (params.limit) {
            query.set('limit', String(params.limit));
        }
        if (params.offset) {
            query.set('offset', String(params.offset));
        }

        const suffix = query.toString() ? `?${query.toString()}` : '';
        return apiClient.get<StaffUsersResponse>(`/api/auth/users/${suffix}`);
    },
};
