'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import styles from './page.module.css';

export default function HomePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <>
            <Header />
            <main className={styles.main}>
                <div className={styles.container}>
                    <div className={styles.hero}>
                        <h1 className={styles.title}>
                            Welcome to <span className="gradient-text">Hi-Rollin Portal </span>
                        </h1>
                        <p className={styles.subtitle}>
                            Hello, <strong>{user.username}</strong>! You are logged in as a <strong>{user.user_type}</strong>.
                        </p>

                        <div className={styles.features}>
                            <div className={`${styles.card} glass`}>
                                <div className={styles.cardIcon}>💬</div>
                                <h3>Real-Time Chat</h3>
                                <p>Connect with support staff instantly through our WebSocket-powered chat system.</p>
                                <button
                                    className={styles.cardButton}
                                    onClick={() => router.push('/chat')}
                                >
                                    Start Chatting
                                </button>
                            </div>

                            <div className={`${styles.card} glass`}>
                                <div className={styles.cardIcon}>💳</div>
                                <h3>Payment Information</h3>
                                <p>View and manage your payment information and transaction history.</p>
                                <button
                                    className={styles.cardButton}
                                    onClick={() => router.push('/payments')}
                                >
                                    View Payments
                                </button>
                            </div>

                            {user.user_type === 'staff' && (
                                <div className={`${styles.card} glass`}>
                                    <div className={styles.cardIcon}>📊</div>
                                    <h3>Staff Dashboard</h3>
                                    <p>Access your staff dashboard to manage your assigned chat room.</p>
                                    <button
                                        className={styles.cardButton}
                                        onClick={() => router.push('/staff-dashboard')}
                                    >
                                        Go to Dashboard
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className={styles.stats}>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>24/7</div>
                                <div className={styles.statLabel}>Support Available</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>100%</div>
                                <div className={styles.statLabel}>Secure</div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statValue}>Real-Time</div>
                                <div className={styles.statLabel}>WebSocket Chat</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
