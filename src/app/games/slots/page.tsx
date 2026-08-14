'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { SlotMachine } from '@/components/games/slots/SlotMachine';
import { ImmersiveGameShell } from '@/components/games/shared/ImmersiveGameShell';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function SlotsPage() {
    const { user } = useAuth();
    const [paytableOpen, setPaytableOpen] = useState(false);

    if (!user || user.user_type !== 'player') {
        return (
            <DashboardLayout>
                <PageShell title="Rollin 3x3" eyebrow="Games" description="A Rollin-themed 3-reel slot." centered>
                    <section className={styles.emptyState}>
                        <p>Rollin 3x3 is available for player accounts.</p>
                    </section>
                </PageShell>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <ImmersiveGameShell gameName="Rollin 3x3" onInfoClick={() => setPaytableOpen(true)}>
                <div className={styles.page}>
                    <SlotMachine
                        paytableOpen={paytableOpen}
                        onOpenPaytable={() => setPaytableOpen(true)}
                        onClosePaytable={() => setPaytableOpen(false)}
                    />
                </div>
            </ImmersiveGameShell>
        </DashboardLayout>
    );
}
