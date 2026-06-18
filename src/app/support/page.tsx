'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';

export default function SupportPage() {
    return (
        <DashboardLayout>
            <PageShell title="Support Center" eyebrow="Support" description="Help resources and support channels for members." centered>
                <ComingSoonPanel title="Support Center" />
            </PageShell>
        </DashboardLayout>
    );
}
