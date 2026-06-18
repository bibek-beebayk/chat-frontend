'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';

export default function SuggestionsPage() {
    return (
        <DashboardLayout>
            <PageShell title="Suggestions" eyebrow="Community" description="Ideas and requests from the Rollin community." centered>
                <ComingSoonPanel title="Suggestions" />
            </PageShell>
        </DashboardLayout>
    );
}
