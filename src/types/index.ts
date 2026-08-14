// User types
export type UserType = 'player' | 'agent' | 'staff';

export interface User {
    id: number;
    username: string;
    user_type: UserType;
    is_verified?: boolean;
    verification_status?: 'pending' | 'approved' | 'rejected' | 'none';
    email?: string;
    external_user_id?: string | null;
    first_name?: string;
    last_name?: string;
    avatar?: string | null;
    profile_picture?: string | null;
    profile_thumbnail?: string | null;
    has_usable_password?: boolean;
    needs_username_setup?: boolean;
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
    is_active?: boolean;
    is_staff?: boolean;
    is_superuser?: boolean;
    is_test_user?: boolean;
    last_login?: string | null;
}

export interface StaffUsersMeta {
    count: number;
    limit: number;
    offset: number;
    has_more: boolean;
}

export interface StaffUsersStats {
    total: number;
    players: number;
    agents: number;
    staff: number;
    active: number;
    verified: number;
    test: number;
}

export interface StaffUsersResponse {
    results: User[];
    meta: StaffUsersMeta;
    stats: StaffUsersStats;
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
    // Backend EventSerializer already returns these; previously unused/untyped on the frontend.
    base_prize_pool?: string;
    prize_increment?: string;
    max_prize_pool?: string;
    current_prize_pool?: string;
    participants_count?: number;
}

export type PresenceStatus = 'ONLINE' | 'IDLE' | 'OFFLINE' | 'DISCONNECTED';

// Only the connections API enriches a nested user with presence - the base
// User type deliberately does not carry this, matching the backend's
// scoped ConnectionUserSerializer (not a change to the shared UserSerializer).
export interface UserWithPresence extends User {
    presence_status: PresenceStatus;
}

export interface ConnectionWithPresence extends Omit<SocialConnection, 'requester' | 'receiver'> {
    requester: UserWithPresence;
    receiver: UserWithPresence;
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
    is_published: boolean;
    published_at?: string | null;
    created_by?: User | null;
    created_at: string;
    updated_at: string;
}

export type FAQCategory = 'general' | 'account' | 'community' | 'rewards' | 'events' | 'security' | 'technical' | string;
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
    is_published: boolean;
    published_at?: string | null;
    created_by?: User | null;
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
export type RedemptionSource = 'login_streak' | 'scratch_bonus' | 'win_bonus' | string;

export interface LoginStreakEntry {
    id: number;
    login_date: string;
    created_at: string;
}

export interface StreakVerificationSummary {
    target_days: number;
    record_count: number;
    is_consecutive: boolean;
    start_date?: string | null;
    end_date?: string | null;
}

export interface StreakRedemptionRequest {
    id: number;
    user: User;
    source: RedemptionSource;
    source_label?: string;
    amount: string;
    hi_rollin_username?: string;
    status: StreakRedemptionStatus;
    status_label?: string;
    note?: string;
    staff_note?: string;
    source_payload?: Record<string, unknown>;
    reviewed_by?: User | null;
    reviewed_at?: string | null;
    completed_at?: string | null;
    created_at: string;
    updated_at: string;
    verification_entries?: LoginStreakEntry[];
    verification_summary?: StreakVerificationSummary;
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
    last_redemption_request?: StreakRedemptionRequest | null;
    last_scratch_redemption_request?: StreakRedemptionRequest | null;
    last_win_redemption_request?: StreakRedemptionRequest | null;
}

export interface HomeStats {
    active_members: number;
    online_now: number;
    redeemable_bonuses: number;
    active_events: number;
}

export type PointsRedemptionStatus = 'pending' | 'approved' | 'completed' | 'rejected' | string;

export interface PointAction {
    id: number;
    slug: string;
    label: string;
    points_value: number;
    is_active: boolean;
    description?: string;
    max_awards_per_day?: number | null;
}

export interface PointsBalance {
    // Decimal fields serialize as strings (DRF DecimalField default) to
    // preserve precision - parse with Number() before display/arithmetic.
    balance: string;
    lifetime_earned: number;
    active_redemption_request?: PointsRedemptionRequest | null;
    updated_at: string;
}

export interface PointsEarnAction {
    slug: string;
    label: string;
    points_value: number;
    description: string;
}

export interface PointsInfo {
    min_redemption_points: number;
    rp_to_credit_rate: string;
    earn_actions: PointsEarnAction[];
}

export type RankSlug = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'rollin_elite';

export interface XpStatus {
    total_xp: number;
    rank: RankSlug;
    rank_label: string;
    rank_min_xp: number;
    next_rank: RankSlug | null;
    next_rank_xp: number | null;
    xp_to_next_rank: number;
    rank_progress_percent: number;
    updated_at: string;
}

