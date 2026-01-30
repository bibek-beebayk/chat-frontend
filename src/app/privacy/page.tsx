'use client';

import { Header } from '@/components/layout/Header';

export default function PrivacyPage() {
    return (
        <>
            <Header />
            <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#fff' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: '#ffd700' }}>Privacy Policy</h1>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px' }}>
                    <p style={{ marginBottom: '1rem' }}>Last updated: January 2026</p>
                    <p style={{ marginBottom: '1rem' }}>
                        At Rollin Community, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.
                    </p>
                    <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>1. Information We Collect</h2>
                    <p style={{ marginBottom: '1rem' }}>
                        We collect information you provide directly to us, such as when you create an account, making a deposit, or communicate with us.
                    </p>
                    <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>2. How We Use Your Information</h2>
                    <p style={{ marginBottom: '1rem' }}>
                        We use your information to provide, maintain, and improve our services, process transactions, and communicate with you.
                    </p>
                    <h2 style={{ fontSize: '1.5rem', marginTop: '1.5rem', marginBottom: '1rem' }}>3. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact our support team.
                    </p>
                </div>
            </main>
        </>
    );
}
