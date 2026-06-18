'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';

export default function GamesPage() {
    return (
        <DashboardLayout>
            <PageShell title="Demo Games" eyebrow="Features" description="A dedicated space for playable previews and game discovery." centered>
                <ComingSoonPanel title="Demo Games" />
            </PageShell>
        </DashboardLayout>
    );
}