export interface DailyProgressItem {
    slug: string;
    label: string;
    xp_value: number;
    target_count: number;
    current_count: number;
    completed: boolean;
}

// Discriminated union (not a fixed tuple) so PromoCarousel stays reusable
// for future promo types (e.g. referrals) without a refactor.
export type PromoCard =
    | { kind: 'challenge'; slug: string; label: string; current: number; target: number; xpValue: number; href: string }
    | { kind: 'streak'; currentStreak: number; targetDays: number; rewardAmount: number; href: string }
    | { kind: 'static'; title: string; body: string; ctaLabel?: string; href?: string };

export interface PointsLedgerEntry {
    id: number;
    entry_type: string;
    delta: string;
    balance_after: string;
    action?: PointAction | null;
    note?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
}

export interface PointsRedemptionRequest {
    id: number;
    user: User;
    points_amount: number;
    reward_description?: string;
    status: PointsRedemptionStatus;
    status_label?: string;
    note?: string;
    staff_note?: string;
    reviewed_by?: User | null;
    reviewed_at?: string | null;
    completed_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Game {
    id: number;
    name: string;
    slug: string;
    description?: string;
    is_active: boolean;
}

export type PlinkoRows = 8 | 12 | 16;
export type PlinkoRiskLevel = 'low' | 'medium' | 'high';

export type PlinkoWager = 5 | 10;

export type PlinkoMode = 'classic' | 'free_drop';

export interface PlinkoConfig {
    rows_options: PlinkoRows[];
    risk_options: PlinkoRiskLevel[];
    multipliers: Record<string, Record<PlinkoRiskLevel, number[]>>;
    wager_options: PlinkoWager[];
}

// Same shape as PlinkoConfig today (rows_options currently [8] for both
// modes), kept as its own type since Free Drop's rows/multiplier options
// are backed by a separate backend table and may diverge later.
export type FreeDropConfig = PlinkoConfig;

export interface PlinkoRound {
    id: number;
    mode: PlinkoMode;
    rows: PlinkoRows;
    risk_level: PlinkoRiskLevel;
    wager_amount: number;
    slot_index: number;
    multiplier: string;
    // Decimal - serializes as a string, parse with Number() before display/arithmetic.
    payout_amount: string;
    path: number[];
    drop_offset: number;
    // Free Drop only - the normalized [-1, 1] horizontal position the
    // player chose before dropping. null for Classic rounds.
    drop_position: number | null;
    // Free Drop only - the server-selected deterministic physics seed used
    // to spawn/replay the Matter.js ball at drop_position. null for Classic.
    physics_seed: number | null;
    balance_after: string;
    created_at: string;
}

export interface ActivityEvent {
    id: number;
    kind: 'account' | 'post' | 'comment' | 'event' | 'reward' | string;
    actor: Pick<User, 'id' | 'username' | 'avatar' | 'profile_picture' | 'profile_thumbnail'> | null;
    action: string;
    target_title: string;
    target_url: string;
    created_at: string;
}

export type AnalyticsEventType = 'page_view' | 'register' | 'login' | 'logout' | 'redemption' | 'event_registration' | 'custom' | string;

export interface AnalyticsTrackInput {
    event_type: AnalyticsEventType;
    event_name?: string;
    path?: string;
    full_path?: string;
    referrer?: string;
    anonymous_id?: string;
    session_id?: string;
    source?: string;
    medium?: string;
    campaign?: string;
    metadata?: Record<string, unknown>;
}

export interface AnalyticsBucket {
    label: string;
    count: number;
}

export interface AnalyticsTrendPoint {
    date: string;
    visits: number;
    registrations: number;
    logins: number;
}

export interface AnalyticsRecentEvent {
    id: number;
    event_type: AnalyticsEventType;
    event_name: string;
    user: Pick<User, 'id' | 'username' | 'user_type'> | null;
    user_type: string;
    path: string;
    source: string;
    device_type: string;
    browser: string;
    country: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

export interface AnalyticsDashboard {
    range: {
        start: string;
        end: string;
        days: number;
    };
    kpis: {
        visits: number;
        unique_visitors: number;
        registrations: number;
        logins: number;
        registration_rate: number;
        visit_change_percent: number;
    };
    trends: AnalyticsTrendPoint[];
    user_types: AnalyticsBucket[];
    event_types: AnalyticsBucket[];
    top_pages: AnalyticsBucket[];
    traffic_sources: AnalyticsBucket[];
    devices: AnalyticsBucket[];
    browsers: AnalyticsBucket[];
    locations: AnalyticsBucket[];
    recent_events: AnalyticsRecentEvent[];
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
