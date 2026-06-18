'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';

export default function AnnouncementsPage() {
    return (
        <DashboardLayout>
            <PageShell title="Announcements" eyebrow="Community" description="Official updates and notices from the Rollin team." centered>
                <ComingSoonPanel title="Announcements" />
            </PageShell>
        </DashboardLayout>
    );
}
