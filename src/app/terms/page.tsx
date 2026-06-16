'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function TermsPage() {
    return (
        <DashboardLayout>
            <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: '#ffd700' }}>Terms of Service</h1>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px' }}>
                    <p style={{ marginBottom: '1rem' }}>Last updated: January 2026</p>
                    <p style={{ marginBottom: '1rem' }}>
                        Please read these Terms of Service carefully before using the Rollin Community platform.
                    </p>
                    <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>1. Acceptance of Terms</h2>
                    <p style={{ marginBottom: '1rem' }}>
                        By accessing or using our services, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the service.
                    </p>
                    <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>2. User Accounts</h2>
                    <p style={{ marginBottom: '1rem' }}>
                        You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.
                    </p>

                    <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>3. Prohibited Activities</h2>
                    <p>
                        You may not use the service for any illegal or unauthorized purpose.
                    </p>
                </div>
            </main>
        </DashboardLayout>
    );
}
