'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';

export default function RewardsPage() {
    return (
        <DashboardLayout>
            <PageShell title="Rewards" eyebrow="Features" description="Bonus progress, XP, and community perks." centered>
                <ComingSoonPanel title="Rewards" />
            </PageShell>
        </DashboardLayout>
    );
}
