'use client';

import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Header } from '@/components/layout/Header';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTypingThrottle } from '@/hooks/useTypingThrottle';
import { apiClient } from '@/lib/api';
import { parsePostSharePayload } from '@/lib/posts';
import { Room, Message, SupportRoom, GroupDiscoverItem, GroupJoinRequestItem, User } from '@/types';
import { MessageActionMenu } from '@/components/chat/MessageActionMenu';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import styles from './page.module.css';

interface AgentSearchResult {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    is_verified?: boolean;
    agent_availability?: 'online' | 'busy' | 'away' | 'offline' | string;
    agent_status_note?: string;
}

function ChatPageContent() {
    const { user, loading: authLoading } = useAuth();
    const { resolvedTheme } = useTheme();
    // ... rest of component logic

    const router = useRouter();
    const searchParams = useSearchParams();
    const requestedRoomIdParam = Number(searchParams.get('room_id'));
    const openParam = searchParams.get('open');

    useEffect(() => {
        if (!user || user.user_type === 'staff') return;
        if (Number.isFinite(requestedRoomIdParam)) return;
        router.replace('/chats');
    }, [requestedRoomIdParam, router, user]);
    const [supportRooms, setSupportRooms] = useState<any[]>([]);
    // Multi-room support
    const [mySupportRooms, setMySupportRooms] = useState<any[]>([]);
    // const [mySupportRoom, setMySupportRoom] = useState<any>(null); // Legacy

    // Station Browser & Menu State
    const [showStationBrowser, setShowStationBrowser] = useState(false);
    const [showQueueMenu, setShowQueueMenu] = useState(false);

    // Modal State
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [leaveAllModalOpen, setLeaveAllModalOpen] = useState(false);
    const [roomToLeave, setRoomToLeave] = useState<number | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const roomMessagesCacheRef = useRef<Record<number, Message[]>>({});
    const roomPinnedCacheRef = useRef<Record<number, Message[]>>({});
    const selectedRoomRef = useRef<number | null>(null);
    const roomLoadTokenRef = useRef(0);

    // Switch Station Modal
    const [switchModalOpen, setSwitchModalOpen] = useState(false);
    const [agentSearchOpen, setAgentSearchOpen] = useState(false);
    const [agentSearchQuery, setAgentSearchQuery] = useState('');
    const [agentSearchResults, setAgentSearchResults] = useState<AgentSearchResult[]>([]);
    const [isSearchingAgents, setIsSearchingAgents] = useState(false);
    const [agentSearchError, setAgentSearchError] = useState<string | null>(null);
    const [groupDiscoverOpen, setGroupDiscoverOpen] = useState(false);
    const [groupDiscoverQuery, setGroupDiscoverQuery] = useState('');
    const [groupDiscoverResults, setGroupDiscoverResults] = useState<GroupDiscoverItem[]>([]);
    const [isDiscoveringGroups, setIsDiscoveringGroups] = useState(false);
    const [groupDiscoverError, setGroupDiscoverError] = useState<string | null>(null);
    const [groupRequestsOpen, setGroupRequestsOpen] = useState(false);
    const [groupJoinRequests, setGroupJoinRequests] = useState<GroupJoinRequestItem[]>([]);
    const [isLoadingGroupRequests, setIsLoadingGroupRequests] = useState(false);
    const [pendingGroupRequestCount, setPendingGroupRequestCount] = useState(0);
    const [messageRequestRooms, setMessageRequestRooms] = useState<Room[]>([]);
    const [requestActionRoomId, setRequestActionRoomId] = useState<number | null>(null);
    const [createGroupOpen, setCreateGroupOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDescription, setNewGroupDescription] = useState('');
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [groupMembersOpen, setGroupMembersOpen] = useState(false);
    const [groupMembers, setGroupMembers] = useState<User[]>([]);
    const [isLoadingGroupMembers, setIsLoadingGroupMembers] = useState(false);
    const [sendingBroadcast, setSendingBroadcast] = useState(false);
    const [deleteGroupModalOpen, setDeleteGroupModalOpen] = useState(false);
    const [isDeletingGroup, setIsDeletingGroup] = useState(false);
    const [leaveGroupModalOpen, setLeaveGroupModalOpen] = useState(false);
    const [isLeavingGroup, setIsLeavingGroup] = useState(false);
    const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
    const [agentChatFilter, setAgentChatFilter] = useState<'all' | 'needs_reply' | 'unread'>('all');
    const [internalNoteOpen, setInternalNoteOpen] = useState(false);
    const [internalNoteValue, setInternalNoteValue] = useState('');
    const [isSavingInternalNote, setIsSavingInternalNote] = useState(false);
    const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
    const [quickReplies, setQuickReplies] = useState<Array<{ id: number; title: string; content: string }>>([]);
    const [isQuickRepliesLoading, setIsQuickRepliesLoading] = useState(false);
    const [quickReplyTitle, setQuickReplyTitle] = useState('');
    const [quickReplyContent, setQuickReplyContent] = useState('');
    const [isSavingQuickReply, setIsSavingQuickReply] = useState(false);
    const [showQuickReplyCreateForm, setShowQuickReplyCreateForm] = useState(false);
    const hasHydratedCacheRef = useRef(false);

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, isVisible: true });
    };

    const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]); // New State
    const [messageInput, setMessageInput] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showRoomList, setShowRoomList] = useState(true); // Default to list on mobile
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [chatSwitcherOpen, setChatSwitcherOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);

    // Audio Unlock State
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
    const storageKey = user ? `chat_page_cache_v1_${user.id}` : null;

    // Initial Audio Unlock - iOS requires user interaction to play audio
    const initAudio = () => {
        if (!isAudioUnlocked && typeof window !== 'undefined') {
            if (!audioRef.current) {
                audioRef.current = new Audio('/notification.mp3');
            }
            // Play and immediately pause to unlock logic
            audioRef.current.play().then(() => {
                audioRef.current?.pause();
                audioRef.current!.currentTime = 0;
                setIsAudioUnlocked(true);
            }).catch(e => {
                console.log("Audio unlock failed (likely waiting for interaction)", e);
            });
        }
    };

    const playNotificationSound = () => {
        if (!audioRef.current) {
            audioRef.current = new Audio('/notification.mp3');
        }
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Notification sound failed:", e));
    };

    const onEmojiClick = (emojiObject: any) => {
        setMessageInput(prev => prev + emojiObject.emoji);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                showEmojiPicker &&
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target as Node) &&
                emojiButtonRef.current &&
                !emojiButtonRef.current.contains(event.target as Node)
            ) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    useEffect(() => {
        if (!user || hasHydratedCacheRef.current || typeof window === 'undefined' || !storageKey) return;
        hasHydratedCacheRef.current = true;
        try {
            const raw = window.sessionStorage.getItem(storageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            const cachedRooms = Array.isArray(parsed?.rooms) ? parsed.rooms as Room[] : [];
            const cachedSelectedRoom = typeof parsed?.selectedRoom === 'number' ? parsed.selectedRoom as number : null;
            const cachedMessages = parsed?.roomMessagesCache && typeof parsed.roomMessagesCache === 'object'
                ? parsed.roomMessagesCache as Record<number, Message[]>
                : {};
            const cachedPinned = parsed?.roomPinnedCache && typeof parsed.roomPinnedCache === 'object'
                ? parsed.roomPinnedCache as Record<number, Message[]>
                : {};
            const cachedFilter = parsed?.agentChatFilter;

            roomMessagesCacheRef.current = cachedMessages;
            roomPinnedCacheRef.current = cachedPinned;
            if (cachedRooms.length > 0) {
                setRooms(cachedRooms);
            }
            if (cachedSelectedRoom) {
                setSelectedRoom(cachedSelectedRoom);
                setMessages(cachedMessages[cachedSelectedRoom] || []);
                setPinnedMessages(cachedPinned[cachedSelectedRoom] || []);
            } else if (cachedRooms.length > 0) {
                const firstRoomId = cachedRooms[0].id;
                setSelectedRoom(firstRoomId);
                setMessages(cachedMessages[firstRoomId] || []);
                setPinnedMessages(cachedPinned[firstRoomId] || []);
            }
            if (cachedFilter === 'all' || cachedFilter === 'needs_reply' || cachedFilter === 'unread') {
                setAgentChatFilter(cachedFilter);
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to hydrate chat cache:', error);
        }
    }, [user, storageKey]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        const applyViewport = () => setIsMobileViewport(mediaQuery.matches);
        applyViewport();
        mediaQuery.addEventListener('change', applyViewport);
        return () => mediaQuery.removeEventListener('change', applyViewport);
    }, []);

    useEffect(() => {
        if (!isMobileViewport) {
            setMobileOptionsOpen(false);
            return;
        }
        setMobileOptionsOpen(false);
    }, [isMobileViewport, selectedRoom]);

    useEffect(() => {
        if (!isMobileViewport) return;
        if (!user || user.user_type === 'staff') return;
        if (openParam !== 'list') return;

        setChatSwitcherOpen(true);
        setShowRoomList(true);

        const params = new URLSearchParams(searchParams.toString());
        params.delete('open');
        const query = params.toString();
        router.replace(`/chat${query ? `?${query}` : ''}`);
    }, [isMobileViewport, openParam, router, searchParams, user]);

    // Infinite Scroll State
    const [hasMore, setHasMore] = useState(true); // older
    const [hasMoreNewer, setHasMoreNewer] = useState(false); // newer
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const wsBaselineRef = useRef(0);

    const { sendMessage, sendJsonMessage, messages: wsMessages, isConnected } = useWebSocket(selectedRoom);
    const sendTyping = useTypingThrottle(sendJsonMessage);

    const switchToRoom = (roomId: number, updateUrlForNonStaff: boolean = true) => {
        roomLoadTokenRef.current += 1;
        selectedRoomRef.current = roomId;
        const cachedMessages = roomMessagesCacheRef.current[roomId] ?? [];
        const cachedPinned = roomPinnedCacheRef.current[roomId] ?? [];
        setSelectedRoom(roomId);
        setMessages(cachedMessages);
        setPinnedMessages(cachedPinned);
        setHasMore(true);
        setHasMoreNewer(false);
        wsBaselineRef.current = wsMessages.length;
        if (updateUrlForNonStaff && user?.user_type !== 'staff') {
            router.replace(`/chat?room_id=${roomId}`);
        }
    };

    // ... (logic)



    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageInput(e.target.value);

        if (isConnected && selectedRoom) {
            sendTyping();
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        // Upload files first if any are selected
        if (selectedFiles.length > 0 && selectedRoom) {
            try {
                setIsUploading(true);
                setUploadProgress({ current: 0, total: selectedFiles.length });

                // Upload files sequentially
                for (let i = 0; i < selectedFiles.length; i++) {
                    setUploadProgress({ current: i + 1, total: selectedFiles.length });
                    const formData = new FormData();
                    formData.append('file', selectedFiles[i]);
                    await apiClient.postFormData(`/api/rooms/${selectedRoom}/attachments/`, formData);
                }

                setSelectedFiles([]);
                setUploadProgress({ current: 0, total: 0 });
            } catch (error) {
                console.error('Upload failed:', error);
                showToast('Failed to upload files', 'error');
                setUploadProgress({ current: 0, total: 0 });
            } finally {
                setIsUploading(false);
            }
        }

        // Send text message if there is one
        if (messageInput.trim() && isConnected) {
            sendMessage(messageInput);
            setMessageInput('');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Add new files to the selected files array
        const newFiles = Array.from(files);
        setSelectedFiles(prev => [...prev, ...newFiles]);

        // Clear the input so the same file can be selected again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Message Actions State
    const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<number | null>(null);

    // Action Handlers
    const handleEditStart = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditContent(msg.content);
    };

    const handleEditCancel = () => {
        setEditingMessageId(null);
        setEditContent('');
    };

    const handleEditSave = async (messageId: number) => {
        if (!editContent.trim()) return;
        try {
            await apiClient.patch(`/api/messages/${messageId}/edit/`, { content: editContent });

            // Update messages
            setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, content: editContent, is_edited: true } : m
            ));

            // Update pinned messages if applicable
            setPinnedMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, content: editContent, is_edited: true } : m
            ));

            setEditingMessageId(null);
            setEditContent('');
        } catch (error) {
            console.error('Failed to edit message:', error);
            showToast('Failed to edit message', 'error');
        }
    };

    const handleDelete = (messageId: number) => {
        setMessageToDelete(messageId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!messageToDelete) return;

        try {
            await apiClient.delete(`/api/messages/${messageToDelete}/delete/`);

            // Update messages
            setMessages(prev => prev.map(m =>
                m.id === messageToDelete ? { ...m, is_deleted: true, content: '', attachment: undefined } : m
            ));

            // Remove from pinned if deleted
            setPinnedMessages(prev => prev.filter(m => m.id !== messageToDelete));

            setIsDeleteModalOpen(false);
            setMessageToDelete(null);
        } catch (error) {
            console.error('Failed to delete message:', error);
            showToast('Failed to delete message', 'error');
        }
    };





    const handlePin = async (messageId: number) => {
        try {
            const response = await apiClient.post(`/api/messages/${messageId}/pin/`, {});
            // Assume API returns updated message or status. Logic usually toggles.

            // Optimistically toggle for now, or fetch updated message logic
            // Let's find current status
            const msg = messages.find(m => m.id === messageId);
            if (!msg) return;

            const newIsPinned = !msg.is_pinned; // Toggle

            setMessages(prev => prev.map(m =>
                m.id === messageId ? { ...m, is_pinned: newIsPinned } : m
            ));

            if (newIsPinned) {
                // Add to pinned list (need to fetch latest or reuse msg? Reuse for now)
                setPinnedMessages(prev => [...prev, { ...msg, is_pinned: true }]);
            } else {
                setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
            }

        } catch (error) {
            console.error('Failed to pin message:', error);
            // Revert if needed, but for now just log
        }
    };

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // ... (existing code)

    const roomDisplayName = (room: Room) => {
        if (room.room_type === 'support') return 'Support Chat';
        if (room.room_type === 'direct_agent') {
            return room.counterpart?.username || 'Direct Chat';
        }
        if (room.room_type === 'group') {
            return room.name || 'Group Chat';
        }
        return room.name;
    };

    const roomSubtitle = (room: Room) => {
        if (room.room_type === 'support') {
            return room.queue_name || 'Support queue';
        }
        if (room.room_type === 'direct_agent') {
            return room.counterpart?.user_type === 'agent' ? 'Agent chat' : 'Player chat';
        }
        if (room.room_type === 'group') {
            const memberCount = room.group_member_count || room.participant_count || 0;
            const adminName = room.group_admin?.username;
            return `${memberCount} members${adminName ? ` • by ${adminName}` : ''}`;
        }
        return 'Chat';
    };

    const availabilityLabel = (availability?: string) => {
        switch (availability) {
            case 'online':
                return 'Online';
            case 'busy':
                return 'Busy';
            case 'away':
                return 'Away';
            case 'offline':
                return 'Offline';
            default:
                return 'Unknown';
        }
    };

    const availabilityColor = (availability?: string) => {
        switch (availability) {
            case 'online':
                return '#22c55e';
            case 'busy':
                return '#f59e0b';
            case 'away':
                return '#facc15';
            case 'offline':
                return '#ef4444';
            default:
                return '#94a3b8';
        }
    };

    const needsReply = (room: Room) => {
        if (!user?.id || !room.last_message_sender_id) return false;
        return room.last_message_sender_id !== user.id;
    };

    const loadQuickReplies = async () => {
        setIsQuickRepliesLoading(true);
        try {
            const data = await apiClient.get<Array<{ id: number; title: string; content: string }>>('/api/quick-replies/');
            setQuickReplies(data);
        } catch (error: any) {
            showToast(error?.message || 'Failed to load quick replies', 'error');
        } finally {
            setIsQuickRepliesLoading(false);
        }
    };

    const openQuickReplies = async () => {
        setQuickRepliesOpen(true);
        setShowQuickReplyCreateForm(false);
        setQuickReplyTitle('');
        setQuickReplyContent('');
        await loadQuickReplies();
    };

    const createQuickReply = async () => {
        const title = quickReplyTitle.trim();
        const content = quickReplyContent.trim();
        if (!title || !content) return;
        setIsSavingQuickReply(true);
        try {
            await apiClient.post('/api/quick-replies/', { title, content });
            setQuickReplyTitle('');
            setQuickReplyContent('');
            setShowQuickReplyCreateForm(false);
            await loadQuickReplies();
            showToast('Quick reply saved', 'success');
        } catch (error: any) {
            showToast(error?.message || 'Failed to save quick reply', 'error');
        } finally {
            setIsSavingQuickReply(false);
        }
    };

    const deleteQuickReply = async (id: number) => {
        try {
            await apiClient.delete(`/api/quick-replies/${id}/`);
            await loadQuickReplies();
            showToast('Quick reply removed', 'success');
        } catch (error: any) {
            showToast(error?.message || 'Failed to delete quick reply', 'error');
        }
    };

    const applyQuickReply = (content: string) => {
        setMessageInput(content);
        setQuickRepliesOpen(false);
    };

    const openInternalNote = async () => {
        if (!selectedRoom) return;
        try {
            const data = await apiClient.get<{ content?: string }>(`/api/rooms/${selectedRoom}/internal-note/`);
            setInternalNoteValue(data?.content || '');
            setInternalNoteOpen(true);
        } catch (error: any) {
            showToast(error?.message || 'Failed to load internal note', 'error');
        }
    };

    const saveInternalNote = async () => {
        if (!selectedRoom) return;
        setIsSavingInternalNote(true);
        try {
            await apiClient.patch(`/api/rooms/${selectedRoom}/internal-note/`, { content: internalNoteValue.trim() });
            setInternalNoteOpen(false);
            showToast('Internal note updated', 'success');
        } catch (error: any) {
            showToast(error?.message || 'Failed to save internal note', 'error');
        } finally {
            setIsSavingInternalNote(false);
        }
    };

    const fetchMessageRequests = async () => {
        if (!user || user.user_type === 'staff') {
            setMessageRequestRooms([]);
            return;
        }
        try {
            const data = await apiClient.get<Room[]>('/api/rooms/message-requests/');
            setMessageRequestRooms(data);
        } catch (error) {
            console.error('Error loading message requests:', error);
        }
    };

    const respondToMessageRequest = async (roomId: number, action: 'accept' | 'reject') => {
        setRequestActionRoomId(roomId);
        try {
            await apiClient.post(`/api/rooms/${roomId}/request/respond/`, { action });
            await Promise.all([fetchRooms(), fetchMessageRequests()]);
            showToast(action === 'accept' ? 'Message request accepted' : 'Message request rejected', 'success');
        } catch (error: any) {
            showToast(error?.message || 'Failed to respond to message request', 'error');
        } finally {
            setRequestActionRoomId(null);
        }
    };

    const fetchRooms = async () => {
        try {
            const roomType = searchParams.get('room_type');
            const url = roomType ? `/api/rooms/?room_type=${roomType}` : '/api/rooms/';

            const data = await apiClient.get<Room[]>(url);
            setRooms(data);
            if (data.length > 0) {
                const currentSelectedRoom = selectedRoomRef.current;
                const hasCurrentRoom = !!currentSelectedRoom && data.some((room) => room.id === currentSelectedRoom);
                const requestedRoomId = Number(searchParams.get('room_id'));
                const requestedRoom = Number.isFinite(requestedRoomId)
                    ? data.find((room) => room.id === requestedRoomId)
                    : undefined;

                if (requestedRoom) {
                    if (currentSelectedRoom !== requestedRoom.id) {
                        switchToRoom(requestedRoom.id, false);
                    }
                } else if (hasCurrentRoom) {
                    // Keep current selection.
                } else if (user?.user_type === 'staff') {
                    // Staff keeps the previous behavior of auto-picking the first available room.
                    switchToRoom(data[0].id, false);
                } else {
                    // Player/agent chat page should open as a list (no forced support chat selection).
                    setSelectedRoom(null);
                    selectedRoomRef.current = null;
                    setMessages([]);
                    setPinnedMessages([]);
                }
            } else {
                setSelectedRoom(null);
                selectedRoomRef.current = null;
                setMessages([]);
                setPinnedMessages([]);
            }
        } catch (error) {
            console.error('Error loading rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    // Looad Support Rooms (for Staff)
    useEffect(() => {
        if (user && user.user_type === 'staff') {
            const loadSupportRooms = async () => {
                try {
                    const data = await apiClient.get<any[]>('/api/support-rooms/');
                    setSupportRooms(data);
                    // Check if I am already in any rooms
                    const myRooms = data.filter(r => r.staff?.id === user.id);
                    setMySupportRooms(myRooms);
                } catch (error) {
                    console.error('Error loading support rooms:', error);
                }
            };
            loadSupportRooms();
            // Poll for updates? Or just load once.
            const interval = setInterval(loadSupportRooms, 5000); // Polling for status updates
            return () => clearInterval(interval);
        }
    }, [user]);

    // Load Chats (If Player or Staff in Support Room)
    useEffect(() => {
        if (user) {
            if (user.user_type !== 'staff' || mySupportRooms.length > 0) {
                fetchRooms();
                fetchMessageRequests();
                // set interval to refresh rooms list (new requests)
                const interval = setInterval(() => {
                    fetchRooms();
                    fetchMessageRequests();
                }, 5000);
                return () => clearInterval(interval);
            } else {
                setLoading(false);
            }
        }
    }, [user, mySupportRooms.length]);

    useEffect(() => {
        if (!agentSearchOpen || user?.user_type !== 'player') return;
        const timeoutId = setTimeout(async () => {
            setIsSearchingAgents(true);
            setAgentSearchError(null);
            try {
                const q = agentSearchQuery.trim();
                const endpoint = q
                    ? `/api/agents/search/?q=${encodeURIComponent(q)}`
                    : '/api/agents/search/';
                const data = await apiClient.get<AgentSearchResult[]>(endpoint);
                setAgentSearchResults(data);
            } catch (error: any) {
                setAgentSearchResults([]);
                setAgentSearchError(error?.message || 'Failed to search agents');
            } finally {
                setIsSearchingAgents(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [agentSearchOpen, agentSearchQuery, user?.user_type]);

    useEffect(() => {
        if (!groupDiscoverOpen || (user?.user_type !== 'player' && user?.user_type !== 'agent')) return;
        const timeoutId = setTimeout(async () => {
            setIsDiscoveringGroups(true);
            setGroupDiscoverError(null);
            try {
                const q = groupDiscoverQuery.trim();
                const endpoint = q
                    ? `/api/groups/discover/?q=${encodeURIComponent(q)}`
                    : '/api/groups/discover/';
                const data = await apiClient.get<GroupDiscoverItem[]>(endpoint);
                setGroupDiscoverResults(data);
            } catch (error: any) {
                setGroupDiscoverResults([]);
                setGroupDiscoverError(error?.message || 'Failed to load groups');
            } finally {
                setIsDiscoveringGroups(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [groupDiscoverOpen, groupDiscoverQuery, user?.user_type]);

    const startDirectAgentChat = async (agentId: number) => {
        try {
            const room = await apiClient.post<Room>('/api/rooms/direct/start/', { agent_id: agentId });
            setAgentSearchOpen(false);
            setAgentSearchQuery('');
            await fetchRooms();
            switchToRoom(room.id, true);
            showToast('Direct chat started', 'success');
        } catch (error: any) {
            showToast(error?.message || 'Unable to start chat with this agent', 'error');
        }
    };

    const requestGroupJoin = async (groupId: number) => {
        try {
            await apiClient.post(`/api/groups/${groupId}/join-requests/`, {});
            showToast('Join request sent', 'success');
            const q = groupDiscoverQuery.trim();
            const endpoint = q ? `/api/groups/discover/?q=${encodeURIComponent(q)}` : '/api/groups/discover/';
            const data = await apiClient.get<GroupDiscoverItem[]>(endpoint);
            setGroupDiscoverResults(data);
        } catch (error: any) {
            showToast(error?.message || 'Failed to send join request', 'error');
        }
    };

    const createGroup = async () => {
        const name = newGroupName.trim();
        if (!name) return;
        setIsCreatingGroup(true);
        try {
            const room = await apiClient.post<Room>('/api/groups/', {
                name,
                group_description: newGroupDescription.trim(),
            });
            setCreateGroupOpen(false);
            setNewGroupName('');
            setNewGroupDescription('');
            await fetchRooms();
            switchToRoom(room.id, true);
            showToast('Group created', 'success');
        } catch (error: any) {
            showToast(error?.message || 'Failed to create group', 'error');
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const loadManagedGroupRequests = async () => {
        setIsLoadingGroupRequests(true);
        try {
            const data = await apiClient.get<GroupJoinRequestItem[]>('/api/groups/managed/requests/');
            setGroupJoinRequests(data);
            setPendingGroupRequestCount(data.length);
        } catch (error: any) {
            showToast(error?.message || 'Failed to load join requests', 'error');
        } finally {
            setIsLoadingGroupRequests(false);
        }
    };

    const openGroupRequests = async () => {
        setGroupRequestsOpen(true);
        await loadManagedGroupRequests();
    };

    const reviewGroupJoinRequest = async (requestId: number, action: 'approve' | 'reject') => {
        try {
            await apiClient.post(`/api/groups/join-requests/${requestId}/review/`, { action });
            await loadManagedGroupRequests();
            await fetchRooms();
            showToast(action === 'approve' ? 'Player added to group' : 'Join request rejected', 'success');
        } catch (error: any) {
            showToast(error?.message || 'Failed to review request', 'error');
        }
    };

    useEffect(() => {
        if (user?.user_type !== 'agent') {
            setPendingGroupRequestCount(0);
            return;
        }

        const refreshPendingCount = async () => {
            try {
                const data = await apiClient.get<GroupJoinRequestItem[]>('/api/groups/managed/requests/');
                setPendingGroupRequestCount(data.length);
            } catch {
                // keep current badge value on transient failures
            }
        };

        refreshPendingCount();
        const intervalId = setInterval(refreshPendingCount, 10000);
        return () => clearInterval(intervalId);
    }, [user?.user_type]);

    const openGroupMembers = async () => {
        const currentRoom = rooms.find((r) => r.id === selectedRoom);
        if (!currentRoom || currentRoom.room_type !== 'group') return;
        setIsLoadingGroupMembers(true);
        setGroupMembersOpen(true);
        try {
            const data = await apiClient.get<User[]>(`/api/groups/${currentRoom.id}/members/`);
            setGroupMembers(data);
        } catch (error: any) {
            showToast(error?.message || 'Failed to load group members', 'error');
            setGroupMembers([]);
        } finally {
            setIsLoadingGroupMembers(false);
        }
    };

    const startDirectFromGroup = async (playerId: number) => {
        const currentRoom = rooms.find((r) => r.id === selectedRoom);
        if (!currentRoom || currentRoom.room_type !== 'group') return;
        try {
            const room = await apiClient.post<Room>(`/api/groups/${currentRoom.id}/direct/${playerId}/start/`, {});
            setGroupMembersOpen(false);
            await fetchRooms();
            switchToRoom(room.id, true);
            showToast('Direct chat opened', 'success');
        } catch (error: any) {
            showToast(error?.message || 'Failed to start direct chat', 'error');
        }
    };

    const sendBroadcast = async () => {
        const currentRoom = rooms.find((r) => r.id === selectedRoom);
        if (!currentRoom || currentRoom.room_type !== 'group') return;
        if (!messageInput.trim()) return;
        setSendingBroadcast(true);
        try {
            await apiClient.post(`/api/groups/${currentRoom.id}/broadcast/`, {
                content: messageInput.trim(),
            });
            setMessageInput('');
        } catch (error: any) {
            showToast(error?.message || 'Failed to send broadcast', 'error');
        } finally {
            setSendingBroadcast(false);
        }
    };

    const deleteCurrentGroup = async () => {
        const currentRoom = rooms.find((r) => r.id === selectedRoom);
        if (!currentRoom || currentRoom.room_type !== 'group') return;
        setIsDeletingGroup(true);
        try {
            await apiClient.delete(`/api/groups/${currentRoom.id}/`);
            setDeleteGroupModalOpen(false);
            setGroupMembersOpen(false);
            showToast('Group deleted', 'success');
            await fetchRooms();
        } catch (error: any) {
            showToast(error?.message || 'Failed to delete group', 'error');
        } finally {
            setIsDeletingGroup(false);
        }
    };

    const leaveCurrentGroup = async () => {
        const currentRoom = rooms.find((r) => r.id === selectedRoom);
        if (!currentRoom || currentRoom.room_type !== 'group') return;
        setIsLeavingGroup(true);
        try {
            await apiClient.post(`/api/groups/${currentRoom.id}/leave/`, {});
            setLeaveGroupModalOpen(false);
            setGroupMembersOpen(false);
            showToast('You left the group', 'success');
            await fetchRooms();
        } catch (error: any) {
            showToast(error?.message || 'Failed to leave group', 'error');
        } finally {
            setIsLeavingGroup(false);
        }
    };

    useEffect(() => {
        if (!Number.isFinite(requestedRoomIdParam) || rooms.length === 0) return;
        const requestedRoom = rooms.find((room) => room.id === requestedRoomIdParam);
        if (requestedRoom && selectedRoom !== requestedRoom.id) {
            switchToRoom(requestedRoom.id, false);
        }
    }, [requestedRoomIdParam, rooms, selectedRoom]);

    // ... (rest of message loading logic logic)
    // Load Messages Function
    const loadMessages = async (
        direction: 'older' | 'newer' | 'around' | 'initial' = 'initial',
        referenceId?: number,
        roomIdOverride?: number
    ) => {
        const roomId = roomIdOverride ?? selectedRoom;
        if (!roomId) return;
        if (isFetchingMore) return;
        const requestToken = roomLoadTokenRef.current;

        try {
            setIsFetchingMore(true);
            const params = new URLSearchParams();
            params.append('limit', '20');

            if (direction === 'older' && referenceId) params.append('before_id', referenceId.toString());
            if (direction === 'newer' && referenceId) params.append('after_id', referenceId.toString());
            if (direction === 'around' && referenceId) params.append('around_id', referenceId.toString());

            const url = `/api/rooms/${roomId}/messages/?${params.toString()}`;
            const data = await apiClient.get<Message[]>(url);
            const isCurrentRoom = selectedRoomRef.current === roomId;
            const isCurrentToken = requestToken === roomLoadTokenRef.current;

            if (direction === 'initial') {
                if (isCurrentRoom && isCurrentToken) {
                    setMessages(data);
                }
                roomMessagesCacheRef.current[roomId] = data;
                setHasMore(data.length >= 20);
                setHasMoreNewer(false);
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
            }
            else if (direction === 'older') {
                if (data.length < 20) setHasMore(false);
                if (isCurrentRoom && isCurrentToken) {
                    setMessages(prev => {
                        const merged = [...data, ...prev];
                        roomMessagesCacheRef.current[roomId] = merged;
                        return merged;
                    });
                }
            }
            else if (direction === 'newer') {
                if (data.length < 20) setHasMoreNewer(false);
                if (isCurrentRoom && isCurrentToken) {
                    setMessages(prev => {
                        const merged = [...prev, ...data];
                        roomMessagesCacheRef.current[roomId] = merged;
                        return merged;
                    });
                }
            }
            else if (direction === 'around') {
                if (isCurrentRoom && isCurrentToken) {
                    setMessages(data);
                }
                roomMessagesCacheRef.current[roomId] = data;
                setHasMore(true); // Assumption: history exists
                setHasMoreNewer(true); // Assumption: newer messages exist

                // Scroll to target message
                setTimeout(() => {
                    document.getElementById(`msg-${referenceId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }

        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setIsFetchingMore(false);
        }
    };

    // Load Pinned Messages
    const loadPinnedMessages = async (roomIdOverride?: number) => {
        const roomId = roomIdOverride ?? selectedRoom;
        if (!roomId) return;
        const requestToken = roomLoadTokenRef.current;
        try {
            const data = await apiClient.get<Message[]>(`/api/rooms/${roomId}/pinned/`);
            roomPinnedCacheRef.current[roomId] = data;
            if (selectedRoomRef.current === roomId && requestToken === roomLoadTokenRef.current) {
                setPinnedMessages(data);
            }
        } catch (error) {
            console.error('Error loading pinned messages:', error);
        }
    };

    useEffect(() => {
        if (selectedRoom) {
            selectedRoomRef.current = selectedRoom;
            const cachedMessages = roomMessagesCacheRef.current[selectedRoom];
            const cachedPinned = roomPinnedCacheRef.current[selectedRoom];

            if (cachedMessages) {
                setMessages(cachedMessages);
            } else {
                setMessages([]);
            }
            if (cachedPinned) {
                setPinnedMessages(cachedPinned);
            } else {
                setPinnedMessages([]);
            }
            setHasMore(true);
            setHasMoreNewer(false);
            // Refresh in background to keep cache accurate without blocking UI.
            loadMessages('initial', undefined, selectedRoom);
            loadPinnedMessages(selectedRoom);

            const joinRoom = async () => {
                try {
                    await apiClient.post(`/api/rooms/${selectedRoom}/join/`);
                } catch (error) {
                    console.error('Error joining room:', error);
                }
            };
            joinRoom();
        }
    }, [selectedRoom]);

    useEffect(() => {
        wsBaselineRef.current = wsMessages.length;
    }, [selectedRoom]);

    useEffect(() => {
        if (selectedRoom) {
            roomMessagesCacheRef.current[selectedRoom] = messages;
        }
    }, [selectedRoom, messages]);

    useEffect(() => {
        if (selectedRoom) {
            roomPinnedCacheRef.current[selectedRoom] = pinnedMessages;
        }
    }, [selectedRoom, pinnedMessages]);

    useEffect(() => {
        if (!user || !storageKey || typeof window === 'undefined') return;
        try {
            const payload = {
                rooms,
                selectedRoom,
                roomMessagesCache: roomMessagesCacheRef.current,
                roomPinnedCache: roomPinnedCacheRef.current,
                agentChatFilter,
            };
            window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
        } catch (error) {
            console.error('Failed to persist chat cache:', error);
        }
    }, [rooms, selectedRoom, messages, pinnedMessages, agentChatFilter, user, storageKey]);

    // Jump / Scroll to Bottom Helper
    const scrollToBottom = () => {
        setMessages([]);
        setHasMoreNewer(false);
        loadMessages('initial');
    };

    const handleJumpToMessage = (messageId: number) => {
        loadMessages('around', messageId);
    };

    // Handle Scroll for Infinite Loading
    const handleScroll = () => {
        if (messagesContainerRef.current && !isFetchingMore) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;

            // Scroll Up (Older)
            if (scrollTop === 0 && hasMore && messages.length > 0) {
                const oldestMessageId = messages[0].id;
                const currentScrollHeight = scrollHeight;

                loadMessages('older', oldestMessageId).then(() => {
                    requestAnimationFrame(() => {
                        if (messagesContainerRef.current) {
                            const newScrollHeight = messagesContainerRef.current.scrollHeight;
                            messagesContainerRef.current.scrollTop = newScrollHeight - currentScrollHeight;
                        }
                    });
                });
            }

            // Scroll Down (Newer)
            if (scrollTop + clientHeight >= scrollHeight - 10 && hasMoreNewer && messages.length > 0) {
                const newestMessageId = messages[messages.length - 1].id;
                loadMessages('newer', newestMessageId);
            }
        }
    };

    // Unified Message List Logic
    const unifiedMessages = useMemo(() => {
        // 1. Start with historical messages
        let allMessages = [...messages];
        const scopedWsMessages = wsMessages.slice(wsBaselineRef.current);

        // 2. Merge Pinned Messages (deduplicated)
        pinnedMessages.forEach(pinMsg => {
            if (!allMessages.some(m => m.id === pinMsg.id)) {
                allMessages.push(pinMsg);
            }
        });

        // Sort after merging to ensure order
        allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // 3. Add NEW WS messages (chat_message type)
        const newWsMessages = scopedWsMessages
            .filter(msg => msg.type === 'chat_message')
            .map(msg => ({
                id: msg.message_id || Date.now() + Math.random(),
                room: selectedRoom || 0,
                sender: {
                    id: msg.user_id || 0,
                    username: msg.username || 'Unknown',
                    user_type: (msg as any).user_type || 'player'
                },
                content: msg.message || '',
                attachment: msg.attachment,
                timestamp: msg.timestamp || new Date().toISOString(),
                is_read: false,
                is_edited: false,
                is_pinned: false,
                is_deleted: false,
                is_broadcast: !!msg.is_broadcast,
            } as Message));

        // Deduplicate and Append
        newWsMessages.forEach(wsMsg => {
            if (!allMessages.some(m => m.id === wsMsg.id)) {
                allMessages.push(wsMsg);
            }
        });

        // 4. Apply Update/Delete/Pin events to the FULL list
        scopedWsMessages.forEach(wsMsg => {
            // ... (existing logic)
        });

        console.log('Unified Debug:', {
            messagesCount: messages.length,
            pinnedCount: pinnedMessages.length,
            wsCount: wsMessages.length,
            finalCount: allMessages.length,
            pinnedIds: pinnedMessages.map(m => m.id)
        });

        return allMessages;
    }, [messages, pinnedMessages, wsMessages, selectedRoom]);

    useEffect(() => {
        // Simple logic: if we are near bottom, or it's a new message just added

        // For now, let's auto scroll if we are not fetching more
        if (!isFetchingMore && messages.length > 0) {
            // Only if last message is recent?
            // Or if it's an initial load?
            // Ideally we check if user was at bottom.
            // For simplicity, we just scroll to bottom if it's a websocket update (length changed by 1 and at end)
            // But here we just scroll to bottom for now as per classic chat behavior, 
            // unless user is scrolling up?
            // Let's rely on refs.

            // Check if the last message is new/from ws.
            // Actually, simplest is: if not fetching more, we scroll.
            // But prepending changes messages array too.
            // So we should only scroll to bottom if the LAST message changed?
            // messages[messages.length-1]
        }
    }, [messages, wsMessages]);

    // Separate effect for WS messages to scroll to bottom
    // Separate effect for WS messages to scroll to bottom - ONLY for new messages
    // Separate effect for WS messages to scroll to bottom - ONLY for new messages
    useEffect(() => {
        if (!isFetchingMore && wsMessages.length > 0) {
            const lastMsg = wsMessages[wsMessages.length - 1];
            // Only scroll for new messages if we are NOT viewing history (hasMoreNewer is false)
            if (lastMsg.type === 'chat_message' && !hasMoreNewer) {
                // Check if user is near bottom? Or just force?
                // For simplicity, force scroll if live.
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

                // Play notification sound if message is not from current user
                if (user?.username && lastMsg.username !== user.username) {
                    playNotificationSound();
                }
            }
        }
    }, [wsMessages, hasMoreNewer, user]);


    const closeChat = async () => {
        if (!selectedRoom) return;

        try {
            await apiClient.post(`/api/rooms/${selectedRoom}/close/`);
            // Refresh rooms
            const data = await apiClient.get<Room[]>('/api/rooms/');
            setRooms(data);
            setSelectedRoom(null);
            showToast('Chat closed successfully');
        } catch (err: any) {
            showToast(err.message || 'Failed to close chat', 'error');
        }
    };

    const handleSwitchStation = () => {
        setSwitchModalOpen(true);
    };

    const confirmSwitchStation = async () => {
        try {
            const res = await apiClient.post<any>('/api/rooms/switch-station/');
            showToast(res.message || 'Switched station successfully', 'success');

            // Refresh rooms/chat
            const data = await apiClient.get<Room[]>('/api/rooms/');
            setRooms(data);
            // Ensure valid room is selected
            if (data.length > 0) switchToRoom(data[0].id);
            setSwitchModalOpen(false);
        } catch (error: any) {
            console.error('Error switching station:', error);
            showToast(error.response?.data?.error || 'Failed to switch station', 'error');
            setSwitchModalOpen(false);
        }
    };

    const [typingUser, setTypingUser] = useState<string | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ... (existing helper functions)

    // Handle WebSocket Messages including Typing
    useEffect(() => {
        const lastMsg = wsMessages[wsMessages.length - 1];
        if (lastMsg && lastMsg.type === 'typing' && lastMsg.username !== user?.username) {
            setTypingUser(lastMsg.username || 'Someone');

            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                setTypingUser(null);
            }, 3000);
        }
    }, [wsMessages, user]);




    // Global Notification Listener
    useEffect(() => {
        if (!user || user.user_type !== 'staff') return;

        const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000') + '/ws/notifications/?token=' + localStorage.getItem('accessToken');
        const notificationWs = new WebSocket(wsUrl);

        notificationWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_message_notification') {
                    // Play sound IF:
                    // 1. It's not the room I'm currently looking at (selectedRoom)
                    // OR
                    // 2. I have no room selected
                    // Note: If I AM looking at the room, the existing chat socket logic handles the sound (or we rely on this one and remove the other? 
                    // Let's rely on this one for "background" and the other for "active" to be safe, BUT duplications might happen.
                    // Better approach: The chat socket logic plays sound if *message received*.
                    // This socket plays sound if *notification received*.

                    // IF selectedRoom === data.room_id, we let the Chat socket handle it (it has better context like scroll).
                    // So here we only play if room_id !== selectedRoom.

                    if (selectedRoom !== data.room_id) {
                        playNotificationSound();
                    }
                }
            } catch (e) {
                console.error('Notification WS error', e);
            }
        };

        return () => {
            notificationWs.close();
        };
    }, [user, selectedRoom]);

    const handleEnterSupportRoom = async (roomId: number) => {
        try {
            const res = await apiClient.post<any>(`/api/support-rooms/${roomId}/enter/`);
            // Add to our list
            setMySupportRooms(prev => [...prev, res.room]);

            // Refresh rooms list
            const updatedRooms = supportRooms.map(r =>
                r.id === roomId ? res.room : r
            );
            setSupportRooms(updatedRooms);

            // Refresh chats
            await fetchRooms();
        } catch (error: any) {
            console.error('Error entering room:', error);
            showToast(error.response?.data?.error || 'Failed to enter room', 'error');
        }
    };

    const handleLeaveSupportRoom = (roomId: number) => {
        setRoomToLeave(roomId);
        setLeaveModalOpen(true);
    };

    const confirmLeaveRoom = async () => {
        if (!roomToLeave) return;

        try {
            console.log('Sending leave request for room:', roomToLeave);
            await apiClient.post(`/api/support-rooms/${roomToLeave}/leave/`);

            // Remove from our list
            setMySupportRooms(prev => prev.filter(r => r.id !== roomToLeave));

            // Update master list
            const updatedRooms = supportRooms.map(r =>
                r.id === roomToLeave ? { ...r, staff: null, is_active: false } : r
            );
            setSupportRooms(updatedRooms);

            // Refresh chats
            await fetchRooms();
            setLeaveModalOpen(false);
            setRoomToLeave(null);
        } catch (error) {
            console.error('Error leaving room:', error);
            showToast('Failed to leave room. Please check console.', 'error');
        }
    };

    const confirmLeaveAllRooms = async () => {
        try {
            await Promise.all(mySupportRooms.map(r => apiClient.post(`/api/support-rooms/${r.id}/leave/`)));

            setMySupportRooms([]);

            // Update master list to clear all occupations by self
            // Note: This matches simple optimistic update, real sync happens on fetchRooms
            setSupportRooms(prev => prev.map(r => {
                // if it was my room, clear it
                if (mySupportRooms.some(mr => mr.id === r.id)) {
                    return { ...r, staff: null, is_active: false };
                }
                return r;
            }));

            // Refresh chats
            await fetchRooms();
            setLeaveAllModalOpen(false);
        } catch (error) {
            console.error('Error leaving all rooms:', error);
            showToast('Failed to leave some rooms. Please check console.', 'error');
        }
    };
    const selectedRoomData = rooms.find(r => r.id === selectedRoom);
    const messageRequestRoomIds = useMemo(
        () => new Set(messageRequestRooms.map((room) => room.id)),
        [messageRequestRooms]
    );
    const directAgentChatCount = rooms.filter((r) => r.room_type === 'direct_agent' && !messageRequestRoomIds.has(r.id)).length;
    const orderedClientRooms = useMemo(() => {
        const supportRoom = rooms.find((r) => r.room_type === 'support');
        const nonSupportRooms = rooms.filter((r) => r.room_type !== 'support' && !messageRequestRoomIds.has(r.id));
        const directRooms = nonSupportRooms.filter((r) => r.room_type === 'direct_agent');
        const groupRooms = nonSupportRooms.filter((r) => r.room_type === 'group');
        const otherNonSupportRooms = nonSupportRooms.filter((r) => r.room_type !== 'direct_agent' && r.room_type !== 'group');

        const sortedDirectRooms = [...directRooms].sort((a, b) => {
            if (user?.user_type === 'agent') {
                const aNeedsReply = needsReply(a);
                const bNeedsReply = needsReply(b);
                if (aNeedsReply !== bNeedsReply) return aNeedsReply ? -1 : 1;
            }
            const aUnread = a.unread_count || 0;
            const bUnread = b.unread_count || 0;
            if (aUnread !== bUnread) return bUnread - aUnread;
            const aTs = a.last_activity ? new Date(a.last_activity).getTime() : 0;
            const bTs = b.last_activity ? new Date(b.last_activity).getTime() : 0;
            return bTs - aTs;
        }).filter((room) => {
            if (user?.user_type !== 'agent') return true;
            if (agentChatFilter === 'needs_reply') return needsReply(room);
            if (agentChatFilter === 'unread') return (room.unread_count || 0) > 0;
            return true;
        });

        const sortedGroupRooms = [...groupRooms].sort((a, b) => {
            const aUnread = a.unread_count || 0;
            const bUnread = b.unread_count || 0;
            if (aUnread !== bUnread) return bUnread - aUnread;
            const aTs = a.last_activity ? new Date(a.last_activity).getTime() : 0;
            const bTs = b.last_activity ? new Date(b.last_activity).getTime() : 0;
            return bTs - aTs;
        });

        const combined = [...sortedDirectRooms, ...sortedGroupRooms, ...otherNonSupportRooms];
        return supportRoom ? [supportRoom, ...combined] : combined;
    }, [rooms, user?.user_type, user?.id, agentChatFilter, messageRequestRoomIds]);

    const renderRoomListButton = (room: Room, onSelect?: () => void) => {
        const displayName = user?.user_type === 'staff'
            ? (room.client ? room.client.username : room.name)
            : roomDisplayName(room);
        const initial = displayName.charAt(0).toUpperCase();

        return (
            <button
                key={room.id}
                className={`${styles.roomButton} ${selectedRoom === room.id ? styles.active : ''}`}
                onClick={() => {
                    switchToRoom(room.id, true);
                    onSelect?.();
                }}
            >
                <div className={styles.roomAvatar}>
                    {initial}
                </div>

                <div className={styles.roomInfo}>
                    <div className={styles.roomName}>
                        {displayName}
                    </div>
                    <div className={styles.roomSubtext}>
                        {user?.user_type === 'staff'
                            ? 'Support chat'
                            : `${roomSubtitle(room)}${user?.user_type === 'agent' && needsReply(room) ? ' • Needs reply' : ''}`}
                    </div>
                </div>

                <div className={styles.roomMeta}>
                    {room.unread_count && room.unread_count > 0 ? (
                        <span className={styles.unreadBadge}>
                            {room.unread_count}
                        </span>
                    ) : null}
                </div>
            </button>
        );
    };
    const renderMessageRequestItem = (room: Room, onSelect?: () => void) => {
        const displayName = roomDisplayName(room);
        const subtitle = room.message_request_direction === 'incoming'
            ? 'Incoming message request'
            : 'Pending request (outgoing)';

        return (
            <div key={`request-${room.id}`} className={styles.messageRequestCard}>
                <button
                    className={`${styles.roomButton} ${selectedRoom === room.id ? styles.active : ''}`}
                    onClick={() => {
                        switchToRoom(room.id, true);
                        onSelect?.();
                    }}
                >
                    <div className={styles.roomAvatar}>
                        {displayName.charAt(0).toUpperCase()}
                    </div>

                    <div className={styles.roomInfo}>
                        <div className={styles.roomName}>{displayName}</div>
                        <div className={styles.roomSubtext}>{subtitle}</div>
                    </div>

                    <div className={styles.roomMeta}>
                        {room.unread_count && room.unread_count > 0 ? (
                            <span className={styles.unreadBadge}>{room.unread_count}</span>
                        ) : null}
                    </div>
                </button>
                {room.message_request_direction === 'incoming' && (
                    <div className={styles.messageRequestActions}>
                        <button
                            className={styles.messageRequestRejectBtn}
                            onClick={() => respondToMessageRequest(room.id, 'reject')}
                            disabled={requestActionRoomId === room.id}
                        >
                            {requestActionRoomId === room.id ? 'Processing...' : 'Reject'}
                        </button>
                        <button
                            className={styles.messageRequestAcceptBtn}
                            onClick={() => respondToMessageRequest(room.id, 'accept')}
                            disabled={requestActionRoomId === room.id}
                        >
                            {requestActionRoomId === room.id ? 'Processing...' : 'Accept'}
                        </button>
                    </div>
                )}
            </div>
        );
    };
    const agentSupportRoom = user?.user_type === 'agent'
        ? orderedClientRooms.find((room) => room.room_type === 'support')
        : undefined;
    const agentOtherRooms = user?.user_type === 'agent'
        ? orderedClientRooms.filter((room) => room.room_type !== 'support')
        : [];
    const agentDirectRooms = user?.user_type === 'agent'
        ? agentOtherRooms.filter((room) => room.room_type === 'direct_agent')
        : [];
    const agentGroupRooms = user?.user_type === 'agent'
        ? agentOtherRooms.filter((room) => room.room_type === 'group')
        : [];
    const clientSupportRoom = user?.user_type !== 'staff'
        ? orderedClientRooms.find((room) => room.room_type === 'support')
        : undefined;
    const clientDirectRooms = user?.user_type !== 'staff'
        ? orderedClientRooms.filter((room) => room.room_type === 'direct_agent')
        : [];
    const clientGroupRooms = user?.user_type !== 'staff'
        ? orderedClientRooms.filter((room) => room.room_type === 'group')
        : [];

    if (authLoading || loading) {
        return (
            <div className={styles.pageWrapper}>
                <Header />
                <main className={styles.main}>
                    <div className={styles.container}>
                        <div className={styles.loading}>
                            <div className="spinner"></div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (!user) return null;

    // STAFF VIEW: Selection Mode
    if (user.user_type === 'staff' && mySupportRooms.length === 0) {
        return (
            <>
                <Header />
                <main className={styles.main}>
                    <div className={styles.container}>
                        <h1 className="gradient-text" style={{ marginBottom: '2rem' }}>Support Workstations</h1>

                        {mySupportRooms.length > 0 && (
                            <div className={styles.activeRoomIndicator}>
                                <div className={styles.activeRoomHeader}>Active Queues ({mySupportRooms.length})</div>
                                <div className={styles.activeRoomList}>
                                    {mySupportRooms.map(room => (
                                        <div key={room.id} className={styles.activeRoomItem}>
                                            <span>{room.name}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleLeaveSupportRoom(room.id); }}
                                                className={styles.leaveRoomBtn}
                                                title="Leave Queue"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={styles.supportRoomGrid}>
                            {supportRooms.map(room => {
                                const isMyRoom = mySupportRooms.some(r => r.id === room.id);
                                const isOccupied = room.staff && !isMyRoom;

                                return (
                                    <div
                                        key={room.id}
                                        className={`${styles.supportRoomCard} ${isMyRoom ? styles.active : ''} ${isOccupied ? styles.occupied : ''}`}
                                        onClick={() => !isOccupied && !isMyRoom ? handleEnterSupportRoom(room.id) : null}
                                    >
                                        <div className={styles.roomName}>{room.name}</div>
                                        <div className={styles.roomStatus}>
                                            {isMyRoom ? 'Active' : isOccupied ? `Occupied by ${room.staff.username}` : 'Available'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>

                <Modal
                    isOpen={leaveModalOpen}
                    onClose={() => setLeaveModalOpen(false)}
                    title="Leave Queue"
                    footer={
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                                onClick={() => setLeaveModalOpen(false)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '5px',
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-bg-tertiary)',
                                    color: 'var(--color-text-primary)',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLeaveRoom}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '5px',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Leave Queue
                            </button>
                        </div>
                    }
                >
                    <p>Are you sure you want to stop monitoring this queue? You will stop receiving new chats from it.</p>
                </Modal>
            </>
        );
    }

    return (
        <div className={styles.pageWrapper} onClick={initAudio} onTouchStart={initAudio}>
            {/* Hide Header for Staff in Workstation */}
            {!(user.user_type === 'staff' && mySupportRooms.length > 0) && <Header />}
            <main className={styles.main}>
                <div className={styles.container}>
                    {/* Queue Management Menu for Staff */}
                    {user.user_type === 'staff' && (
                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', position: 'relative', zIndex: 50 }}>
                            <div className={styles.queueMenuWrapper}>
                                <button
                                    className={styles.queueMenuBtn}
                                    onClick={() => setShowQueueMenu(!showQueueMenu)}
                                >
                                    <span>Stations</span>
                                    <span style={{
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        borderRadius: '10px',
                                        padding: '0 6px',
                                        fontSize: '0.75rem',
                                        height: '18px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        {mySupportRooms.length}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', transform: showQueueMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                                </button>

                                {showQueueMenu && (
                                    <div className={styles.queueMenuDropdown}>
                                        <div className={styles.queueMenuHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Active Stations</span>
                                            {mySupportRooms.length > 0 && (
                                                <button
                                                    onClick={() => setLeaveAllModalOpen(true)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                        textDecoration: 'underline'
                                                    }}
                                                >
                                                    Leave All
                                                </button>
                                            )}
                                        </div>
                                        <div className={styles.queueMenuList}>
                                            {mySupportRooms.length === 0 && (
                                                <div style={{ padding: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
                                                    Not monitoring any stations.
                                                </div>
                                            )}
                                            {mySupportRooms.map(room => (
                                                <div key={room.id} className={styles.queueMenuItem}>
                                                    <span className={styles.queueMenuItemName}>{room.name}</span>
                                                    <button
                                                        className={styles.queueLeaveBtn}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleLeaveSupportRoom(room.id);
                                                            // Optional: close menu or keep open? Keep open for quick management
                                                        }}
                                                        title="Leave Queue"
                                                    >
                                                        Leave
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div
                                            className={styles.queueAddItem}
                                            onClick={() => {
                                                setShowStationBrowser(true);
                                                setShowQueueMenu(false);
                                            }}
                                        >
                                            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Add Queue
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={`${styles.chatContainer} ${user.user_type !== 'staff' ? styles.clientLayout : ''}`}>
                        {(user.user_type === 'staff' || ((user.user_type === 'player' || user.user_type === 'agent') && !isMobileViewport)) && (
                            <div className={`${styles.roomList} glass ${!showRoomList && user.user_type !== 'staff' ? styles.hidden : ''}`}>
                                <div className={styles.clientRoomHeader}>
                                    {user.user_type !== 'staff' && isMobileViewport && (
                                        <button
                                            className={styles.headerActionBtn}
                                            onClick={() => setChatSwitcherOpen(true)}
                                            style={{ marginRight: '0.5rem' }}
                                        >
                                            Chats
                                        </button>
                                    )}
                                    <h2>
                                        {user.user_type === 'staff'
                                            ? 'Active Chats'
                                            : 'Chats'}
                                    </h2>
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        {user.user_type === 'player' && (
                                            <button
                                                className={styles.findAgentsBtn}
                                                onClick={() => setAgentSearchOpen(true)}
                                            >
                                                Find Agents
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.rooms}>
                                    {user.user_type === 'agent' ? (
                                        <>
                                            {agentSupportRoom ? (
                                                renderRoomListButton(agentSupportRoom)
                                            ) : (
                                                <div className={styles.noRooms}>Support chat unavailable</div>
                                            )}

                                            <div className={styles.agentChatsHeader}>Message Requests</div>
                                            {messageRequestRooms.length > 0 ? (
                                                messageRequestRooms.map((room) => renderMessageRequestItem(room))
                                            ) : (
                                                <div className={styles.noRooms}>No message requests</div>
                                            )}

                                            <div className={styles.agentChatsHeader}>Chats</div>
                                            {directAgentChatCount > 0 && (
                                                <div className={styles.agentFilterRow}>
                                                    <button
                                                        className={`${styles.agentFilterPill} ${agentChatFilter === 'all' ? styles.activeFilter : ''}`}
                                                        onClick={() => setAgentChatFilter('all')}
                                                    >
                                                        All
                                                    </button>
                                                    <button
                                                        className={`${styles.agentFilterPill} ${agentChatFilter === 'needs_reply' ? styles.activeFilter : ''}`}
                                                        onClick={() => setAgentChatFilter('needs_reply')}
                                                    >
                                                        Needs Reply
                                                    </button>
                                                    <button
                                                        className={`${styles.agentFilterPill} ${agentChatFilter === 'unread' ? styles.activeFilter : ''}`}
                                                        onClick={() => setAgentChatFilter('unread')}
                                                    >
                                                        Unread
                                                    </button>
                                                </div>
                                            )}
                                            {agentDirectRooms.length > 0 ? (
                                                agentDirectRooms.map((room) => renderRoomListButton(room))
                                            ) : (
                                                <div className={styles.noRooms}>No direct chats</div>
                                            )}
                                            <div className={styles.agentChatsHeader}>Groups</div>
                                            <div className={styles.agentFilterRow}>
                                                <button
                                                    className={styles.agentFilterPill}
                                                    onClick={() => setGroupDiscoverOpen(true)}
                                                >
                                                    Browse
                                                </button>
                                                <button
                                                    className={styles.agentFilterPill}
                                                    onClick={() => setCreateGroupOpen(true)}
                                                >
                                                    New
                                                </button>
                                                <button
                                                    className={styles.agentFilterPill}
                                                    onClick={openGroupRequests}
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                                >
                                                    Requests
                                                    {pendingGroupRequestCount > 0 && (
                                                        <span className={styles.unreadBadge} style={{ minWidth: '16px', height: '16px', fontSize: '0.62rem', padding: '0 4px', marginTop: 0 }}>
                                                            {pendingGroupRequestCount}
                                                        </span>
                                                    )}
                                                </button>
                                            </div>
                                            {agentGroupRooms.length > 0 ? (
                                                agentGroupRooms.map((room) => renderRoomListButton(room))
                                            ) : (
                                                <div className={styles.noRooms}>No groups</div>
                                            )}
                                        </>
                                    ) : user.user_type === 'player' ? (
                                        <>
                                            {clientSupportRoom && renderRoomListButton(clientSupportRoom)}
                                            <div className={styles.agentChatsHeader}>Message Requests</div>
                                            {messageRequestRooms.length > 0 ? (
                                                messageRequestRooms.map((room) => renderMessageRequestItem(room))
                                            ) : (
                                                <div className={styles.noRooms}>No message requests</div>
                                            )}
                                            {clientDirectRooms.length > 0 && (
                                                <>
                                                    <div className={styles.agentChatsHeader}>Chats</div>
                                                    {clientDirectRooms.map((room) => renderRoomListButton(room))}
                                                </>
                                            )}
                                            <div className={styles.agentChatsHeader}>Groups</div>
                                            <div className={styles.agentFilterRow}>
                                                <button
                                                    className={styles.agentFilterPill}
                                                    onClick={() => setGroupDiscoverOpen(true)}
                                                >
                                                    Browse
                                                </button>
                                            </div>
                                            {clientGroupRooms.length > 0 ? (
                                                clientGroupRooms.map((room) => renderRoomListButton(room))
                                            ) : (
                                                <div className={styles.noRooms}>No groups</div>
                                            )}
                                            {!clientSupportRoom && messageRequestRooms.length === 0 && clientDirectRooms.length === 0 && clientGroupRooms.length === 0 && (
                                                <div className={styles.noRooms}>No active chats</div>
                                            )}
                                        </>
                                    ) : (user.user_type === 'staff' ? rooms : orderedClientRooms).length > 0 ? (
                                        (user.user_type === 'staff' ? rooms : orderedClientRooms).map((room) => renderRoomListButton(room))
                                    ) : (
                                        <div className={styles.noRooms}>No active chats</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className={`${styles.chatArea} glass`}>
                            <div className={styles.chatHeader}>
                                {/* Left Side: Title & Back Button */}
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    {/* Back Button for non-staff */}
                                    {user.user_type !== 'staff' && !isMobileViewport && (
                                        <button
                                            className={styles.backButton}
                                            onClick={() => setShowRoomList(true)}
                                        >
                                            ←
                                        </button>
                                    )}
                                    <h2>
                                        {user.user_type === 'staff'
                                            ? (selectedRoomData
                                                ? (selectedRoomData.client ? `${selectedRoomData.client.username}` : selectedRoomData.name)
                                                : 'Select a chat')
                                            : (selectedRoomData ? roomDisplayName(selectedRoomData) : 'Select a chat')}
                                    </h2>
                                </div>

                                {/* Right Side: Actions & Status */}
                                <div className={styles.chatHeaderActions}>
                                    {user.user_type !== 'staff' && isMobileViewport && (
                                        <button
                                            className={styles.headerActionBtn}
                                            onClick={() => setChatSwitcherOpen(true)}
                                        >
                                            Chats
                                        </button>
                                    )}
                                    {/* Close Chat button disabled for now 
                                    {user.user_type === 'staff' && selectedRoomData && (
                                        <button
                                            onClick={closeChat}
                                            style={{
                                                padding: '0.25rem 0.75rem',
                                                fontSize: '0.8rem',
                                                backgroundColor: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Close Chat
                                        </button>
                                    )}
                                    */}

                                    {/* Switch Station for Clients */}
                                    {user.user_type !== 'staff' && selectedRoomData?.can_switch_station && !isMobileViewport && (
                                        <button
                                            onClick={handleSwitchStation}
                                            style={{
                                                padding: '0.3rem 0.8rem',
                                                fontSize: '0.8rem',
                                                backgroundColor: 'var(--color-bg-tertiary)',
                                                color: 'var(--color-text-primary)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '20px',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                                whiteSpace: 'nowrap'
                                            }}
                                            title="Switch to another support agent"
                                        >
                                            Switch Station ⇄
                                        </button>
                                    )}
                                    {user.user_type === 'agent' && selectedRoomData?.room_type === 'direct_agent' && !isMobileViewport && (
                                        <>
                                            <button
                                                onClick={openQuickReplies}
                                                className={styles.headerActionBtn}
                                                title="Quick replies"
                                            >
                                                Replies
                                            </button>
                                            <button
                                                onClick={openInternalNote}
                                                className={styles.headerActionBtn}
                                                title="Internal notes"
                                            >
                                                Notes
                                            </button>
                                            <button
                                                onClick={closeChat}
                                                className={styles.resolveBtn}
                                                title="Resolve chat"
                                            >
                                                Resolve
                                            </button>
                                        </>
                                    )}
                                    {user.user_type === 'agent' && selectedRoomData?.room_type === 'group' && selectedRoomData.user_is_group_admin && !isMobileViewport && (
                                        <>
                                            <button
                                                onClick={openGroupMembers}
                                                className={styles.headerActionBtn}
                                                title="Open group members"
                                            >
                                                Members
                                            </button>
                                            <button
                                                onClick={() => setDeleteGroupModalOpen(true)}
                                                className={styles.resolveBtn}
                                                title="Delete group"
                                            >
                                                Delete Group
                                            </button>
                                        </>
                                    )}
                                    {user.user_type === 'player' && selectedRoomData?.room_type === 'group' && !isMobileViewport && (
                                        <button
                                            onClick={() => setLeaveGroupModalOpen(true)}
                                            className={styles.resolveBtn}
                                            title="Leave group"
                                        >
                                            Leave Group
                                        </button>
                                    )}
                                    {user.user_type !== 'staff' && isMobileViewport && selectedRoomData && (
                                        <div className={styles.mobileOptionsWrapper}>
                                            <button
                                                className={styles.mobileOptionsTrigger}
                                                onClick={() => setMobileOptionsOpen((prev) => !prev)}
                                                title="Chat options"
                                            >
                                                ⋮
                                            </button>
                                            {mobileOptionsOpen && (
                                                <div className={styles.mobileOptionsMenu}>
                                                    {selectedRoomData.can_switch_station && (
                                                        <button
                                                            className={styles.mobileOptionsItem}
                                                            onClick={() => {
                                                                setMobileOptionsOpen(false);
                                                                handleSwitchStation();
                                                            }}
                                                        >
                                                            Switch Station
                                                        </button>
                                                    )}
                                                    {user.user_type === 'agent' && selectedRoomData.room_type === 'direct_agent' && (
                                                        <>
                                                            <button
                                                                className={styles.mobileOptionsItem}
                                                                onClick={() => {
                                                                    setMobileOptionsOpen(false);
                                                                    openQuickReplies();
                                                                }}
                                                            >
                                                                Replies
                                                            </button>
                                                            <button
                                                                className={styles.mobileOptionsItem}
                                                                onClick={() => {
                                                                    setMobileOptionsOpen(false);
                                                                    openInternalNote();
                                                                }}
                                                            >
                                                                Notes
                                                            </button>
                                                            <button
                                                                className={styles.mobileOptionsItem}
                                                                onClick={() => {
                                                                    setMobileOptionsOpen(false);
                                                                    closeChat();
                                                                }}
                                                            >
                                                                Resolve
                                                            </button>
                                                        </>
                                                    )}
                                                    {user.user_type === 'agent' && selectedRoomData.room_type === 'group' && selectedRoomData.user_is_group_admin && (
                                                        <>
                                                            <button
                                                                className={styles.mobileOptionsItem}
                                                                onClick={() => {
                                                                    setMobileOptionsOpen(false);
                                                                    openGroupMembers();
                                                                }}
                                                            >
                                                                Members
                                                            </button>
                                                            <button
                                                                className={`${styles.mobileOptionsItem} ${styles.mobileOptionsDanger}`}
                                                                onClick={() => {
                                                                    setMobileOptionsOpen(false);
                                                                    setDeleteGroupModalOpen(true);
                                                                }}
                                                            >
                                                                Delete Group
                                                            </button>
                                                        </>
                                                    )}
                                                    {user.user_type === 'player' && selectedRoomData.room_type === 'group' && (
                                                        <button
                                                            className={`${styles.mobileOptionsItem} ${styles.mobileOptionsDanger}`}
                                                            onClick={() => {
                                                                setMobileOptionsOpen(false);
                                                                setLeaveGroupModalOpen(true);
                                                            }}
                                                        >
                                                            Leave Group
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className={styles.status}>
                                        <span className={isConnected ? styles.connected : styles.disconnected} title={isConnected ? 'Connected' : 'Disconnected'}></span>
                                    </div>
                                </div>
                            </div>

                            {/* Away Message Banner */}
                            {user.user_type !== 'staff'
                                && selectedRoomData
                                && selectedRoomData.room_type === 'support'
                                && (!selectedRoomData.current_handler && !selectedRoomData.is_staff_online) && (
                                <div className={styles.awayMessageBanner}>
                                    All our staffs are away right now. Your messages might take some time to be responded.
                                </div>
                            )}

                            {/* Pinned Messages Header - Show if any pinned messages exists in current room */}
                            {unifiedMessages.some(m => m.is_pinned && !m.is_deleted) && (
                                <div className={styles.pinnedMessagesBar}>
                                    <div className={styles.pinnedIcon}>📌</div>
                                    <div className={styles.pinnedContent}>
                                        {unifiedMessages.filter(m => m.is_pinned && !m.is_deleted).map(m => (
                                            <div key={m.id} className={styles.pinnedItem} onClick={() => handleJumpToMessage(m.id)}>
                                                <span className={styles.pinnedSender}>{m.sender.username}: </span>
                                                {m.content.substring(0, 50)}{m.content.length > 50 ? '...' : ''}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Scroll to Bottom Button */}
                            {hasMoreNewer && (
                                <button
                                    onClick={scrollToBottom}
                                    style={{
                                        position: 'absolute',
                                        bottom: '80px',
                                        right: '20px',
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '40px',
                                        height: '40px',
                                        cursor: 'pointer',
                                        zIndex: 10,
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.2rem'
                                    }}
                                    title="Scroll to Bottom"
                                >
                                    ↓
                                </button>
                            )}

                            <div
                                className={styles.messagesContainer}
                                ref={messagesContainerRef}
                                onScroll={handleScroll}
                            >
                                <div className={styles.messagesList}>
                                    {isFetchingMore && (
                                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-secondary)' }}>
                                            <div className="spinner-small" style={{ display: 'inline-block', marginRight: '0.5rem' }}></div>
                                            Loading previous messages...
                                        </div>
                                    )}
                                    {unifiedMessages.map((msg, index) => {
                                        if (msg.is_deleted) {
                                            // Render deleted placeholder? Or hide?
                                            // Let's render a simpler deleted placeholder
                                            return (
                                                <div key={msg.id} className={`${styles.message} ${msg.sender.id === user.id ? styles.own : ''}`}>
                                                    <div className={styles.messageContent} style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                                                        This message was deleted
                                                    </div>
                                                </div>
                                            )
                                        }

                                        const prevMsg = unifiedMessages[index - 1];
                                        const isGrouped = prevMsg &&
                                            prevMsg.sender.username === msg.sender.username &&
                                            (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 5 * 60 * 1000) &&
                                            !prevMsg.is_deleted; // Don't group if prev is deleted/placeholder

                                        const isEditing = editingMessageId === msg.id;
                                        const sharedPost = parsePostSharePayload(msg.content || '');

                                        return (
                                            <div
                                                key={msg.id}
                                                id={`msg-${msg.id}`}
                                                className={`${styles.message} ${msg.sender.id === user.id ? styles.own : ''} ${isGrouped ? styles.grouped : ''} ${msg.is_pinned ? styles.pinnedMessage : ''}`}
                                            >
                                                {!isGrouped && (
                                                    <div className={styles.messageHeader}>
                                                        <span className={styles.sender}>{msg.sender.username}</span>
                                                        <span className={styles.time}>
                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {msg.is_pinned && <span style={{ marginLeft: '6px' }}>📌</span>}
                                                        </span>
                                                    </div>
                                                )}

                                                {isEditing ? (
                                                    <div className={styles.editContainer}>
                                                        <input
                                                            type="text"
                                                            value={editContent}
                                                            onChange={(e) => setEditContent(e.target.value)}
                                                            className={styles.editInput}
                                                            autoFocus
                                                        />
                                                        <div className={styles.editActions}>
                                                            <button onClick={() => handleEditSave(msg.id)} className={styles.saveButton}>Save</button>
                                                            <button onClick={handleEditCancel} className={styles.cancelButton}>Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {msg.attachment && (
                                                            <div className={styles.mediaContent} style={{ marginBottom: (!msg.attachment || !msg.content.startsWith('Sent a file:')) && msg.content ? '0.5rem' : '0' }}>
                                                                {msg.attachment.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) ? (
                                                                    <a href={msg.attachment} target="_blank" rel="noopener noreferrer">
                                                                        <img src={msg.attachment} alt="Attachment" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', cursor: 'pointer', display: 'block' }} />
                                                                    </a>
                                                                ) : msg.attachment.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ? (
                                                                    <video src={msg.attachment} controls style={{ maxWidth: '100%', borderRadius: '8px', display: 'block' }} />
                                                                ) : (
                                                                    <a href={msg.attachment} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', textDecoration: 'none', padding: '0.5rem', background: 'rgba(0,0,0,0.05)', borderRadius: '6px' }}>
                                                                        <span style={{ fontSize: '1.2rem' }}>📄</span>
                                                                        <span>Download File</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}

                                                        {(!msg.attachment || !msg.content.startsWith('Sent a file:')) && msg.content && (
                                                            <div className={styles.messageContent}>
                                                                {msg.is_broadcast && (
                                                                    <span className={styles.broadcastBadge}>Broadcast</span>
                                                                )}
                                                                {sharedPost ? (
                                                                    <div
                                                                        style={{
                                                                            border: '1px solid var(--color-border)',
                                                                            borderRadius: '10px',
                                                                            padding: '0.6rem',
                                                                            background: 'rgba(255,255,255,0.03)',
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            gap: '0.45rem',
                                                                        }}
                                                                    >
                                                                        {sharedPost.image_url && (
                                                                            <img
                                                                                src={sharedPost.image_url}
                                                                                alt={sharedPost.title || 'Shared post image'}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    maxHeight: '180px',
                                                                                    objectFit: 'cover',
                                                                                    borderRadius: '8px',
                                                                                }}
                                                                            />
                                                                        )}
                                                                        <div style={{ fontWeight: 700 }}>
                                                                            {sharedPost.title || 'Shared Post'}
                                                                        </div>
                                                                        {sharedPost.excerpt && (
                                                                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.86rem' }}>
                                                                                {sharedPost.excerpt}
                                                                            </div>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => router.push(`/posts/${sharedPost.post_id}`)}
                                                                            style={{
                                                                                alignSelf: 'flex-start',
                                                                                border: '1px solid var(--color-border)',
                                                                                borderRadius: '999px',
                                                                                padding: '0.28rem 0.7rem',
                                                                                fontSize: '0.8rem',
                                                                                color: 'var(--color-primary-light)',
                                                                            }}
                                                                        >
                                                                            View Post
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    msg.content
                                                                )}
                                                                {msg.is_edited && <span className={styles.editedLabel}>(edited)</span>}
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {/* Action Menu - Show for all messages to allow pinning, but specific actions are protected inside the component */}
                                                {!isEditing && !msg.is_deleted && (
                                                    <div className={styles.actionMenuWrapper}>
                                                        <MessageActionMenu
                                                            isOwner={msg.sender.id === user.id}
                                                            isStaff={user.user_type === 'staff'}
                                                            isPinned={!!msg.is_pinned}
                                                            onEdit={() => handleEditStart(msg)}
                                                            onDelete={() => handleDelete(msg.id)}
                                                            onPin={() => handlePin(msg.id)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            {typingUser && (
                                <div style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.8rem',
                                    color: 'var(--color-text-secondary)',
                                    fontStyle: 'italic'
                                }}>
                                    {typingUser} is typing...
                                </div>
                            )}



                            <form className={styles.messageForm} onSubmit={handleSendMessage}>
                                {showEmojiPicker && (
                                    <div ref={emojiPickerRef} style={{ position: 'absolute', bottom: '80px', left: '1rem', zIndex: 10 }}>
                                        <EmojiPicker
                                            onEmojiClick={onEmojiClick}
                                            theme={resolvedTheme === 'light' ? Theme.LIGHT : Theme.DARK}
                                            width={300}
                                            height={400}
                                            autoFocusSearch={false}
                                        />
                                    </div>
                                )}
                                {/* File Preview Section */}
                                {selectedFiles.length > 0 && (
                                    <div className={styles.filePreviewContainer}>
                                        {selectedFiles.map((file, index) => {
                                            const isImage = file.type.startsWith('image/');
                                            const previewUrl = isImage ? URL.createObjectURL(file) : null;

                                            return (
                                                <div key={index} className={styles.filePreviewItem}>
                                                    <button
                                                        type="button"
                                                        className={styles.removeFileBtn}
                                                        onClick={() => removeFile(index)}
                                                        title="Remove file"
                                                    >
                                                        ×
                                                    </button>
                                                    {isImage && previewUrl ? (
                                                        <img src={previewUrl} alt={file.name} className={styles.previewImage} />
                                                    ) : (
                                                        <div className={styles.fileIcon}>📄</div>
                                                    )}
                                                    <div className={styles.fileName}>{file.name}</div>
                                                    <div className={styles.fileSize}>
                                                        {(file.size / 1024).toFixed(1)} KB
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Upload Progress Indicator */}
                                {isUploading && uploadProgress.total > 0 && (
                                    <div className={styles.uploadProgressContainer}>
                                        <div className={styles.uploadProgressBar}>
                                            <div
                                                className={styles.uploadProgressFill}
                                                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                            />
                                        </div>
                                        <div className={styles.uploadProgressText}>
                                            Uploading file {uploadProgress.current} of {uploadProgress.total}...
                                        </div>
                                    </div>
                                )}
                                {isUploading && (
                                    <div className={styles.uploadingIndicator}>
                                        <div className="spinner-small"></div>
                                        <span>Uploading file...</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                    multiple
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={styles.attachButton}
                                    disabled={!isConnected}
                                    style={{
                                        marginRight: '0.5rem',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        color: 'var(--color-text-secondary)'
                                    }}
                                    title="Attach file"
                                >
                                    📎
                                </button>
                                {user.user_type === 'agent' && selectedRoomData?.room_type === 'direct_agent' && (
                                    <button
                                        type="button"
                                        onClick={openQuickReplies}
                                        className={styles.emojiButton}
                                        style={{
                                            marginRight: '0.5rem',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '1.05rem',
                                            color: 'var(--color-text-secondary)'
                                        }}
                                        title="Instant replies"
                                    >
                                        ⚡
                                    </button>
                                )}
                                <button
                                    type="button"
                                    ref={emojiButtonRef}
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={styles.emojiButton}
                                    style={{
                                        marginRight: '0.5rem',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        color: 'var(--color-text-secondary)'
                                    }}
                                    title="Add emoji"
                                >
                                    😊
                                </button>
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={handleInput}
                                    placeholder="Type your message..."
                                    className={styles.messageInput}
                                    disabled={!isConnected || (selectedRoomData && selectedRoomData.status !== 'OPEN')}
                                />
                                <button
                                    type="submit"
                                    className={styles.sendButton}
                                    disabled={(!messageInput.trim() && selectedFiles.length === 0) || !isConnected}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                </button>
                                {user.user_type === 'agent' && selectedRoomData?.room_type === 'group' && selectedRoomData.user_is_group_admin && (
                                    <button
                                        type="button"
                                        className={styles.headerActionBtn}
                                        onClick={sendBroadcast}
                                        disabled={!messageInput.trim() || sendingBroadcast}
                                        title="Send as broadcast message"
                                    >
                                        {sendingBroadcast ? '...' : 'Broadcast'}
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                </div >
            </main >

            <Modal
                isOpen={leaveModalOpen}
                onClose={() => setLeaveModalOpen(false)}
                title="Leave Queue"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                            onClick={() => setLeaveModalOpen(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '5px',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmLeaveRoom}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '5px',
                                border: 'none',
                                background: '#ef4444',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Leave Queue
                        </button>
                    </div>
                }
            >
                <p>Are you sure you want to stop monitoring this queue? You will stop receiving new chats from it.</p>
            </Modal>

            <Modal
                isOpen={leaveAllModalOpen}
                onClose={() => setLeaveAllModalOpen(false)}
                title="Leave All Stations"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                            onClick={() => setLeaveAllModalOpen(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '5px',
                                border: '1px solid var(--color-border)',
                                background: 'var(--color-bg-tertiary)',
                                color: 'var(--color-text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmLeaveAllRooms}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '5px',
                                border: 'none',
                                background: '#ef4444',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Leave All
                        </button>
                    </div>
                }
            >
                <p>Are you sure you want to stop monitoring <strong>ALL</strong> stations? You will stop receiving chats from all queues.</p>
            </Modal>

            <Modal
                isOpen={showStationBrowser}
                onClose={() => setShowStationBrowser(false)}
                title="Select a Station to Join"
            >
                <div style={{ display: 'grid', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
                    {supportRooms.filter(room => {
                        const isMyRoom = mySupportRooms.some(r => r.id === room.id);
                        const isOccupied = room.staff && !isMyRoom;
                        return !isOccupied && !isMyRoom; // Show only if free and not already joined
                    }).map(room => {
                        const isMyRoom = mySupportRooms.some(r => r.id === room.id);
                        const isOccupied = room.staff && !isMyRoom;

                        return (
                            <div
                                key={room.id}
                                className={`${styles.supportRoomCard} ${isMyRoom ? styles.active : ''} ${isOccupied ? styles.occupied : ''}`}
                                onClick={() => {
                                    if (!isOccupied && !isMyRoom) {
                                        handleEnterSupportRoom(room.id);
                                        setShowStationBrowser(false);
                                    }
                                }}
                            >
                                <div className={styles.roomName}>{room.name}</div>
                                <div className={styles.roomStatus}>
                                    {isMyRoom ? 'Active' : isOccupied ? `Occupied by ${room.staff.username}` : 'Available'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Modal>

            <Modal
                isOpen={agentSearchOpen}
                onClose={() => setAgentSearchOpen(false)}
                title="Find Agents"
            >
                <div className={styles.agentSearchModalContent}>
                    <input
                        type="text"
                        value={agentSearchQuery}
                        onChange={(e) => setAgentSearchQuery(e.target.value)}
                        placeholder="Search agents by username"
                        className={styles.agentSearchInput}
                    />

                    {isSearchingAgents && (
                        <div className={styles.agentSearchInfo}>Searching...</div>
                    )}
                    {agentSearchError && (
                        <div className={styles.agentSearchError}>{agentSearchError}</div>
                    )}

                    <div className={styles.agentSearchList}>
                        {agentSearchResults.length === 0 && !isSearchingAgents ? (
                            <div className={styles.agentSearchInfo}>No agents found.</div>
                        ) : (
                            agentSearchResults.map((agent) => (
                                <div key={agent.id} className={styles.agentSearchItem}>
                                    <div className={styles.agentSearchIdentity}>
                                        <div className={styles.agentSearchAvatar}>
                                            {(agent.username || 'A').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className={styles.agentSearchName}>{agent.username}</div>
                                            <div className={styles.agentSearchNote}>
                                                {agent.agent_status_note || (agent.is_verified ? 'Verified agent' : 'Agent')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.agentSearchActions}>
                                        <span
                                            className={styles.agentAvailabilityBadge}
                                            style={{
                                                borderColor: availabilityColor(agent.agent_availability),
                                                color: availabilityColor(agent.agent_availability),
                                                background: `${availabilityColor(agent.agent_availability)}22`,
                                            }}
                                        >
                                            {availabilityLabel(agent.agent_availability)}
                                        </span>
                                        <button
                                            className={styles.agentChatBtn}
                                            onClick={() => startDirectAgentChat(agent.id)}
                                            disabled={agent.agent_availability === 'offline'}
                                        >
                                            {agent.agent_availability === 'offline' ? 'Offline' : 'Chat'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={chatSwitcherOpen}
                onClose={() => setChatSwitcherOpen(false)}
                title="Chats"
            >
                <div className={styles.mobileChatSwitcherList}>
                    {user.user_type === 'agent' ? (
                        <>
                            {agentSupportRoom && renderRoomListButton(agentSupportRoom, () => setChatSwitcherOpen(false))}
                            <div className={styles.agentChatsHeader}>Message Requests</div>
                            {messageRequestRooms.length > 0 ? (
                                messageRequestRooms.map((room) => renderMessageRequestItem(room, () => setChatSwitcherOpen(false)))
                            ) : (
                                <div className={styles.noRooms}>No message requests</div>
                            )}
                            <div className={styles.agentChatsHeader}>Chats</div>
                            <div className={styles.agentFilterRow}>
                                <button
                                    className={`${styles.agentFilterPill} ${agentChatFilter === 'all' ? styles.activeFilter : ''}`}
                                    onClick={() => setAgentChatFilter('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={`${styles.agentFilterPill} ${agentChatFilter === 'needs_reply' ? styles.activeFilter : ''}`}
                                    onClick={() => setAgentChatFilter('needs_reply')}
                                >
                                    Needs Reply
                                </button>
                                <button
                                    className={`${styles.agentFilterPill} ${agentChatFilter === 'unread' ? styles.activeFilter : ''}`}
                                    onClick={() => setAgentChatFilter('unread')}
                                >
                                    Unread
                                </button>
                            </div>
                            {agentDirectRooms.length > 0 ? (
                                agentDirectRooms.map((room) => renderRoomListButton(room, () => setChatSwitcherOpen(false)))
                            ) : (
                                <div className={styles.noRooms}>No direct chats</div>
                            )}
                            <div className={styles.agentChatsHeader}>Groups</div>
                            <div className={styles.agentFilterRow}>
                                <button
                                    className={styles.agentFilterPill}
                                    onClick={() => {
                                        setChatSwitcherOpen(false);
                                        setGroupDiscoverOpen(true);
                                    }}
                                >
                                    Browse
                                </button>
                                <button
                                    className={styles.agentFilterPill}
                                    onClick={() => {
                                        setChatSwitcherOpen(false);
                                        setCreateGroupOpen(true);
                                    }}
                                >
                                    New
                                </button>
                                <button
                                    className={styles.agentFilterPill}
                                    onClick={() => {
                                        setChatSwitcherOpen(false);
                                        openGroupRequests();
                                    }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                >
                                    Requests
                                    {pendingGroupRequestCount > 0 && (
                                        <span className={styles.unreadBadge} style={{ minWidth: '16px', height: '16px', fontSize: '0.62rem', padding: '0 4px', marginTop: 0 }}>
                                            {pendingGroupRequestCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                            {agentGroupRooms.length > 0 ? (
                                agentGroupRooms.map((room) => renderRoomListButton(room, () => setChatSwitcherOpen(false)))
                            ) : (
                                <div className={styles.noRooms}>No groups</div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className={styles.agentFilterRow}>
                                <button
                                    className={styles.agentFilterPill}
                                    onClick={() => {
                                        setChatSwitcherOpen(false);
                                        setAgentSearchOpen(true);
                                    }}
                                >
                                    Find Agents
                                </button>
                            </div>
                            {clientSupportRoom && renderRoomListButton(clientSupportRoom, () => setChatSwitcherOpen(false))}
                            <div className={styles.agentChatsHeader}>Message Requests</div>
                            {messageRequestRooms.length > 0 ? (
                                messageRequestRooms.map((room) => renderMessageRequestItem(room, () => setChatSwitcherOpen(false)))
                            ) : (
                                <div className={styles.noRooms}>No message requests</div>
                            )}
                            {clientDirectRooms.length > 0 && (
                                <>
                                    <div className={styles.agentChatsHeader}>Chats</div>
                                    {clientDirectRooms.map((room) => renderRoomListButton(room, () => setChatSwitcherOpen(false)))}
                                </>
                            )}
                            <div className={styles.agentChatsHeader}>Groups</div>
                            <div className={styles.agentFilterRow}>
                                <button
                                    className={styles.agentFilterPill}
                                    onClick={() => {
                                        setChatSwitcherOpen(false);
                                        setGroupDiscoverOpen(true);
                                    }}
                                >
                                    Browse
                                </button>
                            </div>
                            {clientGroupRooms.length > 0 ? (
                                clientGroupRooms.map((room) => renderRoomListButton(room, () => setChatSwitcherOpen(false)))
                            ) : (
                                <div className={styles.noRooms}>No groups</div>
                            )}
                        </>
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={groupDiscoverOpen}
                onClose={() => setGroupDiscoverOpen(false)}
                title="Discover Groups"
            >
                <div className={styles.agentSearchModalContent}>
                    <input
                        type="text"
                        value={groupDiscoverQuery}
                        onChange={(e) => setGroupDiscoverQuery(e.target.value)}
                        placeholder="Search groups by name"
                        className={styles.agentSearchInput}
                    />
                    {isDiscoveringGroups && (
                        <div className={styles.agentSearchInfo}>Loading groups...</div>
                    )}
                    {groupDiscoverError && (
                        <div className={styles.agentSearchError}>{groupDiscoverError}</div>
                    )}
                    <div className={styles.agentSearchList}>
                        {groupDiscoverResults.length === 0 && !isDiscoveringGroups ? (
                            <div className={styles.agentSearchInfo}>No groups found.</div>
                        ) : (
                            groupDiscoverResults.map((group) => (
                                <div key={group.id} className={styles.agentSearchItem}>
                                    <div className={styles.agentSearchIdentity}>
                                        <div className={styles.agentSearchAvatar}>
                                            {(group.name || 'G').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className={styles.agentSearchName}>{group.name}</div>
                                            <div className={styles.agentSearchNote}>
                                                {group.group_description || 'No description'}
                                            </div>
                                            <div className={styles.agentSearchNote}>
                                                {group.member_count} members {group.group_admin ? `• admin ${group.group_admin}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.agentSearchActions}>
                                        {group.relation === 'member' || group.relation === 'admin' ? (
                                            <button
                                                className={styles.agentChatBtn}
                                                onClick={async () => {
                                                    await fetchRooms();
                                                    switchToRoom(group.id, true);
                                                    setGroupDiscoverOpen(false);
                                                }}
                                            >
                                                Open
                                            </button>
                                        ) : group.relation === 'pending' ? (
                                            <span className={styles.agentAvailabilityBadge}>Pending</span>
                                        ) : user.user_type === 'player' ? (
                                            <button
                                                className={styles.agentChatBtn}
                                                onClick={() => requestGroupJoin(group.id)}
                                            >
                                                Request Join
                                            </button>
                                        ) : (
                                            <span className={styles.agentAvailabilityBadge}>View</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={createGroupOpen}
                onClose={() => setCreateGroupOpen(false)}
                title="Create Group"
            >
                <div className={styles.quickReplyCreator}>
                    <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Group name"
                        className={styles.quickReplyInput}
                    />
                    <textarea
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className={styles.quickReplyTextarea}
                        rows={3}
                    />
                    <button
                        className={styles.quickReplySaveBtn}
                        onClick={createGroup}
                        disabled={isCreatingGroup || !newGroupName.trim()}
                    >
                        {isCreatingGroup ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </Modal>

            <Modal
                isOpen={groupRequestsOpen}
                onClose={() => setGroupRequestsOpen(false)}
                title="Group Join Requests"
            >
                <div className={styles.quickRepliesList}>
                    {isLoadingGroupRequests ? (
                        <div className={styles.agentSearchInfo}>Loading requests...</div>
                    ) : groupJoinRequests.length === 0 ? (
                        <div className={styles.agentSearchInfo}>No pending requests.</div>
                    ) : (
                        groupJoinRequests.map((requestItem) => (
                            <div key={requestItem.id} className={styles.quickReplyItem}>
                                <div className={styles.quickReplyTexts}>
                                    <div className={styles.quickReplyTitle}>{requestItem.player.username}</div>
                                    <div className={styles.quickReplyContent}>wants to join {requestItem.room.name}</div>
                                </div>
                                <div className={styles.quickReplyActions}>
                                    <button
                                        className={styles.quickReplyUseBtn}
                                        onClick={() => reviewGroupJoinRequest(requestItem.id, 'approve')}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        className={styles.quickReplyDeleteBtn}
                                        onClick={() => reviewGroupJoinRequest(requestItem.id, 'reject')}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={groupMembersOpen}
                onClose={() => setGroupMembersOpen(false)}
                title="Group Members"
            >
                <div className={styles.quickRepliesList}>
                    {isLoadingGroupMembers ? (
                        <div className={styles.agentSearchInfo}>Loading members...</div>
                    ) : groupMembers.length === 0 ? (
                        <div className={styles.agentSearchInfo}>No members available.</div>
                    ) : (
                        groupMembers.map((member) => (
                            <div key={member.id} className={styles.quickReplyItem}>
                                <div className={styles.quickReplyTexts}>
                                    <div className={styles.quickReplyTitle}>{member.username}</div>
                                    <div className={styles.quickReplyContent}>{member.user_type}</div>
                                </div>
                                {member.user_type === 'player' && (
                                    <div className={styles.quickReplyActions}>
                                        <button
                                            className={styles.quickReplyUseBtn}
                                            onClick={() => startDirectFromGroup(member.id)}
                                        >
                                            Direct Chat
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={deleteGroupModalOpen}
                onClose={() => setDeleteGroupModalOpen(false)}
                title="Delete Group"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                            onClick={() => setDeleteGroupModalOpen(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: '1px solid var(--color-border)',
                                background: 'transparent',
                                color: 'var(--color-text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={deleteCurrentGroup}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#ef4444',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                            disabled={isDeletingGroup}
                        >
                            {isDeletingGroup ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                }
            >
                <p>This will permanently delete this group and its messages. This action cannot be undone.</p>
            </Modal>

            <Modal
                isOpen={leaveGroupModalOpen}
                onClose={() => setLeaveGroupModalOpen(false)}
                title="Leave Group"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                            onClick={() => setLeaveGroupModalOpen(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: '1px solid var(--color-border)',
                                background: 'transparent',
                                color: 'var(--color-text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={leaveCurrentGroup}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#ef4444',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                            disabled={isLeavingGroup}
                        >
                            {isLeavingGroup ? 'Leaving...' : 'Leave Group'}
                        </button>
                    </div>
                }
            >
                <p>You will no longer receive messages from this group unless you request to join again.</p>
            </Modal>

            <Modal
                isOpen={quickRepliesOpen}
                onClose={() => {
                    setQuickRepliesOpen(false);
                    setShowQuickReplyCreateForm(false);
                    setQuickReplyTitle('');
                    setQuickReplyContent('');
                }}
                title="Instant Replies"
            >
                <div className={styles.quickRepliesModal}>
                    {isQuickRepliesLoading ? (
                        <div className={styles.agentSearchInfo}>Loading replies...</div>
                    ) : quickReplies.length === 0 ? (
                        <div className={styles.agentSearchInfo}>No quick replies yet.</div>
                    ) : (
                        <div className={styles.quickRepliesList}>
                            {quickReplies.map((reply) => (
                                <div key={reply.id} className={styles.quickReplyItem}>
                                    <div className={styles.quickReplyTexts}>
                                        <div className={styles.quickReplyTitle}>{reply.title}</div>
                                        <div className={styles.quickReplyContent}>{reply.content}</div>
                                    </div>
                                    <div className={styles.quickReplyActions}>
                                        <button
                                            className={styles.quickReplyUseBtn}
                                            onClick={() => applyQuickReply(reply.content)}
                                        >
                                            Use
                                        </button>
                                        <button
                                            className={styles.quickReplyDeleteBtn}
                                            onClick={() => deleteQuickReply(reply.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {showQuickReplyCreateForm ? (
                        <div className={styles.quickReplyCreator}>
                            <input
                                type="text"
                                value={quickReplyTitle}
                                onChange={(e) => setQuickReplyTitle(e.target.value)}
                                placeholder="Reply title"
                                className={styles.quickReplyInput}
                            />
                            <textarea
                                value={quickReplyContent}
                                onChange={(e) => setQuickReplyContent(e.target.value)}
                                placeholder="Reply content"
                                className={styles.quickReplyTextarea}
                                rows={3}
                            />
                            <div className={styles.quickReplyCreateActions}>
                                <button
                                    className={styles.quickReplyCancelBtn}
                                    onClick={() => {
                                        setShowQuickReplyCreateForm(false);
                                        setQuickReplyTitle('');
                                        setQuickReplyContent('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className={styles.quickReplySaveBtn}
                                    onClick={createQuickReply}
                                    disabled={isSavingQuickReply || !quickReplyTitle.trim() || !quickReplyContent.trim()}
                                >
                                    {isSavingQuickReply ? 'Saving...' : 'Save Reply'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            className={styles.quickReplyAddBtn}
                            onClick={() => setShowQuickReplyCreateForm(true)}
                        >
                            Add New
                        </button>
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={internalNoteOpen}
                onClose={() => setInternalNoteOpen(false)}
                title="Internal Note"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                            onClick={() => setInternalNoteOpen(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: '1px solid var(--color-border)',
                                background: 'transparent',
                                color: 'var(--color-text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={saveInternalNote}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'var(--color-primary)',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                            disabled={isSavingInternalNote}
                        >
                            {isSavingInternalNote ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                }
            >
                <textarea
                    value={internalNoteValue}
                    onChange={(e) => setInternalNoteValue(e.target.value)}
                    rows={8}
                    className={styles.internalNoteTextarea}
                    placeholder="Add private notes for this chat..."
                />
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Message"
                footer={
                    <>
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'transparent',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--color-text-primary)',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            style={{
                                padding: '0.5rem 1rem',
                                background: '#ef4444',
                                border: 'none',
                                color: 'white',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Delete
                        </button>
                    </>
                }
            >
                <p>Are you sure you want to delete this message? This action cannot be undone.</p>
            </Modal>

            {/* Switch Station Modal */}
            <Modal
                isOpen={switchModalOpen}
                onClose={() => setSwitchModalOpen(false)}
                title="Switch Support Station"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                            onClick={() => setSwitchModalOpen(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '5px',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmSwitchStation}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '5px',
                                border: 'none',
                                background: 'var(--color-primary)',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Switch Station
                        </button>
                    </div>
                }
            >
                <p>Are you sure you want to switch to a different support station? You will be moved to the next available queue.</p>
            </Modal>

            {/* Toast Notification */}
            {
                toast.isVisible && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                    />
                )
            }
        </div >
    );
}

export default function ChatPage() {
    return (
        <Suspense
            fallback={
                <div className={styles.pageWrapper}>
                    <Header />
                    <main className={styles.main}>
                        <div className={styles.container}>
                            <div className={styles.loading}>
                                <div className="spinner"></div>
                            </div>
                        </div>
                    </main>
                </div>
            }
        >
            <ChatPageContent />
        </Suspense>
    );
}

