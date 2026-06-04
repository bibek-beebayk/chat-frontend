'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeMode, useTheme } from '@/contexts/ThemeContext';
import styles from './page.module.css';

export default function AppearancePage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const { themeMode, accentColor, accentOptions, setThemeMode, setAccentColor } = useTheme();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [loading, router, user]);

    if (loading || !user) {
        return null;
    }

    return (
        <div className={styles.pageWrap}>
            <Header />
            <main className={styles.main}>
                <section className={styles.panel}>
                    <h1 className={styles.title}>Appearance</h1>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Theme</h2>
                        <div className={styles.segment}>
                            {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    className={`${styles.segmentBtn} ${themeMode === mode ? styles.active : ''}`}
                                    onClick={() => setThemeMode(mode)}
                                >
                                    {mode[0].toUpperCase() + mode.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Accent Color</h2>
                        <div className={styles.accentGrid}>
                            {accentOptions.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`${styles.accentBtn} ${accentColor.toLowerCase() === option.value.toLowerCase() ? styles.activeAccent : ''}`}
                                    onClick={() => setAccentColor(option.value)}
                                    title={option.label}
                                    aria-label={option.label}
                                >
                                    <span className={styles.accentDot} style={{ backgroundColor: option.value }} />
                                    <span className={styles.accentLabel}>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <p className={styles.note}>Changes are saved on this device.</p>
                </section>
            </main>
        </div>
    );
}
