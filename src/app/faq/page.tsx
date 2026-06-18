'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';

export default function FaqPage() {
    return (
        <DashboardLayout>
            <PageShell title="FAQ" eyebrow="Support" description="Answers to common account and community questions." centered>
                <ComingSoonPanel title="FAQ" />
            </PageShell>
        </DashboardLayout>
    );
}
