'use client';

import { useCallback, useEffect, useState } from 'react';
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

    return (
        <DashboardLayout>
            <PageShell title="Daily Challenges" eyebrow="Play" description="Complete today's checklist to earn XP toward your next rank.">
                <div className={styles.wrap}>
                    <DailyChallengesCard items={items} loading={loading} error={error} onRetry={load} layout="page" />
                </div>
            </PageShell>
        </DashboardLayout>
    );
}
