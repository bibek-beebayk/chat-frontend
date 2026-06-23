'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { AnnouncementInput, announcementApi } from '@/lib/announcements';
import { Announcement } from '@/types';
import styles from './page.module.css';

const categoryFilters = [
    { label: 'All', value: 'all' },
    { label: 'Events', value: 'event' },
    { label: 'Rewards', value: 'reward' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'VIP', value: 'vip' },
];

const categoryOptions = [
    { label: 'General', value: 'general' },
    { label: 'Event', value: 'event' },
    { label: 'Reward', value: 'reward' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'Security', value: 'security' },
    { label: 'VIP', value: 'vip' },
];

const audienceOptions = [
    { label: 'All Members', value: 'all' },
    { label: 'Players', value: 'players' },
    { label: 'Agents', value: 'agents' },
    { label: 'Staff', value: 'staff' },
];

const priorityOptions = [
    { label: 'Normal', value: 'normal' },
    { label: 'Important', value: 'important' },
    { label: 'Urgent', value: 'urgent' },
];

const emptyForm: AnnouncementInput = {
    title: '',
    summary: '',
    content: '',
    category: 'general',
    audience: 'all',
    priority: 'normal',
    is_pinned: false,
    is_published: true,
    cover_image: null,
};

export default function AnnouncementsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [formOpen, setFormOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
    const [formData, setFormData] = useState<AnnouncementInput>(emptyForm);
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const isStaff = user?.user_type === 'staff';

    const loadAnnouncements = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = isStaff ? await announcementApi.listManage() : await announcementApi.list();
            setAnnouncements(list);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load announcements');
        } finally {
            setLoading(false);
        }
    }, [isStaff]);

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

    const openCreateForm = () => {
        setEditingAnnouncement(null);
        setFormData(emptyForm);
        setFormError(null);
        setFormOpen(true);
    };

    const openEditForm = (announcement: Announcement) => {
        setEditingAnnouncement(announcement);
        setFormData({
            title: announcement.title,
            summary: announcement.summary || '',
            content: announcement.content || '',
            category: announcement.category || 'general',
            audience: announcement.audience || 'all',
            priority: announcement.priority || 'normal',
            is_pinned: announcement.is_pinned,
            is_published: announcement.is_published,
            cover_image: null,
        });
        setFormError(null);
        setFormOpen(true);
    };

    const closeForm = () => {
        if (formSaving) return;
        setFormOpen(false);
        setEditingAnnouncement(null);
        setFormData(emptyForm);
        setFormError(null);
    };

    const submitForm = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!formData.title.trim()) {
            setFormError('Title is required.');
            return;
        }

        setFormSaving(true);
        setFormError(null);
        try {
            if (editingAnnouncement) {
                await announcementApi.update(editingAnnouncement.id, formData);
            } else {
                await announcementApi.create(formData);
            }
            setFormOpen(false);
            setEditingAnnouncement(null);
            setFormData(emptyForm);
            await loadAnnouncements();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Unable to save announcement.');
        } finally {
            setFormSaving(false);
        }
    };

    const deleteAnnouncement = async (announcement: Announcement) => {
        const confirmed = window.confirm(`Delete "${announcement.title}"? This cannot be undone.`);
        if (!confirmed) return;

        setError(null);
        try {
            await announcementApi.delete(announcement.id);
            await loadAnnouncements();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to delete announcement.');
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
                    {isStaff && (
                        <button type="button" className={styles.createBtn} onClick={openCreateForm}>
                            Create Announcement
                        </button>
                    )}
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
                                        {isStaff && !pinned.is_published && <span className={styles.draftBadge}>Draft</span>}
                                        <PriorityBadge priority={pinned.priority} label={pinned.priority_label} />
                                    </div>
                                    <h2>{pinned.title}</h2>
                                    <p>{pinned.summary || stripHtml(pinned.content).slice(0, 160)}</p>
                                    <div className={styles.cardMeta}>
                                        <span>{pinned.category_label || pinned.category}</span>
                                        <span>{formatDate(pinned.published_at || pinned.created_at)}</span>
                                    </div>
                                    {isStaff && (
                                        <StaffAnnouncementActions
                                            announcement={pinned}
                                            onEdit={openEditForm}
                                            onDelete={deleteAnnouncement}
                                        />
                                    )}
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
                                                {isStaff && !announcement.is_published && <span className={styles.draftBadge}>Draft</span>}
                                                <PriorityBadge priority={announcement.priority} label={announcement.priority_label} />
                                            </div>
                                            <h2>{announcement.title}</h2>
                                            <p>{announcement.summary || stripHtml(announcement.content).slice(0, 130)}</p>
                                            <div className={styles.cardMeta}>
                                                <span>{announcement.category_label || announcement.category}</span>
                                                <span>{formatDate(announcement.published_at || announcement.created_at)}</span>
                                            </div>
                                            {isStaff && (
                                                <StaffAnnouncementActions
                                                    announcement={announcement}
                                                    onEdit={openEditForm}
                                                    onDelete={deleteAnnouncement}
                                                />
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </section>
                        )}
                    </>
                )}
            </PageShell>

            {formOpen && (
                <AnnouncementFormModal
                    editingAnnouncement={editingAnnouncement}
                    formData={formData}
                    formError={formError}
                    saving={formSaving}
                    onChange={setFormData}
                    onClose={closeForm}
                    onSubmit={submitForm}
                />
            )}
        </DashboardLayout>
    );
}

