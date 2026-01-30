'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import VerifyUserIDModal from '@/components/settings/VerifyUserIDModal';
import styles from './page.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface EventData {
    id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    poster: string | null;
    is_registered?: boolean;
    eligibility_status?: 'pending' | 'approved' | 'rejected' | null;
    base_prize_pool: number;
    max_prize_pool: number;
    current_prize_pool: number;
    participants_count: number;
}

import { Modal } from '@/components/ui/Modal';
import { PrizePoolMeter } from '@/components/events/PrizePoolMeter';

export default function EventPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { user, checkAuth } = useAuth(); // Use global auth state
    const [event, setEvent] = useState<EventData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

    // Message Modal State
    const [msgModal, setMsgModal] = useState({ isOpen: false, title: '', message: '' });

    const [registerStatus, setRegisterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [registerError, setRegisterError] = useState('');

    const showMessage = (title: string, message: string) => {
        setMsgModal({ isOpen: true, title, message });
    };

    const closeMessage = () => {
        setMsgModal(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                // Use apiClient to handle response unwrapping automatically
                const data = await apiClient.get<EventData>('/api/events/latest/');
                console.log('Event Data Loaded:', data);
                setEvent(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load event');
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [user, checkAuth]); // Refetch if user changes

    const handleCheckEligibility = async () => {
        if (!event) return;
        setRegisterStatus('loading');
        setRegisterError('');

        if (!event || !event.id) {
            console.error("DEBUG: Event ID is missing", event);
            setRegisterError("Event data is invalid. Please refresh.");
            return;
        }

        console.log('DEBUG: Checking eligibility for event:', event);

        try {
            const data = await apiClient.post<{ status: string; message: string; eligible?: boolean }>(
                '/api/events/check-eligibility/',
                { event_id: event.id }
            );

            console.log('DEBUG: Eligibility response:', data);

            if (data.status === 'pending') {
                setEvent(prev => prev ? { ...prev, eligibility_status: 'pending' } : null);
                showMessage("Eligibility Check", data.message); // Use Modal
                setRegisterStatus('idle');
                return;
            }

            if (data.eligible) {
                // If eligible immediately (approved), register them
                await handleRegister();
            } else {
                setRegisterError("You are not eligible for this event.");
                setRegisterStatus('error');
            }

        } catch (err: any) {
            console.error('DEBUG: Eligibility check failed', err);
            setRegisterStatus('error');
            setRegisterError(err.message || 'Something went wrong.');
        }
    };

    const handleRegister = async () => {
        if (!event) return;

        try {
            const data = await apiClient.post<{ status?: string; message?: string; error?: string }>(
                '/api/events/register/',
                { event_id: event.id }
            );

            setRegisterStatus('success');
            setEvent(prev => prev ? { ...prev, is_registered: true, eligibility_status: 'approved' } : null);
        } catch (err: any) {
            setRegisterStatus('error');
            const msg = err.message || 'Registration failed';
            if (msg.toLowerCase().includes('verified')) {
                setRegisterError('Verification required to participate.');
            } else {
                setRegisterError(msg);
            }
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
        await checkAuth();

        showMessage("Verification Request Submitted", "Your Verification request has been submitted. Please check back later to proceed further."); // Use Modal
    };

    // Render Logic for Button
    const renderActionButton = () => {
        if (!event) return null;

        // 0. Guest User (Not Logged In)
        if (!user) {
            return (
                <button
                    className={styles.checkBtn}
                    onClick={() => router.push(`/login?next=/events/${event.id}`)}
                >
                    Login to Participate
                </button>
            );
        }

        // 1. Registered
        if (event.is_registered) {
            return (
                <button className={styles.checkBtn} style={{ background: '#4ade80', cursor: 'default' }} disabled>
                    ✓ You are Registered!
                </button>
            );
        }

        // 2. Eligibility Pending (Show this first if pending, regardless of other states, assuming user triggered it)
        if (event.eligibility_status === 'pending') {
            return (
                <div className={styles.pendingMessage} style={{ textAlign: 'center', color: '#ffd700', padding: '1rem', background: 'rgba(255, 215, 0, 0.1)', borderRadius: '8px' }}>
                    Your eligibility is being checked. Please check back in a while.
                </div>
            );
        }

        // 3. Verification Checks
        if (user.verification_status === 'pending') {
            return (
                <div className={styles.pendingMessage} style={{ textAlign: 'center', color: '#a0aec0', padding: '1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                    Your verification is pending, we will send you an email after your verification is approved.
                </div>
            );
        }

        if (!user.is_verified) {
            return (
                <button
                    className={styles.checkBtn}
                    onClick={() => setIsVerifyModalOpen(true)}
                >
                    Verify
                </button>
            );
        }

        // 4. Verified & Not Registered & Not Pending Eligibility -> Show Register (Check Eligibility)
        return (
            <button
                className={styles.checkBtn}
                onClick={handleCheckEligibility}
                disabled={registerStatus === 'loading'}
            >
                {registerStatus === 'loading' ? 'Checking...' : 'Register'}
            </button>
        );
    };

    return (
        <div className={styles.container}>
            {/* ... Header and Cards ... */}
            <div className={styles.contentWrapper}>
                <header className={styles.header}>
                    <div className={styles.logoContainer}>
                        <img
                            src="/logo.png"
                            alt="Rollin Community Logo"
                            style={{ width: '80px', height: 'auto', marginBottom: '0.5rem' }}
                        />
                        <div className={styles.logoText}>Serving the Community</div>

                        {/* <div className={styles.rewardBadge}>
                            🎁 Community Reward Pool
                        </div> */}
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
                    {/* Prize Pool Meter */}
                    {event && (
                        <PrizePoolMeter
                            basePool={Number(event.base_prize_pool)}
                            currentPool={Number(event.current_prize_pool)}
                            maxPool={Number(event.max_prize_pool)}
                            participants={event.participants_count}
                        />
                    )}

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
                    {renderActionButton()}

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

                <Modal
                    isOpen={msgModal.isOpen}
                    onClose={closeMessage}
                    title={msgModal.title}
                >
                    <p style={{ color: '#e0e0e0' }}>{msgModal.message}</p>
                </Modal>
            </div>
        </div>
    );
}
