'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { announcementApi } from '@/lib/announcements';
import { Announcement } from '@/types';
import styles from './page.module.css';

const categoryFilters = [
    { label: 'All', value: 'all' },
    { label: 'Events', value: 'event' },
    { label: 'Rewards', value: 'reward' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'VIP', value: 'vip' },
];

export default function AnnouncementsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState('all');

    const loadAnnouncements = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await announcementApi.list();
            setAnnouncements(list);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load announcements');
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
        loadAnnouncements();
    }, [authLoading, loadAnnouncements, router, user]);

    const pinned = useMemo(() => announcements.find((item) => item.is_pinned), [announcements]);
    const filtered = useMemo(() => {
        const items = activeCategory === 'all'
            ? announcements
            : announcements.filter((item) => item.category === activeCategory);
        return pinned ? items.filter((item) => item.id !== pinned.id) : items;
    }, [activeCategory, announcements, pinned]);

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
                title="Announcements"
                eyebrow="Community"
                description="Official Rollin Community updates, maintenance notices, rewards, and event alerts."
                width="wide"
            >
                <section className={styles.heroPanel}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroEyebrow}>Official Updates</span>
                        <h2>Stay synced with the Rollin team.</h2>
                        <p>Important changes, bonus drops, event notices, and platform updates live here first.</p>
                    </div>
                    <div className={styles.statGrid}>
                        <div className={styles.statCard}>
                            <span>Total Updates</span>
                            <strong>{announcements.length}</strong>
                        </div>
                        <div className={styles.statCard}>
                            <span>Pinned</span>
                            <strong>{announcements.filter((item) => item.is_pinned).length}</strong>
                        </div>
                        <div className={styles.statCard}>
                            <span>Audience</span>
                            <strong>{user.user_type}</strong>
                        </div>
                    </div>
                </section>

                <section className={styles.filterPanel}>
                    <div className={styles.filterTabs} aria-label="Announcement categories">
                        {categoryFilters.map((filter) => (
                            <button
                                key={filter.value}
                                type="button"
                                className={`${styles.filterBtn} ${activeCategory === filter.value ? styles.activeFilter : ''}`}
                                onClick={() => setActiveCategory(filter.value)}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                    <button type="button" className={styles.refreshBtn} onClick={loadAnnouncements}>
                        Refresh
                    </button>
                </section>

                {error && <p className={styles.errorBox}>{error}</p>}

                {loading ? (
                    <section className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </section>
                ) : announcements.length === 0 ? (
                    <section className={styles.emptyBox}>
                        <span>No announcements yet</span>
                        <p>Official updates will appear here when the Rollin team publishes them.</p>
                    </section>
                ) : (
                    <>
                        {pinned && activeCategory === 'all' && (
                            <section className={styles.featuredCard} onClick={() => router.push(`/announcements/${pinned.id}`)}>
                                <AnnouncementMedia announcement={pinned} priority />
                                <div className={styles.featuredContent}>
                                    <div className={styles.badgeRow}>
                                        <span className={styles.pinnedBadge}>Pinned</span>
                                        <PriorityBadge priority={pinned.priority} label={pinned.priority_label} />
                                    </div>
                                    <h2>{pinned.title}</h2>
                                    <p>{pinned.summary || stripHtml(pinned.content).slice(0, 160)}</p>
                                    <div className={styles.cardMeta}>
                                        <span>{pinned.category_label || pinned.category}</span>
                                        <span>{formatDate(pinned.published_at || pinned.created_at)}</span>
                                    </div>
                                </div>
                            </section>
                        )}

                        {filtered.length === 0 ? (
                            <section className={styles.emptyBox}>
                                <span>No matching announcements</span>
                                <p>Try a different category or refresh the page.</p>
                            </section>
                        ) : (
                            <section className={styles.gridList}>
                                {filtered.map((announcement) => (
                                    <article
                                        key={announcement.id}
                                        className={styles.announcementCard}
                                        onClick={() => router.push(`/announcements/${announcement.id}`)}
                                    >
                                        <AnnouncementMedia announcement={announcement} />
                                        <div className={styles.cardBody}>
                                            <div className={styles.badgeRow}>
                                                {announcement.is_pinned && <span className={styles.pinnedBadge}>Pinned</span>}
                                                <PriorityBadge priority={announcement.priority} label={announcement.priority_label} />
                                            </div>
                                            <h2>{announcement.title}</h2>
                                            <p>{announcement.summary || stripHtml(announcement.content).slice(0, 130)}</p>
                                            <div className={styles.cardMeta}>
                                                <span>{announcement.category_label || announcement.category}</span>
                                                <span>{formatDate(announcement.published_at || announcement.created_at)}</span>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </section>
                        )}
                    </>
                )}
            </PageShell>
        </DashboardLayout>
    );
}

function AnnouncementMedia({ announcement, priority = false }: { announcement: Announcement; priority?: boolean }) {
    if (announcement.cover_image) {
        return (
            <div className={styles.mediaWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={announcement.cover_image} alt="" className={styles.coverImage} loading={priority ? 'eager' : 'lazy'} />
            </div>
        );
    }

    return (
        <div className={`${styles.mediaWrap} ${styles.generatedMedia}`}>
            <span>{getCategoryInitial(announcement.category)}</span>
        </div>
    );
}

function PriorityBadge({ priority, label }: { priority: string; label?: string }) {
    return <span className={`${styles.priorityBadge} ${styles[priority] || ''}`}>{label || priority}</span>;
}

function getCategoryInitial(category: string) {
    return (category || 'A').charAt(0).toUpperCase();
}

function stripHtml(value: string) {
    return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function formatDate(value?: string | null) {
    if (!value) return 'Recently';
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
