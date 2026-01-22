'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { apiClient } from '@/lib/api';
import { StaffDashboard } from '@/types';
import styles from './page.module.css';

export default function StaffDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [dashboard, setDashboard] = useState<StaffDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user && user.user_type !== 'staff') {
            router.push('/');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user && user.user_type === 'staff') {
            const loadDashboard = async () => {
                try {
                    const data = await apiClient.get<StaffDashboard>('/api/staff/dashboard/');
                    setDashboard(data);
                } catch (err: any) {
                    setError(err.message || 'Failed to load dashboard');
                } finally {
                    setLoading(false);
                }
            };

            loadDashboard();
        }
    }, [user]);

    if (authLoading || loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user || user.user_type !== 'staff') return null;

    if (error) {
        return (
            <>
                <Header />
                <main className={styles.main}>
                    <div className={styles.container}>
                        <div className={styles.error}>{error}</div>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Header />
            <main className={styles.main}>
                <div className={styles.container}>
                    <h1 className={styles.title}>Staff Dashboard</h1>
                    <p className={styles.subtitle}>Manage your assigned chat room</p>

                    {dashboard && (
                        <>
                            <div className={styles.statsGrid}>
                                <div className={`${styles.statCard} glass`}>
                                    <div className={styles.statIcon}>👥</div>
                                    <div className={styles.statValue}>
                                        {dashboard.statistics.total_participants}
                                    </div>
                                    <div className={styles.statLabel}>Total Participants</div>
                                </div>

                                <div className={`${styles.statCard} glass`}>
                                    <div className={styles.statIcon}>💬</div>
                                    <div className={styles.statValue}>
                                        {dashboard.statistics.total_messages}
                                    </div>
                                    <div className={styles.statLabel}>Total Messages</div>
                                </div>

                                <div className={`${styles.statCard} glass`}>
                                    <div className={styles.statIcon}>🏠</div>
                                    <div className={styles.statValue}>{dashboard.room.name}</div>
                                    <div className={styles.statLabel}>Assigned Room</div>
                                </div>
                            </div>

                            <div className={`${styles.recentMessages} glass`}>
                                <h2>Recent Messages</h2>
                                <div className={styles.messagesList}>
                                    {dashboard.recent_messages.length > 0 ? (
                                        dashboard.recent_messages.map((msg) => (
                                            <div key={msg.id} className={styles.messageItem}>
                                                <div className={styles.messageHeader}>
                                                    <span className={styles.messageSender}>
                                                        {msg.sender.username}
                                                    </span>
                                                    <span className={styles.messageTime}>
                                                        {new Date(msg.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className={styles.messageContent}>{msg.content}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className={styles.noMessages}>No messages yet</p>
                                    )}
                                </div>

                                <button
                                    className={styles.goToChatButton}
                                    onClick={() => router.push('/chat')}
                                >
                                    Go to Chat Room
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </>
    );
}
