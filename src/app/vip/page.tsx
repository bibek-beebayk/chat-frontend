'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';

export default function VipPage() {
    return (
        <DashboardLayout>
            <PageShell title="VIP Lounge" eyebrow="Features" description="Exclusive updates and perks for VIP members." centered>
                <ComingSoonPanel title="VIP Lounge" />
            </PageShell>
        </DashboardLayout>
    );
}
