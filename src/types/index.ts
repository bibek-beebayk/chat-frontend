// User types
export type UserType = 'player' | 'agent' | 'staff';

export interface User {
    id: number;
    username: string;
    user_type: UserType;
    is_verified?: boolean;
    verification_status?: 'pending' | 'approved' | 'rejected' | 'none';
    email?: string;
    first_name?: string;
    last_name?: string;
    avatar?: string | null;
    profile_picture?: string | null;
    profile_thumbnail?: string | null;
    agent_availability?: 'online' | 'busy' | 'away' | 'offline' | string;
    agent_status_note?: string;
    joined_at?: string;
    headline?: string;
    connection_status?: 'self' | 'none' | 'connected' | 'pending_outgoing' | 'pending_incoming' | 'rejected' | 'blocked' | string;
    can_connect?: boolean;
    can_disconnect?: boolean;
    can_chat?: boolean;
    primary_action?: string | null;
    secondary_action?: string | null;
    is_connected?: boolean;
}

export interface SocialConnection {
    id: number;
    requester: User;
    receiver: User;
    connection_type: string;
    status: 'pending' | 'accepted' | 'rejected' | 'blocked' | string;
    initiated_from_onboarding: boolean;
    accepted_at?: string | null;
    rejected_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface ConnectionSearchMeta {
    section: 'all' | 'connected' | 'not_connected' | string;
    limit: number;
    offset: number;
    count: number;
    has_more: boolean;
}

export interface ConnectionSearchResult {
    results: User[];
    meta: ConnectionSearchMeta;
}

export interface Event {
    id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    poster: string | null;
    is_active: boolean;
    is_registered?: boolean;
    eligibility_status?: 'pending' | 'approved' | 'rejected' | null;
}

// Room types
export interface Room {
    id: number;
    name: string;
    room_type?: 'support' | 'direct_agent' | 'group' | string;
    counterpart?: User | null;
    current_handler?: User;
    client?: User;
    group_admin?: User;
    group_description?: string;
    group_member_count?: number;
    user_is_group_admin?: boolean;
    created_at: string;
    last_activity?: string;
    last_message_sender_id?: number;
    status: 'OPEN' | 'CLOSED';
    participant_count?: number;
    unread_count?: number;
    is_staff_online?: boolean;
    queue?: number;
    queue_name?: string;
    queue_type?: string;
    can_switch_station?: boolean;
    is_message_request?: boolean;
    message_request_direction?: 'incoming' | 'outgoing' | 'none' | string;
    direct_request_status?: 'pending' | 'accepted' | 'rejected' | string;
    direct_request_initiator?: User | null;
}

export interface SupportRoom {
    id: number;
    name: string;
    room_type?: 'player' | 'agent' | 'all';
    staff?: User;
    is_active: boolean;
}

export interface RoomDetail extends Room {
    participants: RoomParticipant[];
    recent_messages: Message[];
}


export interface SupportRoom {
    id: number;
    name: string;
    room_type?: 'player' | 'agent' | 'all';
    staff?: User;
    is_active: boolean;
}

export interface RoomDetail extends Room {
    participants: RoomParticipant[];
    recent_messages: Message[];
}

// Feed types
export interface Post {
    id: number;
    title: string;
    content: string;
    raw_content?: string;
    image?: string | null;
    video?: string | null;
    link?: string | null;
    visibility?: 'public' | 'private' | 'connections' | 'all' | 'players' | 'agents' | string;
    is_pinned?: boolean;
    author: User;
    images?: PostImage[];
    like_count?: number;
    comment_count?: number;
    is_liked?: boolean;
    cta_label?: string;
    cta_link?: string;
    created_at: string;
    updated_at?: string;
    is_active?: boolean;
}

export interface PostImage {
    id: number;
    image: string;
    order: number;
}

export interface PostComment {
    id: number;
    post: number;
    author: User;
    parent: number | null;
    content: string;
    replies: PostComment[];
    created_at: string;
    updated_at: string;
}

export type AnnouncementCategory = 'general' | 'event' | 'reward' | 'maintenance' | 'security' | 'vip' | string;
export type AnnouncementAudience = 'all' | 'players' | 'agents' | 'staff' | string;
export type AnnouncementPriority = 'normal' | 'important' | 'urgent' | string;

export interface Announcement {
    id: number;
    title: string;
    summary: string;
    content: string;
    cover_image?: string | null;
    category: AnnouncementCategory;
    category_label?: string;
    audience: AnnouncementAudience;
    audience_label?: string;
    priority: AnnouncementPriority;
    priority_label?: string;
    is_pinned: boolean;
    published_at?: string | null;
    created_by?: User | null;
    created_at: string;
    updated_at: string;
}

export type FAQCategory = 'account' | 'community' | 'rewards' | 'events' | 'security' | 'technical' | string;
export type FAQAudience = 'all' | 'players' | 'agents' | 'staff' | string;

export interface FAQ {
    id: number;
    question: string;
    answer: string;
    category: FAQCategory;
    category_label?: string;
    audience: FAQAudience;
    audience_label?: string;
    sort_order: number;
    is_featured: boolean;
    published_at?: string | null;
    created_at: string;
    updated_at: string;
}

// Message types
export interface Message {
    id: number;
    room: number;
    sender: User;
    content: string;
    attachment?: string;
    timestamp: string;
    is_read: boolean;
    is_edited?: boolean;
    edited_at?: string;
    is_pinned?: boolean;
    is_deleted?: boolean;
    is_broadcast?: boolean;
}

// Participant types
export interface RoomParticipant {
    id: number;
    room: number;
    user: User;
    joined_at: string;
    is_active: boolean;
}

// WebSocket message types
export interface WSMessage {
    type: 'chat_message' | 'user_join' | 'user_leave' | 'typing' | 'chat_message_update' | 'chat_message_delete' | 'chat_message_pin';
    message?: string;
    username?: string;
    user_id?: number;
    user_type?: UserType | string;
    message_id?: number;
    timestamp?: string;
    attachment?: string;
    is_edited?: boolean;
    edited_at?: string;
    is_pinned?: boolean;
    is_deleted?: boolean;
    is_broadcast?: boolean;
}

export interface GroupDiscoverItem {
    id: number;
    name: string;
    group_description?: string;
    group_admin?: string | null;
    member_count: number;
    relation: 'none' | 'pending' | 'member' | 'admin' | 'rejected' | string;
}

export interface GroupJoinRequestItem {
    id: number;
    status: 'pending' | 'approved' | 'rejected' | string;
    requested_at: string;
    reviewed_at?: string | null;
    player: User;
    room: Room;
}

export type StreakRedemptionStatus = 'pending' | 'approved' | 'completed' | 'rejected' | string;

export interface StreakRedemptionRequest {
    id: number;
    user: User;
    amount: string;
    status: StreakRedemptionStatus;
    status_label?: string;
    note?: string;
    staff_note?: string;
    reviewed_by?: User | null;
    reviewed_at?: string | null;
    completed_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface LoginStreakStatus {
    current_streak: number;
    last_login_date?: string | null;
    receivable_bonus: string;
    last_awarded_at?: string | null;
    target_days: number;
    reward_amount: string;
    days_remaining: number;
    reward_available: boolean;
    active_redemption_request?: StreakRedemptionRequest | null;
}

export interface HomeStats {
    active_members: number;
    online_now: number;
    redeemable_bonuses: number;
    active_events: number;
}

export interface ActivityEvent {
    id: number;
    kind: 'account' | 'post' | 'comment' | 'event' | 'reward' | string;
    actor: Pick<User, 'id' | 'username'> & { avatar?: string | null } | null;
    action: string;
    target_title: string;
    target_url: string;
    created_at: string;
}

// Auth types
export interface LoginData {
    username: string;
    password: string;
}

export interface RegisterData {
    username: string;
    password: string;
    confirm_password: string;
    user_type: UserType;
    email?: string;
}

// API response types
export interface APIResponse<T = any> {
    data?: T;
    message?: string;
    error?: string;
}

// Staff dashboard types
export interface StaffDashboard {
    room: Room;
    statistics: {
        total_participants: number;
        total_messages: number;
        assigned_rooms_count: number;
    };
    recent_messages: Message[];
}
