'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RankBadge } from '@/components/home/RankBadge';
import { xpApi } from '@/lib/xp';
import { RankTiersResponse } from '@/types';
import styles from './page.module.css';

export default function LevelsPage() {
    const [data, setData] = useState<RankTiersResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        xpApi.getRankTiers()
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    const currentTier = useMemo(() => data?.tiers.find((t) => t.is_current) || null, [data]);

    return (
        <DashboardLayout>
            <main className={styles.main}>
                <header className={styles.hero}>
                    <span className={styles.heroIcon} aria-hidden="true">👑</span>
                    <h1 className={styles.heroTitle}>Rollin <span>Levels</span></h1>
                    <p className={styles.heroTagline}>Climb the ranks. Earn epic rewards. Join the elite.</p>
                </header>

                {loading ? (
                    <div className={styles.loadingArea}><div className="spinner"></div></div>
                ) : !data || !currentTier ? (
                    <div className={styles.emptyState}>Unable to load your level right now.</div>
                ) : (
                    <>
                        <Link href={`/levels/${currentTier.slug}`} className={styles.currentCard}>
                            <div className={styles.currentCardCol}>
                                <RankBadge rank={currentTier.slug} size="md" />
                                <div>
                                    <span className={styles.currentCardLabel}>Current Level</span>
                                    <strong className={styles.currentCardValue}>{currentTier.label}</strong>
                                </div>
                            </div>
                            <div className={styles.currentCardDivider} aria-hidden="true" />
                            <div className={styles.currentCardCol}>
                                <span className={styles.currentCardLabel}>Total XP</span>
                                <strong className={styles.currentCardValue}>{data.caller.total_xp.toLocaleString()}</strong>
                            </div>
                        </Link>

                        <section className={styles.tierList}>
                            {data.tiers.map((tier) => (
                                <Link
                                    key={tier.slug}
                                    href={`/levels/${tier.slug}`}
                                    className={`${styles.tierRow} ${tier.is_current ? styles.tierRowCurrent : ''} ${!tier.is_unlocked ? styles.tierRowLocked : ''}`}
                                >
                                    <RankBadge rank={tier.slug} size="md" />
                                    <div className={styles.tierRowInfo}>
                                        <span className={styles.tierRowLabel}>{tier.label}</span>
                                        <span className={styles.tierRowRange}>
                                            {tier.min_xp.toLocaleString()}{tier.max_xp != null ? ` - ${tier.max_xp.toLocaleString()}` : '+'} XP
                                        </span>
                                    </div>
                                    {tier.is_current && <span className={styles.tierRowBadge}>Current</span>}
                                    <ChevronIcon />
                                </Link>
                            ))}
                        </section>

                        <section className={styles.howItWorks}>
                            <h2 className={styles.howItWorksTitle}>How XP Works</h2>
                            <div className={styles.howItWorksGrid}>
                                <div className={styles.howItWorksItem}>
                                    <span className={styles.howItWorksIcon} aria-hidden="true">🎮</span>
                                    <strong>1. Play Games</strong>
                                    <p>Earn XP for every game you play and enjoy.</p>
                                </div>
                                <div className={styles.howItWorksItem}>
                                    <span className={styles.howItWorksIcon} aria-hidden="true">🎯</span>
                                    <strong>2. Complete Challenges</strong>
                                    <p>Daily & weekly challenges give big XP boosts.</p>
                                </div>
                                <div className={styles.howItWorksItem}>
                                    <span className={styles.howItWorksIcon} aria-hidden="true">👥</span>
                                    <strong>3. Join the Community</strong>
                                    <p>Engage, chat, and participate to earn XP.</p>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </main>
        </DashboardLayout>
    );
}

function ChevronIcon() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}>
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}
