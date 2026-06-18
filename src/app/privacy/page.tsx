'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DocumentMeta, DocumentPanel, PageShell } from '@/components/layout/PageShell';

export default function PrivacyPage() {
    return (
        <DashboardLayout>
            <PageShell title="Privacy Policy" eyebrow="Legal" width="narrow">
                <DocumentPanel>
                    <DocumentMeta>Last updated: January 2026</DocumentMeta>
                    <p>
                        At Rollin Community, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.
                    </p>
                    <h2>1. Information We Collect</h2>
                    <p>
                        We collect information you provide directly to us, such as when you create an account, making a deposit, or communicate with us.
                    </p>
                    <h2>2. How We Use Your Information</h2>
                    <p>
                        We use your information to provide, maintain, and improve our services, process transactions, and communicate with you.
                    </p>

                    <h2>3. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact our support team.
                    </p>
                </DocumentPanel>
            </PageShell>
        </DashboardLayout>
    );
}
