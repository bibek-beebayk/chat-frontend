'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { announcementApi } from '@/lib/announcements';
import { Announcement } from '@/types';
import styles from './page.module.css';

export default function AnnouncementDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user, loading: authLoading } = useAuth();
    const announcementId = Number(params?.id);

    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAnnouncement = useCallback(async () => {
        if (!announcementId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await announcementApi.getById(announcementId);
            setAnnouncement(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load announcement');
        } finally {
            setLoading(false);
        }
    }, [announcementId]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (!user) return;
        loadAnnouncement();
    }, [authLoading, loadAnnouncement, router, user]);

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
            <main className={styles.main}>
                <button type="button" className={styles.backBtn} onClick={() => router.push('/announcements')}>
                    <span aria-hidden="true">‹</span>
                    Announcements
                </button>

                {error && <p className={styles.errorBox}>{error}</p>}

                {loading ? (
                    <section className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </section>
                ) : announcement ? (
                    <article className={styles.articleShell}>
                        {announcement.cover_image && (
                            <div className={styles.coverWrap}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={announcement.cover_image} alt="" className={styles.coverImage} />
                            </div>
                        )}

                        <header className={styles.articleHeader}>
                            <div className={styles.badgeRow}>
                                {announcement.is_pinned && <span className={styles.pinnedBadge}>Pinned</span>}
                                <span className={`${styles.priorityBadge} ${styles[announcement.priority] || ''}`}>
                                    {announcement.priority_label || announcement.priority}
                                </span>
                                <span className={styles.categoryBadge}>{announcement.category_label || announcement.category}</span>
                            </div>
                            <h1>{announcement.title}</h1>
                            {announcement.summary && <p>{announcement.summary}</p>}
                            <div className={styles.metaRow}>
                                <span>{formatDate(announcement.published_at || announcement.created_at)}</span>
                                <span>{announcement.audience_label || announcement.audience}</span>
                                {announcement.created_by?.username && <span>By {announcement.created_by.username}</span>}
                            </div>
                        </header>

                        <div
                            className={styles.content}
                            dangerouslySetInnerHTML={{ __html: announcement.content || '<p>No additional details were added.</p>' }}
                        />
                    </article>
                ) : (
                    <section className={styles.emptyBox}>
                        <span>Announcement not found</span>
                        <p>It may have been unpublished or moved.</p>
                    </section>
                )}
            </main>
        </DashboardLayout>
    );
}

function formatDate(value?: string | null) {
    if (!value) return 'Recently';
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
