'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';

export default function TipsPage() {
    return (
        <DashboardLayout>
            <PageShell title="Tips & Strategies" eyebrow="Community" description="Member-led advice and game discussion." centered>
                <ComingSoonPanel title="Tips & Strategies" />
            </PageShell>
        </DashboardLayout>
    );
}
