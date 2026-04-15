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
    image?: string;
    video?: string;
    link?: string;
    author: User;
    created_at: string;
    is_active: boolean;
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
