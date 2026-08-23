'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/social/UserAvatar';
import { storiesApi } from '@/lib/stories';
import { StoryGroup } from '@/types';
import styles from './StoriesRow.module.css';

interface StoriesRowProps {
    groups: StoryGroup[];
    onOpenViewer: (startIndex: number) => void;
    onStoryCreated: () => void;
}

export function StoriesRow({ groups, onOpenViewer, onStoryCreated }: StoriesRowProps) {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const ownGroupIndex = groups.findIndex((group) => group.is_own);
    const ownGroup = ownGroupIndex >= 0 ? groups[ownGroupIndex] : null;
    const otherGroups = groups.filter((group) => !group.is_own);

    const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setUploading(true);
        try {
            await storiesApi.create(file);
            onStoryCreated();
        } catch {
            // no-op - a failed upload just leaves the row unchanged, user can retry
        } finally {
            setUploading(false);
        }
    };

    if (!user) return null;

    return (
        <div className={styles.row}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={handleFileSelected}
            />

            <button
                type="button"
                className={styles.tile}
                onClick={() => (ownGroup ? onOpenViewer(ownGroupIndex) : fileInputRef.current?.click())}
                disabled={uploading}
            >
                <div className={styles.avatarWrap}>
                    <div className={`${styles.ring} ${ownGroup ? styles.ringMuted : ''}`}>
                        <UserAvatar user={user} size={56} />
                    </div>
                    <button
                        type="button"
                        className={styles.addBadge}
                        onClick={(event) => {
                            event.stopPropagation();
                            fileInputRef.current?.click();
                        }}
                        aria-label="Add story"
                        disabled={uploading}
                    >
                        {uploading ? '...' : '+'}
                    </button>
                </div>
                <span className={styles.tileLabel}>Add Story</span>
            </button>

            {otherGroups.map((group) => {
                const groupIndex = groups.indexOf(group);
                return (
                    <button
                        key={group.author.id}
                        type="button"
                        className={styles.tile}
                        onClick={() => onOpenViewer(groupIndex)}
                    >
                        <div className={`${styles.ring} ${group.has_unviewed ? styles.ringActive : styles.ringMuted}`}>
                            <UserAvatar user={group.author} size={56} />
                        </div>
                        <span className={styles.tileLabel}>{group.author.username}</span>
                    </button>
                );
            })}
        </div>
    );
}
