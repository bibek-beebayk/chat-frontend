'use client';

import { useEffect, useRef, useState } from 'react';
import { UserAvatar } from '@/components/social/UserAvatar';
import { storiesApi } from '@/lib/stories';
import { StoryGroup } from '@/types';
import styles from './StoryViewerModal.module.css';

const STORY_DURATION_MS = 5000;

interface StoryViewerModalProps {
    groups: StoryGroup[];
    startGroupIndex: number;
    onClose: () => void;
    onStoryDeleted: () => void;
}

export function StoryViewerModal({ groups, startGroupIndex, onClose, onStoryDeleted }: StoryViewerModalProps) {
    const [groupIndex, setGroupIndex] = useState(startGroupIndex);
    const [storyIndex, setStoryIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const markedViewedRef = useRef<Set<number>>(new Set());

    const group = groups[groupIndex];
    const story = group?.stories[storyIndex];

    const goToNextStory = () => {
        if (!group) return;
        if (storyIndex < group.stories.length - 1) {
            setStoryIndex((i) => i + 1);
            return;
        }
        goToNextGroup();
    };

    const goToPrevStory = () => {
        if (storyIndex > 0) {
            setStoryIndex((i) => i - 1);
            return;
        }
        goToPrevGroup();
    };

    const goToNextGroup = () => {
        if (groupIndex >= groups.length - 1) {
            onClose();
            return;
        }
        setGroupIndex((i) => i + 1);
        setStoryIndex(0);
    };

    const goToPrevGroup = () => {
        if (groupIndex <= 0) {
            onClose();
            return;
        }
        setGroupIndex((i) => i - 1);
        setStoryIndex(0);
    };

    // Progress + auto-advance timer for the current story.
    useEffect(() => {
        setProgress(0);
        const start = Date.now();
        const interval = window.setInterval(() => {
            const elapsed = Date.now() - start;
            const pct = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);
            setProgress(pct);
            if (pct >= 100) {
                window.clearInterval(interval);
                goToNextStory();
            }
        }, 50);
        return () => window.clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupIndex, storyIndex]);

    // Mark viewed once per story (not for your own stories - nothing to view there).
    useEffect(() => {
        if (!story || !group || group.is_own) return;
        if (markedViewedRef.current.has(story.id)) return;
        markedViewedRef.current.add(story.id);
        storiesApi.markViewed(story.id).catch(() => {});
    }, [story, group]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'ArrowRight') goToNextStory();
            if (event.key === 'ArrowLeft') goToPrevStory();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupIndex, storyIndex]);

    const handleDelete = async () => {
        if (!story) return;
        if (!window.confirm('Delete this story?')) return;
        try {
            await storiesApi.delete(story.id);
            onStoryDeleted();
            if (group.stories.length <= 1) {
                onClose();
            } else {
                goToNextStory();
            }
        } catch {
            // no-op - leave the story in place, user can retry
        }
    };

    if (!group || !story) return null;

    return (
        <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
            <div className={styles.viewer} onMouseDown={(event) => event.stopPropagation()}>
                <div className={styles.progressRow}>
                    {group.stories.map((s, i) => (
                        <div key={s.id} className={styles.progressTrack}>
                            <div
                                className={styles.progressFill}
                                style={{ width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%' }}
                            />
                        </div>
                    ))}
                </div>

                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <UserAvatar user={group.author} size={32} />
                        <span className={styles.authorName}>{group.is_own ? 'You' : group.author.username}</span>
                    </div>
                    <div className={styles.headerActions}>
                        {group.is_own && (
                            <button type="button" className={styles.iconBtn} onClick={handleDelete} aria-label="Delete story">
                                <TrashIcon />
                            </button>
                        )}
                        <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
                            ×
                        </button>
                    </div>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={story.media} alt="" className={styles.media} />

                <button type="button" className={styles.tapZoneLeft} onClick={goToPrevStory} aria-label="Previous story" />
                <button type="button" className={styles.tapZoneRight} onClick={goToNextStory} aria-label="Next story" />
            </div>
        </div>
    );
}

function TrashIcon() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    );
}
