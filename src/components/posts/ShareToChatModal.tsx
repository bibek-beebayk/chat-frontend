'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { postApi, ShareableRoom } from '@/lib/posts';
import { Post } from '@/types';
import styles from './ShareToChatModal.module.css';

interface ShareToChatModalProps {
    post: Post | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ShareToChatModal({ post, isOpen, onClose }: ShareToChatModalProps) {
    const [rooms, setRooms] = useState<ShareableRoom[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setSelectedIds([]);
            setError(null);
            return;
        }

        const run = async () => {
            setLoading(true);
            setError(null);
            try {
                const list = await postApi.listShareableRooms();
                setRooms(list);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load chats');
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [isOpen]);

    const toggle = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);

    const submitShare = async () => {
        if (!post || selectedIds.length === 0) return;
        setSending(true);
        setError(null);
        try {
            await postApi.shareToChats(post.id, selectedIds);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to share post');
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Share Post"
            footer={
                <div className={styles.footer}>
                    <button type="button" className={styles.cancelBtn} onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className={styles.sendBtn} disabled={sending || selectedCount === 0} onClick={submitShare}>
                        {sending ? 'Sending...' : `Send (${selectedCount})`}
                    </button>
                </div>
            }
        >
            <div className={styles.body}>
                {error && <p className={styles.error}>{error}</p>}
                {loading ? (
                    <div className={styles.loading}>Loading chats...</div>
                ) : rooms.length === 0 ? (
                    <div className={styles.empty}>No direct/group chats available.</div>
                ) : (
                    <ul className={styles.list}>
                        {rooms.map((room) => {
                            const selected = selectedIds.includes(room.id);
                            const fallbackLetter = room.display_name?.trim()?.[0]?.toUpperCase() || 'C';
                            return (
                                <li key={room.id} className={styles.item}>
                                    <button
                                        type="button"
                                        className={`${styles.itemBtn} ${selected ? styles.selected : ''}`}
                                        onClick={() => toggle(room.id)}
                                    >
                                        <span className={styles.avatarWrap}>
                                            {room.avatar_url ? (
                                                <img src={room.avatar_url} alt={room.display_name} className={styles.avatar} />
                                            ) : (
                                                <span className={styles.avatarFallback}>{fallbackLetter}</span>
                                            )}
                                        </span>
                                        <span className={styles.itemTextWrap}>
                                            <span className={styles.itemTitle}>{room.display_name}</span>
                                            <span className={styles.itemSubtitle}>{room.subtitle}</span>
                                        </span>
                                        <span className={styles.checkbox}>{selected ? 'v' : ''}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </Modal>
    );
}
