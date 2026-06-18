'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { PostCard } from '@/components/posts/PostCard';
import { ShareToChatModal } from '@/components/posts/ShareToChatModal';
import { useAuth } from '@/contexts/AuthContext';
import { postApi } from '@/lib/posts';
import { Post } from '@/types';
import styles from './page.module.css';

export default function PostsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await postApi.listFeed();
            setPosts(list);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load posts');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (!user) return;
        loadPosts();
    }, [authLoading, user, router, loadPosts]);

    const handleLike = async (post: Post) => {
        const previous = posts;
        const optimisticLiked = !post.is_liked;
        setPosts((prev) =>
            prev.map((item) =>
                item.id === post.id
                    ? {
                        ...item,
                        is_liked: optimisticLiked,
                        like_count: Math.max(0, (item.like_count || 0) + (optimisticLiked ? 1 : -1)),
                    }
                    : item
            )
        );

        try {
            const result = await postApi.toggleLike(post.id);
            setPosts((prev) =>
                prev.map((item) =>
                    item.id === post.id
                        ? {
                            ...item,
                            is_liked: result.liked,
                            like_count: result.like_count,
                        }
                        : item
                )
            );
        } catch {
            setPosts(previous);
        }
    };

    if (authLoading || !user) {
        return (
            <DashboardLayout>
                <main className={styles.loadingArea}>
                    <div className="spinner"></div>
                </main>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <PageShell
                title="Posts"
                eyebrow="Community"
                description="Read updates, share ideas, and keep up with the latest community posts."
                width="wide"
                actions={
                    <div className={styles.topActions}>
                        <button type="button" className={styles.secondaryBtn} onClick={() => router.push('/posts/my')}>
                            My Posts
                        </button>
                        <button type="button" className={styles.primaryBtn} onClick={() => router.push('/posts/create')}>
                            Create Post
                        </button>
                    </div>
                }
            >

                {error && <p className={styles.errorBox}>{error}</p>}

                {loading ? (
                    <section className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </section>
                ) : posts.length === 0 ? (
                    <section className={styles.emptyBox}>No posts yet.</section>
                ) : (
                    <section className={styles.feedList}>
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                truncateContent
                                truncateAt={180}
                                onLike={handleLike}
                                onShare={setSharingPost}
                            />
                        ))}
                    </section>
                )}
            </PageShell>

            <ShareToChatModal post={sharingPost} isOpen={!!sharingPost} onClose={() => setSharingPost(null)} />
        </DashboardLayout>
    );
}
