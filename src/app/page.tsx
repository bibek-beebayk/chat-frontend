'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { analyticsApi } from '@/lib/analytics';
import { postApi } from '@/lib/posts';
import { hasCompletedSocialOnboarding, socialApi } from '@/lib/social';
import { HomeStats, Post } from '@/types';
import styles from './page.module.css';

const featureLinks = [
    { title: 'Weekly', label: 'Rewards', icon: <GiftIcon /> },
    { title: 'Exclusive', label: 'Events', icon: <CalendarIcon /> },
    { title: 'Direct', label: 'Support', icon: <ChatIcon /> },
    // { title: 'VIP', label: 'Access', icon: <CrownIcon /> },
];

export default function HomePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
    const [homeStats, setHomeStats] = useState<HomeStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(true);
    const [postsError, setPostsError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }

        if (!user) return;

        const loadHomeData = async () => {
            setPostsLoading(true);
            setStatsLoading(true);
            setPostsError(null);

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
                const stats = await analyticsApi.getHomeStats();
                setHomeStats(stats);
            } catch {
                setHomeStats(null);
            } finally {
                setStatsLoading(false);
            }

            try {
                const pinned = await postApi.listPinned();
                setPinnedPosts(pinned);
            } catch {
                setPostsError('Failed to load pinned posts.');
            } finally {
                setPostsLoading(false);
            }
        };

        loadHomeData();
    }, [user, loading, router]);

    const handleLike = async (post: Post) => {
        const optimisticLiked = !post.is_liked;
        setPinnedPosts((prev) =>
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
            setPinnedPosts((prev) =>
                prev.map((item) =>
                    item.id === post.id
                        ? { ...item, is_liked: result.liked, like_count: result.like_count }
                        : item
                )
            );
        } catch {
            setPinnedPosts((prev) =>
                prev.map((item) =>
                    item.id === post.id
                        ? {
                            ...item,
                            is_liked: post.is_liked,
                            like_count: post.like_count,
                        }
                        : item
                )
            );
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className={styles.loading}>
                    <div className="spinner"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!user) return null;
    const stats = buildStats(homeStats, statsLoading);

    return (
        <DashboardLayout rightSidebar={<RightSidebar />}>
            <div className={styles.home}>
                <section className={styles.hero}>
                    <div className={styles.heroCopy}>
                        <p className={styles.eyebrow}>Welcome to</p>
                        <h1>Rollin Community</h1>
                        <p className={styles.heroText}>The official community for Hi-Rollin players.</p>

                        <div className={styles.featureGrid}>
                            {featureLinks.map((item) => (
                                <div key={`${item.title}-${item.label}`} className={styles.featureItem}>
                                    <span className={styles.featureIcon}>{item.icon}</span>
                                    <span>
                                        <strong>{item.title}</strong>
                                        <small>{item.label}</small>
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className={styles.heroActions}>
                            <button type="button" className={styles.primaryAction} onClick={() => router.push('/chat')}>
                                <ChatIcon />
                                Join Community Chat
                            </button>
                            {/* <button type="button" className={styles.secondaryAction} onClick={() => router.push('/games')}>
                                <GamepadIcon />
                                Play Demo
                            </button> */}
                        </div>
                    </div>

                    <div className={styles.heroArt} aria-hidden="true">
                        <img src="/logo-2.png" alt="" className={styles.heroLogo} />
                    </div>
                </section>

                <section className={styles.statsGrid} aria-label="Community statistics">
                    {stats.map((stat) => (
                        <article key={stat.label} className={styles.statCard}>
                            <span className={`${styles.statIcon} ${styles[stat.tone]}`}>{stat.icon}</span>
                            <p>{stat.label}</p>
                            <strong>{stat.value}</strong>
                            <small>{stat.detail}</small>
                        </article>
                    ))}
                </section>

                <section className={styles.feedPanel}>
                    <header className={styles.feedHeader}>
                        <h2>Pinned Posts</h2>
                        <button type="button" className={styles.sortButton} onClick={() => router.push('/posts')}>
                            View All
                        </button>
                    </header>

                    <div className={styles.feedList}>
                        {postsError ? (
                            <div className={styles.feedState}>{postsError}</div>
                        ) : postsLoading ? (
                            <div className={styles.feedState}>
                                <div className="spinner"></div>
                            </div>
                        ) : pinnedPosts.length === 0 ? (
                            <div className={styles.feedState}>No pinned posts available.</div>
                        ) : (
                            pinnedPosts.map((post) => (
                                <PinnedPostCard
                                    key={post.id}
                                    post={post}
                                    onLike={handleLike}
                                    onOpen={() => router.push(`/posts/${post.id}`)}
                                />
                            ))
                        )}

                        {/* <article className={styles.pollCard}>
                            <div className={styles.feedAvatar}>CP</div>
                            <div className={styles.feedBody}>
                                <div className={styles.feedMetaRow}>
                                    <div>
                                        <strong>Community Poll</strong>
                                        <span>1d ago</span>
                                    </div>
                                </div>
                                <h3>What game would you like to see featured next?</h3>
                                <PollOption label="Fishing Games" value={65} />
                                <PollOption label="Slot Games" value={25} />
                                <PollOption label="Table Games" value={10} />
                                <footer className={styles.feedFooter}>
                                    <span>122 Votes</span>
                                    <button type="button" className={styles.viewPostButton}>Vote Now</button>
                                </footer>
                            </div>
                        </article> */}
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}

function buildStats(homeStats: HomeStats | null, loading: boolean) {
    const fallback = loading ? '...' : '0';
    return [
        {
            label: 'Community Members',
            value: homeStats ? formatCount(homeStats.active_members) : fallback,
            detail: 'Active Accounts',
            tone: 'purple',
            icon: <MembersIcon />,
        },
        {
            label: 'Online Now',
            value: homeStats ? formatCount(homeStats.online_now) : fallback,
            detail: 'Seen in 15 Minutes',
            tone: 'green',
            icon: <SignalIcon />,
        },
        {
            label: 'Redeemable Bonuses',
            value: homeStats ? formatCount(homeStats.redeemable_bonuses) : fallback,
            detail: 'Streak Rewards Ready',
            tone: 'gold',
            icon: <GiftIcon />,
        },
        {
            label: 'Active Events',
            value: homeStats ? formatCount(homeStats.active_events) : fallback,
            detail: 'Running Now',
            tone: 'blue',
            icon: <CalendarIcon />,
        },
    ];
}

function formatCount(value: number): string {
    if (value >= 1000) {
        return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    }
    return new Intl.NumberFormat('en').format(value);
}

function PinnedPostCard({ post, onLike, onOpen }: { post: Post; onLike: (post: Post) => void; onOpen: () => void }) {
    const plainContent = useMemo(() => stripHtml(post.content || ''), [post.content]);
    const excerpt = plainContent.length > 180 ? `${plainContent.slice(0, 180).trimEnd()}...` : plainContent;
    const firstImage = useMemo(() => {
        const images = (post.images || []).map((item) => item.image).filter(Boolean);
        return images[0] || post.image || null;
    }, [post.image, post.images]);
    const initials = getInitials(post.author.username);
    const avatarUrl = post.author.profile_thumbnail || post.author.profile_picture || post.author.avatar || null;
    const roleLabel = post.author.user_type === 'staff' ? 'Admin' : post.author.user_type;
    const createdAt = new Date(post.created_at);

    return (
        <article className={styles.feedCard}>
            <div className={styles.feedAvatar}>
                {avatarUrl ? (
                    <img src={avatarUrl} alt={post.author.username} className={styles.feedAvatarImage} />
                ) : (
                    initials
                )}
            </div>
            <div className={styles.feedBody}>
                <div className={styles.feedMetaRow}>
                    <div>
                        <strong>{post.author.username}</strong>
                        <span className={styles.roleBadge}>{roleLabel}</span>
                        <span>Pinned · {formatPostDate(createdAt)}</span>
                    </div>
                    <span className={styles.pinnedBadge}>Pinned</span>
                </div>

                <div className={styles.feedContentRow}>
                    <div className={styles.feedTextBlock}>
                        <h3>{post.title || excerpt || `Post #${post.id}`}</h3>
                        {excerpt && <p>{excerpt}</p>}
                    </div>
                    {firstImage && (
                        <button type="button" className={styles.feedMediaImageButton} onClick={onOpen} aria-label="Open post image">
                            <img src={firstImage} alt={post.title || 'Pinned post image'} className={styles.feedMediaImage} />
                        </button>
                    )}
                </div>

                <footer className={styles.feedFooter}>
                    <button
                        type="button"
                        className={`${styles.inlineAction} ${post.is_liked ? styles.likedInlineAction : ''}`}
                        onClick={() => onLike(post)}
                    >
                        <LikeIcon /> {post.like_count || 0}
                    </button>
                    <span><CommentIcon /> {post.comment_count || 0}</span>
                    <button type="button" className={styles.viewPostButton} onClick={onOpen}>View Post</button>
                </footer>
            </div>
        </article>
    );
}

function stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getInitials(username: string): string {
    const parts = username.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return username.slice(0, 2).toUpperCase() || 'RC';
}

function formatPostDate(date: Date): string {
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function PollOption({ label, value }: { label: string; value: number }) {
    return (
        <div className={styles.pollOption}>
            <div className={styles.pollTop}>
                <span>{label}</span>
                <strong>{value}%</strong>
            </div>
            <div className={styles.pollTrack}>
                <span style={{ width: `${value}%` }}></span>
            </div>
        </div>
    );
}

function MembersIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function SignalIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 20h.01" />
            <path d="M7 20a5 5 0 0 1 5-5" />
            <path d="M7 15a10 10 0 0 1 10 10" transform="translate(0 -5)" />
            <path d="M7 10a15 15 0 0 1 15 15" transform="translate(0 -5)" />
        </svg>
    );
}

function GiftIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="8" width="18" height="13" rx="2" />
            <path d="M12 8v13" />
            <path d="M3 12h18" />
            <path d="M12 8H8.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8z" />
            <path d="M12 8h3.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8z" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4" />
            <path d="M8 2v4" />
            <path d="M3 10h18" />
        </svg>
    );
}

function ChatIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
    );
}

function CrownIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m2 8 5 4 5-8 5 8 5-4-2 11H4L2 8z" />
        </svg>
    );
}

function GamepadIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="10" rx="4" />
            <path d="M8 12h.01" />
            <path d="M12 12h.01" />
            <path d="M16 12h.01" />
        </svg>
    );
}

function ChevronDownIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}

function LikeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 10v11" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h3l4.4-6.6a2 2 0 0 1 3.6 1.48z" />
        </svg>
    );
}

function CommentIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
    );
}
