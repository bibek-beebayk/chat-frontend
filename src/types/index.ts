// User types
export type UserType = 'player' | 'agent' | 'staff';

export interface User {
    id: number;
    username: string;
    user_type: UserType;
    email?: string;
    first_name?: string;
    last_name?: string;
}

// Room types
export interface Room {
    id: number;
    name: string;
    staff_assigned?: User;
    client?: User;
    created_at: string;
    is_active: boolean;
    participant_count?: number;
    unread_count?: number;
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

// Message types
export interface Message {
    id: number;
    room: number;
    sender: User;
    content: string;
    attachment?: string;
    timestamp: string;
    is_read: boolean;
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
    type: 'chat_message' | 'user_join' | 'user_leave' | 'typing';
    message?: string;
    username?: string;
    user_id?: number;
    message_id?: number;
    timestamp?: string;
    attachment?: string;
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
