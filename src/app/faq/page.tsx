'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { faqApi } from '@/lib/faqs';
import { FAQ } from '@/types';
import styles from './page.module.css';

const categoryFilters = [
    { label: 'All', value: 'all' },
    { label: 'Account', value: 'account' },
    { label: 'Community', value: 'community' },
    { label: 'Rewards', value: 'rewards' },
    { label: 'Events', value: 'events' },
    { label: 'Security', value: 'security' },
    { label: 'Technical', value: 'technical' },
];

export default function FaqPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [openIds, setOpenIds] = useState<number[]>([]);

    const loadFaqs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await faqApi.list();
            setFaqs(list);
            setOpenIds((current) => current.filter((id) => list.some((faq) => faq.id === id)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load FAQ content');
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
                                                <strong>{faq.question}</strong>
                                                <span className={styles.toggleMark}>{isOpen ? '-' : '+'}</span>
                                            </button>
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
        </DashboardLayout>
    );
}

function stripHtml(value: string) {
    return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
