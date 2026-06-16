const fs = require('fs');
const path = require('path');

const placeholderRoutes = [
    'announcements',
    'discussion',
    'tips',
    'bugs',
    'suggestions',
    'rewards',
    'events', // Check if exists first
    'leaderboards',
    'vip',
    'games',
    'support',
    'faq',
    'guidelines'
];

placeholderRoutes.forEach(route => {
    const dir = path.join(__dirname, 'src', 'app', route);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const pagePath = path.join(dir, 'page.tsx');
    
    // Capitalize route for Title
    const title = route.charAt(0).toUpperCase() + route.slice(1);
    
    const content = `'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function ${title.replace(/[^a-zA-Z0-9]/g, '')}Page() {
    return (
        <DashboardLayout>
            <main style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '50vh', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(180deg, #FFFFFF 0%, #D892FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    ${title}
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
`;
    // Overwrite page.tsx regardless of existence to ensure it has DashboardLayout and placeholder if it was just empty or broken
    fs.writeFileSync(pagePath, content, 'utf8');
    console.log(`[CREATED PLACEHOLDER] src/app/${route}/page.tsx`);
});
