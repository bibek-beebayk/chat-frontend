'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { xpApi } from '@/lib/xp';
import { DailyProgressItem } from '@/types';
import { DailyChallengesCard } from '@/components/home/DailyChallengesCard';
import styles from './page.module.css';

export default function ChallengesPage() {
    const [items, setItems] = useState<DailyProgressItem[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        setError(null);
        xpApi.getDailyProgress()
            .then((data) => setItems(data))
            .catch((err) => setError(err?.message || 'Unable to load challenges.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Split once by period rather than rendering one undifferentiated grid -
    // a new weekly or event challenge created purely in admin lands in the
    // right section automatically, since this filters on the API's own
    // challenge_period field rather than any hardcoded slug list.
    const dailyItems = useMemo(() => items?.filter((item) => item.challenge_period === 'daily') ?? null, [items]);
    const weeklyItems = useMemo(() => items?.filter((item) => item.challenge_period === 'weekly') ?? null, [items]);
    const eventItems = useMemo(() => items?.filter((item) => item.challenge_period === 'event') ?? null, [items]);

    return (
        <DashboardLayout>
            <PageShell title="Challenges" eyebrow="Play" description="Complete today's checklist, this week's goals, and any limited-time events to earn XP toward your next rank.">
                <div className={styles.wrap}>
                    <DailyChallengesCard
                        items={dailyItems}
                        loading={loading}
                        error={error}
                        onRetry={load}
                        layout="section"
                        title="Daily Challenges"
                        emptyMessage="No daily challenges configured right now."
                    />
                    <DailyChallengesCard
                        items={weeklyItems}
                        loading={loading}
                        error={error}
                        onRetry={load}
                        layout="section"
                        title="Weekly Challenges"
                        emptyMessage="No weekly challenges running right now - check back soon."
                    />
                    <DailyChallengesCard
                        items={eventItems}
                        loading={loading}
                        error={error}
                        onRetry={load}
                        layout="section"
                        title="Special Challenges"
                        emptyMessage="No limited-time events running right now - check back soon."
                    />
                </div>
            </PageShell>
        </DashboardLayout>
    );
}
