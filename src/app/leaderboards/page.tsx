'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function LeaderboardsPage() {
    return (
        <DashboardLayout>
            <main style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '50vh', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(180deg, #FFFFFF 0%, #D892FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Leaderboards
                </h1>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', maxWidth: '500px', lineHeight: 1.6 }}>
                    This section is currently under development. Please check back later for updates!
                </p>
                <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--color-bg-glass)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--color-border)' }}>
                    <span style={{ fontSize: '2rem' }}>🚧</span>
                </div>
            </main>
        </DashboardLayout>
    );
}
