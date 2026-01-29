'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import VerifyUserIDModal from '@/components/settings/VerifyUserIDModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// High Rollin Theme Colors
const THEME = {
    primary: '#ffd700', // Gold
    secondary: '#a371f7', // Purple Accent
    bg: '#1a0b2e', // Deep Purple
    text: '#ffffff',
    glass: 'rgba(255, 255, 255, 0.1)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',
};

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
                const res = await fetch(`${API_BASE}/api/events/latest/`, { // Ideally fetching specific ID, but for now latest works/is exposed
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
                // API might return wrapped response { status: 'success', data: { ... } }
                const eventData = data.data || data;
                setEvent(eventData);

                // 2. Fetch User Profile
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
                // If the endpoint fails (e.g. 500 or 400), handle it gracefully
                const data = await eligibilityRes.json();
                throw new Error(data.error || 'Failed to check eligibility');
            }

            const json = await eligibilityRes.json();
            const eligibilityData = json.data || json;

            if (!eligibilityData.eligible) {
                setRegisterStatus('error');
                setRegisterError("You are not eligible to participate in this event. Please check the eligibility criteria in the details. You can come here again after fulfilling the criteria.");
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
                    setRegisterError('Verification required');
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
            body: JSON.stringify({
                user_id: userId,
                otp: otp
            })
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Verification failed');
        }

        setIsVerifyModalOpen(false);
        setRegisterStatus('idle');
        setRegisterError('');
        alert("Verification successful! You can now register for the event.");
    };

    if (loading) return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${THEME.bg} 0%, #000000 100%)`,
            color: 'white',
            fontFamily: 'sans-serif'
        }}>
            <p>Loading Event...</p>
        </div>
    );

    if (error) return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${THEME.bg} 0%, #000000 100%)`,
            color: '#ef4444'
        }}>
            <div style={{
                padding: '2rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '1rem',
                backdropFilter: 'blur(10px)'
            }}>
                {error}
            </div>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: `linear-gradient(135deg, ${THEME.bg} 0%, #000000 100%)`,
            color: THEME.text,
            padding: '2rem',
            fontFamily: 'sans-serif'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
            }}>
                <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '2rem',
                    marginBottom: '2rem',
                    borderBottom: `1px solid ${THEME.glassBorder}`
                }}>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: THEME.primary,
                        letterSpacing: '2px',
                        textTransform: 'uppercase'
                    }}>
                        HIGH ROLLIN
                    </h1>
                    <button
                        onClick={() => {
                            localStorage.removeItem('accessToken');
                            localStorage.removeItem('refreshToken');
                            router.push('/login');
                        }}
                        style={{
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.6)',
                            border: `1px solid ${THEME.glassBorder}`,
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.borderColor = 'white';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                            e.currentTarget.style.borderColor = THEME.glassBorder;
                        }}
                    >
                        Sign Out
                    </button>
                </header>

                {event && (
                    <main style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '3rem',
                        alignItems: 'start'
                    }}>
                        {/* Poster Section */}
                        <div style={{
                            position: 'relative',
                            borderRadius: '1.5rem',
                            overflow: 'hidden',
                            boxShadow: `0 20px 40px -10px rgba(0,0,0,0.5)`,
                            border: `1px solid ${THEME.primary}`,
                        }}>
                            {event.poster && (
                                <img
                                    src={event.poster.startsWith('http') ? event.poster : `${API_BASE}${event.poster}`}
                                    alt={event.title}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        display: 'block',
                                        objectFit: 'cover'
                                    }}
                                />
                            )}
                        </div>

                        {/* Details Section */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            height: '100%'
                        }}>
                            <h2 style={{
                                fontSize: '4rem',
                                fontWeight: '800',
                                lineHeight: '1',
                                marginBottom: '1.5rem',
                                background: `linear-gradient(to right, ${THEME.primary}, #fffacD)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                textShadow: '0 4px 12px rgba(255, 215, 0, 0.2)'
                            }}>
                                {event.title}
                            </h2>

                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '1rem',
                                color: THEME.primary,
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                marginBottom: '2rem',
                                padding: '1rem 0',
                                borderTop: `1px solid ${THEME.glassBorder}`,
                                borderBottom: `1px solid ${THEME.glassBorder}`
                            }}>
                                <span>📅 {new Date(event.start_date).toDateString()}</span>
                                <span style={{ opacity: 0.5 }}>|</span>
                                <span>🏁 {new Date(event.end_date).toDateString()}</span>
                            </div>

                            <div style={{
                                padding: '2rem',
                                background: THEME.glass,
                                backdropFilter: 'blur(12px)',
                                borderRadius: '1.5rem',
                                border: `1px solid ${THEME.glassBorder}`,
                                marginBottom: '2rem'
                            }}>
                                <p style={{
                                    color: 'rgba(255,255,255,0.85)',
                                    lineHeight: '1.8',
                                    fontSize: '1.1rem',
                                    whiteSpace: 'pre-wrap' // Preserve line breaks
                                }}>
                                    {event.description}
                                </p>
                            </div>

                            {/* REGISTRATION ACTIONS */}
                            {event.is_registered ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    background: 'rgba(74, 222, 128, 0.1)',
                                    border: '1px solid rgba(74, 222, 128, 0.3)',
                                    padding: '1.25rem',
                                    borderRadius: '1rem',
                                    color: '#4ade80',
                                    fontWeight: '500',
                                    fontSize: '1rem',
                                    boxShadow: '0 4px 12px rgba(74, 222, 128, 0.1)'
                                }}>
                                    <span style={{ fontSize: '1.25rem' }}>✓</span>
                                    Since you are already registered, you are all set!
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center' }}>
                                    {registerStatus === 'error' && (
                                        <div style={{
                                            background: 'rgba(255, 107, 107, 0.1)',
                                            border: '1px solid rgba(255, 107, 107, 0.3)',
                                            padding: '1rem',
                                            borderRadius: '0.75rem',
                                            color: '#ff8787',
                                            marginBottom: '1rem',
                                            fontSize: '0.95rem'
                                        }}>
                                            {registerError === 'Verification required' ? (
                                                <>
                                                    <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Verification Required</p>
                                                    {user?.verification_status === 'pending' ? (
                                                        <div style={{
                                                            marginTop: '0.5rem',
                                                            background: 'rgba(255, 215, 0, 0.1)',
                                                            border: '1px solid rgba(255, 215, 0, 0.3)',
                                                            color: '#ffd700',
                                                            padding: '0.5rem 1rem',
                                                            borderRadius: '0.5rem',
                                                            fontSize: '0.9rem'
                                                        }}>
                                                            Verification Pending. Please wait for admin approval.
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p>You need to verify your account to register.</p>
                                                            <button
                                                                onClick={() => setIsVerifyModalOpen(true)}
                                                                style={{
                                                                    marginTop: '0.5rem',
                                                                    background: 'transparent',
                                                                    border: '1px solid #ff8787',
                                                                    color: '#ff8787',
                                                                    padding: '0.25rem 0.75rem',
                                                                    borderRadius: '0.5rem',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.85rem'
                                                                }}
                                                            >
                                                                Verify Now
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                registerError
                                            )}
                                        </div>
                                    )}

                                    <button
                                        onClick={handleRegister}
                                        disabled={registerStatus === 'loading'}
                                        style={{
                                            padding: '1rem 3rem',
                                            borderRadius: '0.75rem',
                                            background: `linear-gradient(to right, ${THEME.primary}, #ffa500)`,
                                            color: '#1a0b2e',
                                            fontWeight: '800',
                                            fontSize: '1.2rem',
                                            border: 'none',
                                            cursor: registerStatus === 'loading' ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
                                            transition: 'transform 0.1s',
                                            opacity: registerStatus === 'loading' ? 0.7 : 1
                                        }}
                                    >
                                        {registerStatus === 'loading' ? 'Registering...' : 'REGISTER FOR EVENT'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </main>
                )}

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