function StaffAnnouncementActions({
    announcement,
    onEdit,
    onDelete,
}: {
    announcement: Announcement;
    onEdit: (announcement: Announcement) => void;
    onDelete: (announcement: Announcement) => void;
}) {
    return (
        <div className={styles.staffActions} onClick={(event) => event.stopPropagation()}>
            <button type="button" className={styles.editBtn} onClick={() => onEdit(announcement)}>
                Edit
            </button>
            <button type="button" className={styles.deleteBtn} onClick={() => onDelete(announcement)}>
                Delete
            </button>
        </div>
    );
}

function AnnouncementFormModal({
    editingAnnouncement,
    formData,
    formError,
    saving,
    onChange,
    onClose,
    onSubmit,
}: {
    editingAnnouncement: Announcement | null;
    formData: AnnouncementInput;
    formError: string | null;
    saving: boolean;
    onChange: (next: AnnouncementInput) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    const setField = <K extends keyof AnnouncementInput>(field: K, value: AnnouncementInput[K]) => {
        onChange({ ...formData, [field]: value });
    };

    return (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
            <form className={styles.announcementForm} onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
                <header className={styles.formHeader}>
                    <div>
                        <span>{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</span>
                        <h2>{editingAnnouncement ? 'Update announcement' : 'Create announcement'}</h2>
                    </div>
                    <button type="button" onClick={onClose} disabled={saving} aria-label="Close announcement form">×</button>
                </header>

                {formError && <p className={styles.errorBox}>{formError}</p>}

                <label className={styles.formField}>
                    <span>Title</span>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(event) => setField('title', event.target.value)}
                        placeholder="Announcement title"
                        disabled={saving}
                    />
                </label>

                <label className={styles.formField}>
                    <span>Summary</span>
                    <input
                        type="text"
                        value={formData.summary || ''}
                        onChange={(event) => setField('summary', event.target.value)}
                        placeholder="Short preview text"
                        disabled={saving}
                    />
                </label>

                <div className={styles.formGrid}>
                    <label className={styles.formField}>
                        <span>Category</span>
                        <select value={formData.category} onChange={(event) => setField('category', event.target.value)} disabled={saving}>
                            {categoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.formField}>
                        <span>Audience</span>
                        <select value={formData.audience} onChange={(event) => setField('audience', event.target.value)} disabled={saving}>
                            {audienceOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.formField}>
                        <span>Priority</span>
                        <select value={formData.priority} onChange={(event) => setField('priority', event.target.value)} disabled={saving}>
                            {priorityOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <label className={styles.formField}>
                    <span>Content</span>
                    <textarea
                        value={formData.content || ''}
                        onChange={(event) => setField('content', event.target.value)}
                        placeholder="Write the full announcement. HTML is supported."
                        disabled={saving}
                        rows={8}
                    />
                </label>

                <label className={styles.formField}>
                    <span>Cover image</span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setField('cover_image', event.target.files?.[0] || null)}
                        disabled={saving}
                    />
                    {editingAnnouncement?.cover_image && <small>Leave empty to keep the current cover image.</small>}
                </label>

                <div className={styles.toggleRow}>
                    <label>
                        <input
                            type="checkbox"
                            checked={formData.is_pinned}
                            onChange={(event) => setField('is_pinned', event.target.checked)}
                            disabled={saving}
                        />
                        <span>Pin announcement</span>
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={formData.is_published}
                            onChange={(event) => setField('is_published', event.target.checked)}
                            disabled={saving}
                        />
                        <span>Publish now</span>
                    </label>
                </div>

                <footer className={styles.formActions}>
                    <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="submit" disabled={saving}>{saving ? 'Saving...' : editingAnnouncement ? 'Update' : 'Create'}</button>
                </footer>
            </form>
        </div>
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
