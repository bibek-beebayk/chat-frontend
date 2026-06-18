'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';

export default function GuidelinesPage() {
    return (
        <DashboardLayout>
            <PageShell title="Guidelines" eyebrow="Support" description="Community expectations and account safety guidance." centered>
                <ComingSoonPanel title="Guidelines" />
            </PageShell>
        </DashboardLayout>
    );
}
