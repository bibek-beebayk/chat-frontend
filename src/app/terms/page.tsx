'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DocumentMeta, DocumentPanel, PageShell } from '@/components/layout/PageShell';

export default function TermsPage() {
    return (
        <DashboardLayout>
            <PageShell title="Terms of Service" eyebrow="Legal" width="narrow">
                <DocumentPanel>
                    <DocumentMeta>Last updated: January 2026</DocumentMeta>
                    <p>
                        Please read these Terms of Service carefully before using the Rollin Community platform.
                    </p>
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using our services, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the service.
                    </p>
                    <h2>2. User Accounts</h2>
                    <p>
                        You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.
                    </p>

                    <h2>3. Prohibited Activities</h2>
                    <p>
                        You may not use the service for any illegal or unauthorized purpose.
                    </p>
                </DocumentPanel>
            </PageShell>
        </DashboardLayout>
    );
}
