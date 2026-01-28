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

// Room types
export interface Room {
    id: number;
    name: string;
    current_handler?: User;
    client?: User;
    created_at: string;
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
    message_id?: number;
    timestamp?: string;
    attachment?: string;
    is_edited?: boolean;
    edited_at?: string;
    is_pinned?: boolean;
    is_deleted?: boolean;
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
