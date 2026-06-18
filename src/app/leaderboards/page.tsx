'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';

export default function LeaderboardsPage() {
    return (
        <DashboardLayout>
            <PageShell title="Leaderboards" eyebrow="Features" description="Rankings and progress for community competitions." centered>
                <ComingSoonPanel title="Leaderboards" />
            </PageShell>
        </DashboardLayout>
    );
}
