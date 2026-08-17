'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { RocketGame } from '@/components/games/rocket/RocketGame';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function RocketPage() {
    const { user } = useAuth();

    if (!user || user.user_type !== 'player') {
        return (
            <DashboardLayout>
                <PageShell title="Rollin Rocket" eyebrow="Games" description="Cash out before the rocket crashes." centered>
                    <section className={styles.emptyState}>
                        <p>Rollin Rocket is available for player accounts.</p>
                    </section>
                </PageShell>
            </DashboardLayout>
        );
    }

    return <RocketGame />;
}
