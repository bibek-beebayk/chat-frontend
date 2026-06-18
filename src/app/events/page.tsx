'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';

export default function EventsPage() {
    return (
        <DashboardLayout>
            <PageShell title="Events" eyebrow="Features" description="Active campaigns, tournaments, and community rewards." centered>
                <ComingSoonPanel title="Events" />
            </PageShell>
        </DashboardLayout>
    );
}
