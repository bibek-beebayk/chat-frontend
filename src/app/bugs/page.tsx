'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';

export default function BugsPage() {
    return (
        <DashboardLayout>
            <PageShell title="Bug Reports" eyebrow="Support" description="Track issues and product feedback in one place." centered>
                <ComingSoonPanel title="Bug Reports" />
            </PageShell>
        </DashboardLayout>
    );
}
