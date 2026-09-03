'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { HiLoGame } from '@/components/games/hilo/HiLoGame';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function HiLoPage() {
    const { user } = useAuth();

    if (!user || user.user_type !== 'player') {
        return (
            <DashboardLayout>
                <PageShell title="Rollin Hi-Lo" eyebrow="Games" description="Guess. Climb. Cash Out." centered>
                    <section className={styles.emptyState}>
                        <p>Rollin Hi-Lo is available for player accounts.</p>
                    </section>
                </PageShell>
            </DashboardLayout>
        );
    }

    return <HiLoGame />;
}
