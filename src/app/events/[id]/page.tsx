'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import VerifyUserIDModal from '@/components/settings/VerifyUserIDModal';
import styles from './page.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface EventData {
    id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    poster: string | null;
    is_registered?: boolean;
}

interface UserData {
    id: number;
    username: string;
    email: string;
    is_verified: boolean;
    verification_status: string | null;
}

export default function EventPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [event, setEvent] = useState<EventData | null>(null);
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

    const [registerStatus, setRegisterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [registerError, setRegisterError] = useState('');

    useEffect(() => {
        const fetchEvent = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                const currentPath = window.location.pathname + window.location.search;
                router.push(`/login?next=${encodeURIComponent(currentPath)}`);
                return;
            }

            try {
                // Use the ID from params
                const res = await fetch(`${API_BASE}/api/events/latest/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!res.ok) {
                    if (res.status === 401) {
                        const currentPath = window.location.pathname + window.location.search;
                        router.push(`/login?next=${encodeURIComponent(currentPath)}`);
                        return;
                    }
                    throw new Error('Failed to load event');
                }

                const data = await res.json();
                const eventData = data.data || data;
                setEvent(eventData);

                // Fetch User Profile
                const userRes = await fetch(`${API_BASE}/api/auth/me/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (userRes.ok) {
                    const userData = await userRes.json();
                    setUser(userData);
                }
            } catch (err) {
                setError('Could not access event details.');
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [params.id, router]);

    const handleRegister = async () => {
        if (!event) return;
        setRegisterStatus('loading');
        setRegisterError('');

        const token = localStorage.getItem('accessToken');
        try {
            // 1. Check Eligibility
            const eligibilityRes = await fetch(`${API_BASE}/api/events/check-eligibility/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ event_id: event.id })
            });

            if (!eligibilityRes.ok) {
                const data = await eligibilityRes.json();
                throw new Error(data.error || 'Failed to check eligibility');
            }

            const json = await eligibilityRes.json();
            const eligibilityData = json.data || json;

            if (!eligibilityData.eligible) {
                setRegisterStatus('error');
                setRegisterError("You are not eligible to participate in this event (Verification Required).");
                return;
            }

            // 2. Register (if eligible)
            const res = await fetch(`${API_BASE}/api/events/register/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ event_id: event.id })
            });

            const data = await res.json();

            if (!res.ok) {
                const msg = data.error || data.message || 'Registration failed';
                if (msg.toLowerCase().includes('verified')) {
                    setRegisterError('Verification required to participate.');
                } else {
                    setRegisterError(msg);
                }
                setRegisterStatus('error');
            } else {
                setRegisterStatus('success');
                setEvent(prev => prev ? { ...prev, is_registered: true } : null);
            }

        } catch (err: any) {
            setRegisterStatus('error');
            setRegisterError(err.message || 'Something went wrong. Please try again.');
        }
    };

    const handleVerifyInitiate = async () => {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${API_BASE}/api/auth/initiate-verification-request/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to initiate verification');
        }
    };

    const handleVerifySubmit = async (userId: string, otp: string) => {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${API_BASE}/api/auth/verify-user-id/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId, otp: otp })
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Verification failed');
        }

        setIsVerifyModalOpen(false);
        setRegisterStatus('idle');
        setRegisterError('');

        // Re-fetch user to update verification status visually if needed
        const userRes = await fetch(`${API_BASE}/api/auth/me/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userRes.ok) {
            const userData = await userRes.json();
            setUser(userData);
        }

        alert("Verification successful! You can now check eligibility.");
    };

    if (loading) return (
        <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <p>Loading Event...</p>
        </div>
    );

    if (error) return (
        <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className={styles.errorBox}>{error}</div>
        </div>
    );

    return (
        <div className={styles.container}>
            <div className={styles.contentWrapper}>
                <header className={styles.header}>
                    <div className={styles.logoContainer}>
                        <div style={{ fontSize: '3rem' }}>🌸</div> {/* Placeholder Logo Icon */}
                        <div className={styles.logoText}>Serving the Community</div>

                        <div className={styles.rewardBadge}>
                            🎁 Community Reward Pool
                        </div>
                    </div>

                    <h1 className={styles.title}>Valentine Giveaway</h1>
                    <div className={styles.subtitle}>A Community Appreciation Event</div>

                    {event && (
                        <div className={styles.period}>
                            Participation Period: {new Date(event.start_date).toLocaleDateString()} – {new Date(event.end_date).toLocaleDateString()}
                        </div>
                    )}

                    <p className={styles.description}>
                        This Valentine's season, Rollin Community is hosting a limited-time appreciation
                        event created to celebrate and reward active community members.
                    </p>
                </header>

                <main>
                    {/* Card 1: How Participation Works */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>How Participation Works</h2>
                        <ul className={styles.list}>
                            <li>Participation is open to community members</li>
                            <li>Entry requires verification of your game UserID</li>
                            <li>Participation is based on overall activity during the event period</li>
                            <li>Rewards increase progressively with higher activity</li>
                        </ul>
                    </div>

                    {/* Card 2: Reward Progression */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Reward Progression</h2>

                        <div className={styles.progressionContainer}>
                            <div className={styles.progressionLine}></div>

                            <div className={styles.step}>
                                <div className={`${styles.heart} ${styles.starter}`}>♥</div>
                                <span className={styles.stepLabel}>Starter</span>
                            </div>

                            <div className={styles.step}>
                                <div className={`${styles.heart} ${styles.active}`}>♥</div>
                                <span className={styles.stepLabel}>Active</span>
                            </div>

                            <div className={styles.step}>
                                <div className={`${styles.heart} ${styles.high}`}>♥</div>
                                <span className={styles.stepLabel}>High Activity</span>
                            </div>

                            <div className={styles.step}>
                                <div className={`${styles.heart} ${styles.premium}`}>♥</div>
                                <span className={styles.stepLabel}>Premium</span>
                            </div>
                        </div>
                    </div>

                    {/* Feedback / Error Area */}
                    {registerError && (
                        <div className={styles.errorBox}>
                            {registerError}
                            {registerError.includes('Verification') && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <button
                                        onClick={() => setIsVerifyModalOpen(true)}
                                        style={{ background: 'transparent', border: '1px solid currentColor', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'inherit' }}
                                    >
                                        Verify Now
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Button */}
                    {event?.is_registered ? (
                        <button className={styles.checkBtn} style={{ background: '#4ade80', cursor: 'default' }} disabled>
                            ✓ You are Registered!
                        </button>
                    ) : (
                        <button
                            className={styles.checkBtn}
                            onClick={handleRegister}
                            disabled={registerStatus === 'loading'}
                        >
                            {registerStatus === 'loading' ? 'Checking...' : 'Check Eligibility'}
                        </button>
                    )}

                    <div className={styles.footer}>
                        Sponsored by Hi-Rollin
                    </div>
                </main>

                <VerifyUserIDModal
                    isOpen={isVerifyModalOpen}
                    onClose={() => setIsVerifyModalOpen(false)}
                    onInitiate={handleVerifyInitiate}
                    onVerify={handleVerifySubmit}
                />
            </div>
        </div>
    );
}
