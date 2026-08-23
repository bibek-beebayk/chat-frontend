'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { apiClient } from '@/lib/api';
import styles from './page.module.css';

interface AppVersion {
    version_code: string;
    created_at: string;
}

export default function AboutPage() {
    const [appVersion, setAppVersion] = useState<AppVersion | null>(null);

    useEffect(() => {
        apiClient.get<AppVersion>('/api/auth/app-version/', { skipAuth: true })
            .then(setAppVersion)
            .catch(() => {});
    }, []);

    return (
        <DashboardLayout>
            <PageShell
                title="About Rollin Community"
                eyebrow="Rollin Community"
                description="The official community hub for Hi-Rollin players."
                width="wide"
            >
                <section className={styles.panel}>
                    <p>
                        Rollin Community is the home base for Hi-Rollin players - play games, earn Reward Points
                        and XP, keep up a login streak, connect with other members, and stay on top of community
                        posts, events, and announcements.
                    </p>
                    <p>
                        Questions, feedback, or need a hand with your account? Reach out through the Help &amp;
                        Support center any time.
                    </p>
                </section>

                <section className={styles.metaGrid}>
                    <div className={styles.metaCard}>
                        <span>App Version</span>
                        <strong>{appVersion ? `v${appVersion.version_code}` : '—'}</strong>
                    </div>
                    <div className={styles.metaCard}>
                        <span>Platform</span>
                        <strong>Web &amp; Mobile</strong>
                    </div>
                </section>
            </PageShell>
        </DashboardLayout>
    );
}
