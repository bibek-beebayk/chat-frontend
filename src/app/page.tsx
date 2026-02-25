'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { apiClient } from '@/lib/api';
import { FeaturedEventCard } from '@/components/events/FeaturedEventCard';
import styles from './page.module.css';

export default function HomePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (user) {
            const fetchData = async () => {
                try {
                    const eventsResponse = await apiClient.get<any[]>('/api/events/active/');
                    setEvents(eventsResponse);
                } catch (err) {
                    console.error('Failed to fetch data', err);
                }
            };
            fetchData();
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
                    <div className={styles.mainContent}>
                        <div className={styles.hero}>
                            <p className={styles.subtitle}>
                                Hello, <strong>{user.username}</strong>!
                            </p>
                            <h1 className={styles.title}>
                                Welcome to <span className="gradient-text">Rollin Community </span>
                            </h1>

                            {events.length > 0 && (
                                <div className={styles.eventsSection}>
                                    <h2 className="gradient-text">Current Events</h2>
                                    <div className={styles.eventGrid}>
                                        {events.map(event => (
                                            <FeaturedEventCard key={event.id} event={event} />
                                        ))}
                                    </div>
                                </div>
                            )}


                            <div className={styles.features}>
                                <div className={`${styles.card} glass`}>
                                    <div className={styles.cardIcon}>💬</div>
                                    <h3>Real-Time Chat</h3>
                                    <p>Connect with support staff instantly through our WebSocket-powered chat system.</p>
                                    {/* <button
                                        className={styles.cardButton}
                                        onClick={() => router.push('/chat')}
                                    >
                                        Start Chatting
                                    </button> */}
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

                                <div className={`${styles.card} glass`}>
                                    <div className={styles.cardIcon}>📱</div>
                                    <h3>Mobile App</h3>
                                    <p>Get the best native experience by downloading our Android app.</p>
                                    <button
                                        className={styles.cardButton}
                                        onClick={() => router.push('/download')}
                                    >
                                        Download App
                                    </button>
                                </div>
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
                                {/* <div className={styles.statCard}>
                                    <div className={styles.statValue}>Real-Time</div>
                                    <div className={styles.statLabel}>WebSocket Chat</div>
                                </div> */}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
