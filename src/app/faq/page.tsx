'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { FAQInput, faqApi } from '@/lib/faqs';
import { FAQ } from '@/types';
import styles from './page.module.css';

const categoryFilters = [
    { label: 'All', value: 'all' },
    { label: 'General', value: 'general' },
    { label: 'Account', value: 'account' },
    { label: 'Community', value: 'community' },
    { label: 'Rewards', value: 'rewards' },
    { label: 'Events', value: 'events' },
    { label: 'Security', value: 'security' },
    { label: 'Technical', value: 'technical' },
];

const categoryOptions = categoryFilters.filter((item) => item.value !== 'all');

const audienceOptions = [
    { label: 'All Members', value: 'all' },
    { label: 'Players', value: 'players' },
    { label: 'Agents', value: 'agents' },
    { label: 'Staff', value: 'staff' },
];

const emptyForm: FAQInput = {
    question: '',
    answer: '',
    category: 'general',
    audience: 'all',
    sort_order: 0,
    is_featured: false,
    is_published: true,
};

export default function FaqPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [openIds, setOpenIds] = useState<number[]>([]);
    const [formOpen, setFormOpen] = useState(false);
    const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
    const [formData, setFormData] = useState<FAQInput>(emptyForm);
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const isStaff = user?.user_type === 'staff';

    const loadFaqs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = isStaff ? await faqApi.listManage() : await faqApi.list();
            setFaqs(list);
            setOpenIds((current) => current.filter((id) => list.some((faq) => faq.id === id)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load FAQ content');
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
        loadFaqs();
    }, [authLoading, loadFaqs, router, user]);

    const filteredFaqs = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return faqs.filter((faq) => {
            const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
            const searchable = `${faq.question} ${stripHtml(faq.answer)} ${faq.category_label || faq.category}`.toLowerCase();
            const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
            return matchesCategory && matchesSearch;
        });
    }, [activeCategory, faqs, searchTerm]);

    const featuredFaqs = useMemo(() => faqs.filter((faq) => faq.is_featured).slice(0, 3), [faqs]);
    const categoryCount = useMemo(() => new Set(faqs.map((faq) => faq.category)).size, [faqs]);

    const toggleOpen = (id: number) => {
        setOpenIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    };

    const openCreateForm = () => {
        setEditingFaq(null);
        setFormData(emptyForm);
        setFormError(null);
        setFormOpen(true);
    };

    const openEditForm = (faq: FAQ) => {
        setEditingFaq(faq);
        setFormData({
            question: faq.question,
            answer: faq.answer || '',
            category: faq.category || 'general',
            audience: faq.audience || 'all',
            sort_order: faq.sort_order || 0,
            is_featured: faq.is_featured,
            is_published: faq.is_published,
        });
        setFormError(null);
        setFormOpen(true);
    };

    const closeForm = () => {
        if (formSaving) return;
        setFormOpen(false);
        setEditingFaq(null);
        setFormData(emptyForm);
        setFormError(null);
    };

    const submitForm = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!formData.question.trim()) {
            setFormError('Question is required.');
            return;
        }
        if (!formData.answer.trim()) {
            setFormError('Answer is required.');
            return;
        }

        setFormSaving(true);
        setFormError(null);
        try {
            if (editingFaq) {
                await faqApi.update(editingFaq.id, formData);
            } else {
                await faqApi.create(formData);
            }
            setFormOpen(false);
            setEditingFaq(null);
            setFormData(emptyForm);
            await loadFaqs();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Unable to save FAQ.');
        } finally {
            setFormSaving(false);
        }
    };

    const deleteFaq = async (faq: FAQ) => {
        const confirmed = window.confirm(`Delete "${faq.question}"? This cannot be undone.`);
        if (!confirmed) return;

        setError(null);
        try {
            await faqApi.delete(faq.id);
            await loadFaqs();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to delete FAQ.');
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
                title="FAQ"
                eyebrow="Support"
                description="Quick answers for accounts, community features, rewards, events, and platform support."
                width="wide"
            >
                <section className={styles.heroPanel}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroEyebrow}>Help Center</span>
                        <h2>Find the answer without leaving the community.</h2>
                        <p>Browse official answers maintained by the Rollin team and filtered for your account type.</p>
                    </div>
                    <div className={styles.statGrid}>
                        <div className={styles.statCard}>
                            <span>Answers</span>
                            <strong>{faqs.length}</strong>
                        </div>
                        <div className={styles.statCard}>
                            <span>Categories</span>
                            <strong>{categoryCount}</strong>
                        </div>
                        <div className={styles.statCard}>
                            <span>Featured</span>
                            <strong>{featuredFaqs.length}</strong>
                        </div>
                    </div>
                </section>

                <section className={styles.toolsPanel}>
                    <label className={styles.searchBox}>
                        <span>Search FAQ</span>
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search questions, answers, or categories"
                        />
                    </label>
                    <div className={styles.filterTabs} aria-label="FAQ categories">
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
                    {isStaff && (
                        <button type="button" className={styles.createBtn} onClick={openCreateForm}>
                            Create FAQ
                        </button>
                    )}
                </section>

                {error && (
                    <section className={styles.errorBox}>
                        <span>{error}</span>
                        <button type="button" onClick={loadFaqs}>Retry</button>
                    </section>
                )}

                {loading ? (
                    <section className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </section>
                ) : faqs.length === 0 ? (
                    <section className={styles.emptyBox}>
                        <span>No FAQs published yet</span>
                        <p>Answers will appear here once the Rollin team publishes them from the admin dashboard.</p>
                    </section>
                ) : (
                    <>
                        {featuredFaqs.length > 0 && (
                            <section className={styles.featuredGrid} aria-label="Featured FAQs">
                                {featuredFaqs.map((faq) => (
                                    <button
                                        key={faq.id}
                                        type="button"
                                        className={styles.featuredCard}
                                        onClick={() => toggleOpen(faq.id)}
                                    >
                                        <span>{faq.category_label || faq.category}</span>
                                        <strong>{faq.question}</strong>
                                        {isStaff && !faq.is_published && <small className={styles.draftBadge}>Draft</small>}
                                    </button>
                                ))}
                            </section>
                        )}

                        {filteredFaqs.length === 0 ? (
                            <section className={styles.emptyBox}>
                                <span>No matching answers</span>
                                <p>Try another category or search term.</p>
                            </section>
                        ) : (
                            <section className={styles.faqList} aria-label="FAQ answers">
                                {filteredFaqs.map((faq) => {
                                    const isOpen = openIds.includes(faq.id);
                                    return (
                                        <article key={faq.id} className={`${styles.faqCard} ${isOpen ? styles.openCard : ''}`}>
                                            <button
                                                type="button"
                                                className={styles.questionButton}
                                                aria-expanded={isOpen}
                                                onClick={() => toggleOpen(faq.id)}
                                            >
                                                <span className={styles.categoryBadge}>{faq.category_label || faq.category}</span>
                                                {isStaff && !faq.is_published && <span className={styles.draftBadge}>Draft</span>}
                                                <strong>{faq.question}</strong>
                                                <span className={styles.toggleMark}>{isOpen ? '-' : '+'}</span>
                                            </button>
                                            {isStaff && (
                                                <StaffFaqActions faq={faq} onEdit={openEditForm} onDelete={deleteFaq} />
                                            )}
                                            {isOpen && (
                                                <div
                                                    className={styles.answer}
                                                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                                                />
                                            )}
                                        </article>
                                    );
                                })}
                            </section>
                        )}
                    </>
                )}
            </PageShell>

            {formOpen && (
                <FAQFormModal
                    editingFaq={editingFaq}
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

function StaffFaqActions({
    faq,
    onEdit,
    onDelete,
}: {
    faq: FAQ;
    onEdit: (faq: FAQ) => void;
    onDelete: (faq: FAQ) => void;
}) {
    return (
        <div className={styles.staffActions}>
            <button type="button" className={styles.editBtn} onClick={() => onEdit(faq)}>
                Edit
            </button>
            <button type="button" className={styles.deleteBtn} onClick={() => onDelete(faq)}>
                Delete
            </button>
        </div>
    );
}

function FAQFormModal({
    editingFaq,
    formData,
    formError,
    saving,
    onChange,
    onClose,
    onSubmit,
}: {
    editingFaq: FAQ | null;
    formData: FAQInput;
    formError: string | null;
    saving: boolean;
    onChange: (next: FAQInput) => void;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    const setField = <K extends keyof FAQInput>(field: K, value: FAQInput[K]) => {
        onChange({ ...formData, [field]: value });
    };

    return (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
            <form className={styles.faqForm} onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
                <header className={styles.formHeader}>
                    <div>
                        <span>{editingFaq ? 'Edit FAQ' : 'New FAQ'}</span>
                        <h2>{editingFaq ? 'Update FAQ' : 'Create FAQ'}</h2>
                    </div>
                    <button type="button" onClick={onClose} disabled={saving} aria-label="Close FAQ form">×</button>
                </header>

                {formError && <p className={styles.formError}>{formError}</p>}

                <label className={styles.formField}>
                    <span>Question</span>
                    <input
                        type="text"
                        value={formData.question}
                        onChange={(event) => setField('question', event.target.value)}
                        placeholder="What should users ask?"
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
                        <span>Sort order</span>
                        <input
                            type="number"
                            min="0"
                            value={formData.sort_order}
                            onChange={(event) => setField('sort_order', Number(event.target.value || 0))}
                            disabled={saving}
                        />
                    </label>
                </div>

                <label className={styles.formField}>
                    <span>Answer</span>
                    <textarea
                        value={formData.answer}
                        onChange={(event) => setField('answer', event.target.value)}
                        placeholder="Write the answer. HTML is supported."
                        disabled={saving}
                        rows={8}
                    />
                </label>

                <div className={styles.toggleRow}>
                    <label>
                        <input
                            type="checkbox"
                            checked={formData.is_featured}
                            onChange={(event) => setField('is_featured', event.target.checked)}
                            disabled={saving}
                        />
                        <span>Feature FAQ</span>
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
                    <button type="submit" disabled={saving}>{saving ? 'Saving...' : editingFaq ? 'Update' : 'Create'}</button>
                </footer>
            </form>
        </div>
    );
}

function stripHtml(value: string) {
    return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
