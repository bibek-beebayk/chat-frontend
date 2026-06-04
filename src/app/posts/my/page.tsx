'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { PostCard } from '@/components/posts/PostCard';
import { ShareToChatModal } from '@/components/posts/ShareToChatModal';
import { useAuth } from '@/contexts/AuthContext';
import { postApi } from '@/lib/posts';
import { Post } from '@/types';
import styles from './page.module.css';

export default function MyPostsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await postApi.listMine();
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
        const result = await postApi.toggleLike(post.id);
        setPosts((prev) => prev.map((item) => (item.id === post.id ? { ...item, is_liked: result.liked, like_count: result.like_count } : item)));
    };

    const handleDelete = async (post: Post) => {
        const ok = window.confirm('Delete this post?');
        if (!ok) return;
        setDeletingId(post.id);
        try {
            await postApi.delete(post.id);
            setPosts((prev) => prev.filter((item) => item.id !== post.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete post');
        } finally {
            setDeletingId(null);
        }
    };

    if (authLoading || !user) {
        return (
            <div className={styles.pageWrap}>
                <Header />
                <main className={styles.main}>
                    <div className="spinner"></div>
                </main>
            </div>
        );
    }

    return (
        <div className={styles.pageWrap}>
            <Header />
            <main className={styles.main}>
                <section className={styles.topRow}>
                    <div>
                        <h1 className={styles.title}>My Posts</h1>
                        <p className={styles.subtitle}>Manage your published posts.</p>
                    </div>
                    <button type="button" className={styles.primaryBtn} onClick={() => router.push('/posts/create')}>
                        Create Post
                    </button>
                </section>

                {error && <p className={styles.errorBox}>{error}</p>}
                {deletingId && <p className={styles.infoBox}>Deleting post...</p>}

                {loading ? (
                    <section className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </section>
                ) : posts.length === 0 ? (
                    <section className={styles.emptyBox}>You have not posted anything yet.</section>
                ) : (
                    <section className={styles.feedList}>
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onLike={handleLike}
                                onShare={setSharingPost}
                                onEdit={() => router.push(`/posts/${post.id}/edit`)}
                                onDelete={handleDelete}
                                showOwnerActions
                            />
                        ))}
                    </section>
                )}
            </main>

            <ShareToChatModal post={sharingPost} isOpen={!!sharingPost} onClose={() => setSharingPost(null)} />
        </div>
    );
}
