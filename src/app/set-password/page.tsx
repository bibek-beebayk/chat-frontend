'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

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

function SetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const uid = searchParams.get('uid');
    const token = searchParams.get('token');
    const next = searchParams.get('next') || '/';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            setErrorMsg("Password must be at least 6 characters.");
            setStatus('error');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match");
            setStatus('error');
            return;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            const res = await fetch(`${API_BASE}/api/events/set-password/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, token, password, confirm_password: confirmPassword }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to set password');

            // Auto Login - Store Tokens
            if (data.access && data.refresh) {
                localStorage.setItem('accessToken', data.access);
                localStorage.setItem('refreshToken', data.refresh);
            }

            setStatus('success');

            // Redirect after short delay
            setTimeout(() => {
                router.push(next);
            }, 2000);

        } catch (err) {
            console.error(err);
            setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
            setStatus('error');
        }
    };

    if (!uid || !token) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: THEME.bg,
                color: THEME.text
            }}>
                <div style={{
                    padding: '2rem',
                    background: THEME.glass,
                    border: `1px solid ${THEME.glassBorder}`,
                    borderRadius: '1rem',
                    backdropFilter: 'blur(10px)',
                    textAlign: 'center'
                }}>
                    <p style={{ color: '#ff6b6b' }}>Invalid Link. Missing parameters.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${THEME.bg} 0%, #000000 100%)`,
            color: THEME.text,
            padding: '1rem'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '450px',
                padding: '2.5rem',
                background: THEME.glass,
                backdropFilter: 'blur(16px)',
                borderRadius: '1.5rem',
                border: `1px solid ${THEME.glassBorder}`,
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }}>
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        background: `linear-gradient(to right, ${THEME.primary}, #fffacD)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        Complete Setup
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
                        Set your secure password to verify your account.
                    </p>
                </div>

                {status === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{
                            fontSize: '4rem',
                            marginBottom: '1rem',
                            animation: 'fadeIn 0.5s ease-out'
                        }}>🎉</div>
                        <h2 style={{ color: '#4ade80', marginBottom: '0.5rem', fontSize: '1.5rem' }}>Success!</h2>
                        <p style={{ color: 'rgba(255,255,255,0.8)' }}>Redirecting you to the event...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: THEME.primary,
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                letterSpacing: '0.5px'
                            }}>
                                NEW PASSWORD
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(0, 0, 0, 0.4)',
                                    border: `1px solid ${THEME.glassBorder}`,
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                color: THEME.primary,
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                letterSpacing: '0.5px'
                            }}>
                                CONFIRM PASSWORD
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter password"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(0, 0, 0, 0.4)',
                                    border: `1px solid ${THEME.glassBorder}`,
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                        </div>

                        {status === 'error' && (
                            <div style={{
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#fca5a5',
                                textAlign: 'center',
                                fontSize: '0.9rem'
                            }}>
                                {errorMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                background: `linear-gradient(to right, ${THEME.primary}, #ffa500)`,
                                color: '#1a0b2e',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                textTransform: 'uppercase',
                                border: 'none',
                                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                                opacity: status === 'loading' ? 0.7 : 1,
                                marginTop: '0.5rem',
                                boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)',
                                transition: 'transform 0.1s'
                            }}
                        >
                            {status === 'loading' ? 'Processing...' : 'Set Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function SetPasswordPage() {
    return (
        <Suspense fallback={<div style={{ color: 'white', textAlign: 'center', paddingTop: '100px' }}>Loading...</div>}>
            <SetPasswordForm />
        </Suspense>
    );
}
