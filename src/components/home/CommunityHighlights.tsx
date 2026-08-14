'use client';

import Link from 'next/link';
import { Post } from '@/types';
import { PostCard } from '@/components/posts/PostCard';
import { SkeletonText } from '@/components/ui/Skeleton';
import styles from './CommunityHighlights.module.css';

interface CommunityHighlightsProps {
    posts: Post[] | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}

export function CommunityHighlights({ posts, loading, error, onRetry }: CommunityHighlightsProps) {
    return (
        <div className={styles.section}>
            <div className={styles.header}>
                <h3>Community Highlights</h3>
                <Link href="/posts" className={styles.headerLink}>View Full Feed</Link>
            </div>

            {loading && !posts ? (
                <div className={styles.grid}><SkeletonText lines={4} /></div>
            ) : error && !posts ? (
                <div className={styles.emptyState}>
                    Unable to load community posts.
                    <button type="button" className={styles.retryBtn} onClick={onRetry}>Retry</button>
                </div>
            ) : !posts || posts.length === 0 ? (
                <div className={styles.emptyState}>No community posts yet.</div>
            ) : (
                <div className={styles.grid}>
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} compact showFooterActions={false} />
                    ))}
                </div>
            )}
        </div>
    );
}
