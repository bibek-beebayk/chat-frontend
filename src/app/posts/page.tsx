'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { PostCard } from '@/components/posts/PostCard';
import { ShareToChatModal } from '@/components/posts/ShareToChatModal';
import { useAuth } from '@/contexts/AuthContext';
import { postApi } from '@/lib/posts';
import { socialApi } from '@/lib/social';
import { Post } from '@/types';
import styles from './page.module.css';

type FeedTab = 'for_you' | 'connection' | 'official';

const TABS: { key: FeedTab; label: string }[] = [
    { key: 'for_you', label: 'For You' },
    { key: 'connection', label: 'Connection' },
    { key: 'official', label: 'Official' },
];

export default function PostsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);

    const [activeTab, setActiveTab] = useState<FeedTab>('for_you');

    // "Following" has no dedicated backend concept here - this app has
    // accepted connections, not a separate follow graph, so we treat
    // "posts by people you're connected with" as the closest honest match.
    const [connectionUserIds, setConnectionUserIds] = useState<Set<number> | null>(null);

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

    useEffect(() => {
        if (!user) return;
        socialApi.fetchConnections()
            .then((connections) => {
                const ids = new Set<number>();
                for (const connection of connections) {
                    if (connection.status !== 'accepted') continue;
                    const otherId = connection.requester.id === user.id ? connection.receiver.id : connection.requester.id;
                    ids.add(otherId);
                }
                setConnectionUserIds(ids);
            })
            .catch(() => setConnectionUserIds(new Set()));
    }, [user]);

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

    const visiblePosts = useMemo(() => {
        if (activeTab === 'official') return posts.filter((post) => post.author.user_type === 'staff');
        if (activeTab === 'connection') return posts.filter((post) => connectionUserIds?.has(post.author.id));
        return posts;
    }, [activeTab, connectionUserIds, posts]);

    const emptyMessage = activeTab === 'official'
        ? 'No official posts yet.'
        : activeTab === 'connection'
            ? "No posts from people you're connected with yet."
            : 'No posts yet.';

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
            <PageShell title="" eyebrow="" description="" width="wide">
                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>Community</h1>
                    <div className={styles.topActions}>
                        <button type="button" className={styles.iconBtn} onClick={() => router.push('/posts/my')} aria-label="My posts">
                            <ProfileIcon />
                        </button>
                        <button type="button" className={styles.composeBtn} onClick={() => router.push('/posts/create')} aria-label="Create post">
                            <ComposeIcon />
                        </button>
                    </div>
                </div>

                <div className={styles.tabRow} role="tablist">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.key}
                            className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabBtnActive : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {error && <p className={styles.errorBox}>{error}</p>}

                {loading ? (
                    <section className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </section>
                ) : visiblePosts.length === 0 ? (
                    <section className={styles.emptyBox}>{emptyMessage}</section>
                ) : (
                    <section className={styles.feedList}>
                        {visiblePosts.map((post) => (
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

function ProfileIcon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
            <line x1="7" y1="9" x2="17" y2="9" />
            <line x1="7" y1="13" x2="15" y2="13" />
            <line x1="7" y1="17" x2="12" y2="17" />
        </svg>
    );
}

function ComposeIcon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
    );
}
