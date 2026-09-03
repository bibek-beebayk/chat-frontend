'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RankBadge } from '@/components/home/RankBadge';
import { xpApi } from '@/lib/xp';
import { RankTierEntry, RankTiersResponse } from '@/types';
import styles from './page.module.css';

export default function LevelDetailPage() {
    const router = useRouter();
    const params = useParams();
    const slug = typeof params.tier === 'string' ? params.tier : '';

    const [data, setData] = useState<RankTiersResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        xpApi.getRankTiers()
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    const tier = data?.tiers.find((t) => t.slug === slug) || null;
    const tierIndex = data ? data.tiers.findIndex((t) => t.slug === slug) : -1;
    const nextTier: RankTierEntry | null = data && tierIndex >= 0 ? data.tiers[tierIndex + 1] || null : null;

    return (
        <DashboardLayout>
            <main className={styles.main}>
                <header className={styles.topBar}>
                    <button type="button" className={styles.iconBtn} onClick={() => router.back()} aria-label="Go back">
                        <BackIcon />
                    </button>
                    <h1 className={styles.topBarTitle}>{tier ? `${tier.label} Tier` : 'Tier'}</h1>
                    <span className={styles.iconBtnSpacer} aria-hidden="true" />
                </header>

                {loading ? (
                    <div className={styles.loadingArea}><div className="spinner"></div></div>
                ) : !tier || !data ? (
                    <div className={styles.emptyState}>Tier not found.</div>
                ) : (
                    <>
                        <div className={styles.heroBlock}>
                            <RankBadge rank={tier.slug} size="lg" badgeUrl={tier.badge_url} />
                            <p className={styles.xpRange}>
                                {tier.min_xp.toLocaleString()}{tier.max_xp != null ? ` - ${tier.max_xp.toLocaleString()}` : '+'} XP
                            </p>
                        </div>

                        {tier.sub_ranges ? (
                            <TierProgressCard tier={tier} callerTotalXp={data.caller.total_xp} />
                        ) : (
                            <LegendCard tier={tier} isUnlocked={tier.is_unlocked} callerTotalXp={data.caller.total_xp} />
                        )}

                        {tier.sub_ranges && (
                            <section className={styles.sectionCard}>
                                <h3 className={styles.sectionTitle}>Sub-Levels</h3>
                                <div className={styles.subLevelRow}>
                                    {tier.sub_ranges.map((sub) => (
                                        <div key={sub.sub_level} className={styles.subLevelTile}>
                                            <span className={styles.subLevelLabel}>{tier.label} {sub.sub_level_label}</span>
                                            <span className={styles.subLevelRange}>{sub.min_xp.toLocaleString()} - {sub.max_xp.toLocaleString()} XP</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <section className={styles.sectionCard}>
                            <h3 className={styles.sectionTitle}>Tier Perks</h3>
                            <div className={styles.perksGrid}>
                                <div className={styles.perkTile}>
                                    <span className={styles.perkIcon} aria-hidden="true">🛡️</span>
                                    <strong>Profile Badge</strong>
                                    <p>Show off your {tier.label} rank</p>
                                </div>
                                {tier.rank_up_bonus_rp != null && (
                                    <div className={styles.perkTile}>
                                        <span className={styles.perkIcon} aria-hidden="true">⭐</span>
                                        <strong>+{tier.rank_up_bonus_rp.toLocaleString()} RP</strong>
                                        <p>One-time reward for reaching {tier.label}</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {nextTier && (
                            <section className={styles.nextUnlockCard}>
                                <span className={styles.nextUnlockLabel}>Next Unlock</span>
                                <strong className={styles.nextUnlockTitle}>{nextTier.label}</strong>
                                <p className={styles.nextUnlockDesc}>
                                    Reach {nextTier.min_xp.toLocaleString()} XP to unlock
                                    {nextTier.rank_up_bonus_rp != null ? ` - +${nextTier.rank_up_bonus_rp.toLocaleString()} RP` : ''}
                                </p>
                            </section>
                        )}

                        <p className={styles.tagline}>{tier.tagline}</p>
                    </>
                )}
            </main>
        </DashboardLayout>
    );
}

function TierProgressCard({ tier, callerTotalXp }: { tier: RankTierEntry; callerTotalXp: number }) {
    if (tier.is_current) {
        const activeSub = tier.sub_ranges?.find((s) => callerTotalXp <= s.max_xp) || tier.sub_ranges?.[tier.sub_ranges.length - 1];
        if (!activeSub) return null;
        const span = (activeSub.max_xp - activeSub.min_xp) + 1;
        const progress = Math.min(100, Math.max(0, Math.round(((callerTotalXp - activeSub.min_xp) / span) * 100)));
        return (
            <section className={styles.sectionCard}>
                <div className={styles.progressHeader}>
                    <span className={styles.progressLabel}>Current Level</span>
                    <strong className={styles.progressValue}>{tier.label} {activeSub.sub_level_label}</strong>
                    <span className={styles.progressXp}>{callerTotalXp.toLocaleString()} / {(activeSub.max_xp + 1).toLocaleString()} XP</span>
                </div>
                <div className={styles.progressTrack} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                </div>
            </section>
        );
    }

    if (tier.is_unlocked) {
        return (
            <section className={styles.sectionCard}>
                <div className={styles.statusRow}>
                    <CheckIcon />
                    <span>Completed - you&apos;ve already reached this tier.</span>
                </div>
            </section>
        );
    }

    return (
        <section className={styles.sectionCard}>
            <div className={styles.statusRow}>
                <LockIcon />
                <span>Locked - reach {tier.min_xp.toLocaleString()} XP to unlock.</span>
            </div>
        </section>
    );
}

function LegendCard({ tier, isUnlocked, callerTotalXp }: { tier: RankTierEntry; isUnlocked: boolean; callerTotalXp: number }) {
    if (!isUnlocked) {
        return (
            <section className={styles.sectionCard}>
                <div className={styles.statusRow}>
                    <LockIcon />
                    <span>Locked - reach {tier.min_xp.toLocaleString()} XP to unlock.</span>
                </div>
            </section>
        );
    }

    return (
        <section className={styles.legendCard}>
            <span className={styles.legendLabel}>Current Status</span>
            <strong className={styles.legendTitle}>Rollin Legend</strong>
            <span className={styles.legendXp}>{callerTotalXp.toLocaleString()} XP</span>
            <span className={styles.legendPill}>Hall of Fame Status</span>
            <div className={styles.legendPrestigeRow}>
                <span>Prestige</span>
                <strong>Permanent status</strong>
            </div>
        </section>
    );
}

function BackIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function LockIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}
