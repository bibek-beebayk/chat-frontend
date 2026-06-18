'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';

export default function DiscussionPage() {
    return (
        <DashboardLayout>
            <PageShell title="General Discussion" eyebrow="Community" description="Open conversation for Rollin members." centered>
                <ComingSoonPanel title="General Discussion" />
            </PageShell>
        </DashboardLayout>
    );
}
