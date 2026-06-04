'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { FeaturedEventCard } from '@/components/events/FeaturedEventCard';
import { PostCard } from '@/components/posts/PostCard';
import { ShareToChatModal } from '@/components/posts/ShareToChatModal';
import { apiClient } from '@/lib/api';
import { postApi } from '@/lib/posts';
import { hasCompletedSocialOnboarding, socialApi } from '@/lib/social';
import { Post } from '@/types';
import styles from './page.module.css';

export default function HomePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [events, setEvents] = useState<any[]>([]);
    const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);
    const [postsError, setPostsError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }

        if (!user) return;

        const fetchData = async () => {
            if (user.user_type === 'player') {
                try {
                    const onboardingState = await socialApi.fetchOnboardingState();
                    if (!hasCompletedSocialOnboarding(onboardingState)) {
                        router.replace('/onboarding');
                        return;
                    }
                } catch {
                    router.replace('/onboarding');
                    return;
                }
            }

            try {
                const [eventsResponse, pinnedResponse] = await Promise.all([
                    apiClient.get<any[]>('/api/events/active/'),
                    postApi.listPinned(),
                ]);
                setEvents(eventsResponse);
                setPinnedPosts(pinnedResponse);
            } catch (err) {
                console.error('Failed to fetch home data', err);
                setPostsError('Failed to load pinned posts.');
            } finally {
                setPostsLoading(false);
            }
        };

        fetchData();
    }, [user, loading, router]);

    const handleLike = async (post: Post) => {
        const result = await postApi.toggleLike(post.id);
        setPinnedPosts((prev) =>
            prev.map((item) =>
                item.id === post.id
                    ? { ...item, is_liked: result.liked, like_count: result.like_count }
                    : item
            )
        );
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <>
            <Header />
            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.mainContent}>
                        <div className={styles.hero}>
                            {events.length > 0 && (
                                <div className={styles.eventsSection}>
                                    <h2 className="gradient-text">Current Events</h2>
                                    <div className={styles.eventGrid}>
                                        {events.map((event) => (
                                            <FeaturedEventCard key={event.id} event={event} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <section className={styles.pinnedSection}>
                                <div className={styles.sectionHeader}>
                                    <h2 className={styles.sectionTitle}>Pinned Posts</h2>
                                    <button
                                        type="button"
                                        className={styles.sectionAction}
                                        onClick={() => router.push('/posts')}
                                    >
                                        View All
                                    </button>
                                </div>

                                {postsError && <p className={styles.emptyState}>{postsError}</p>}

                                {postsLoading ? (
                                    <div className={styles.smallLoading}>
                                        <div className="spinner"></div>
                                    </div>
                                ) : pinnedPosts.length === 0 ? (
                                    <p className={styles.emptyState}>No pinned posts available.</p>
                                ) : (
                                    <div className={styles.pinnedList}>
                                        {pinnedPosts.map((post) => (
                                            <PostCard
                                                key={post.id}
                                                post={post}
                                                compact
                                                onLike={handleLike}
                                                onShare={setSharingPost}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                </div>
            </main>

            <ShareToChatModal
                post={sharingPost}
                isOpen={!!sharingPost}
                onClose={() => setSharingPost(null)}
            />
        </>
    );
}
