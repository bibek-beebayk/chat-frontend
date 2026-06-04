'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const THEME = {
    primary: 'var(--color-primary)',
    secondary: 'var(--color-secondary)',
    bg: 'var(--color-bg-primary)',
    bgSecondary: 'var(--color-bg-secondary)',
    text: 'var(--color-text-primary)',
    textSecondary: 'var(--color-text-secondary)',
    glass: 'var(--color-bg-glass)',
    glassBorder: 'var(--color-border)',
};

function SetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { checkAuth } = useAuth();

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
            setErrorMsg('Password must be at least 6 characters.');
            setStatus('error');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg('Passwords do not match');
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

            if (data.access && data.refresh) {
                apiClient.setTokens(data.access, data.refresh);
                await checkAuth();
            }

            setStatus('success');
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
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: THEME.bg,
                    color: THEME.text,
                }}
            >
                <div
                    style={{
                        padding: '2rem',
                        background: THEME.glass,
                        border: `1px solid ${THEME.glassBorder}`,
                        borderRadius: '1rem',
                        backdropFilter: 'blur(10px)',
                        textAlign: 'center',
                    }}
                >
                    <p style={{ color: 'var(--color-error)' }}>Invalid Link. Missing parameters.</p>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${THEME.bg} 0%, ${THEME.bgSecondary} 100%)`,
                color: THEME.text,
                padding: '1rem',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '450px',
                    padding: '2.5rem',
                    background: THEME.glass,
                    backdropFilter: 'blur(16px)',
                    borderRadius: '1.5rem',
                    border: `1px solid ${THEME.glassBorder}`,
                    boxShadow: 'var(--shadow-lg)',
                }}
            >
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <h1
                        style={{
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            marginBottom: '0.5rem',
                            background: `linear-gradient(to right, ${THEME.primary}, ${THEME.secondary})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        Complete Setup
                    </h1>
                    <p style={{ color: THEME.textSecondary, fontSize: '0.95rem' }}>
                        Set your secure password to verify your account.
                    </p>
                </div>

                {status === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                        <h2 style={{ color: '#16a34a', marginBottom: '0.5rem', fontSize: '1.5rem' }}>Success!</h2>
                        <p style={{ color: THEME.textSecondary }}>Redirecting you to the event...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    color: THEME.primary,
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    letterSpacing: '0.5px',
                                }}
                            >
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
                                    background: 'var(--color-bg-tertiary)',
                                    border: `1px solid ${THEME.glassBorder}`,
                                    color: THEME.text,
                                    fontSize: '1rem',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    color: THEME.primary,
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    letterSpacing: '0.5px',
                                }}
                            >
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
                                    background: 'var(--color-bg-tertiary)',
                                    border: `1px solid ${THEME.glassBorder}`,
                                    color: THEME.text,
                                    fontSize: '1rem',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        {status === 'error' && (
                            <div
                                style={{
                                    padding: '1rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(239, 68, 68, 0.18)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    color: 'var(--color-error)',
                                    textAlign: 'center',
                                    fontSize: '0.9rem',
                                }}
                            >
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
                                background: `linear-gradient(to right, ${THEME.primary}, ${THEME.secondary})`,
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                textTransform: 'uppercase',
                                border: 'none',
                                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                                opacity: status === 'loading' ? 0.7 : 1,
                                marginTop: '0.5rem',
                                boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.28)',
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
        <Suspense fallback={<div style={{ color: 'var(--color-text-primary)', textAlign: 'center', paddingTop: '100px' }}>Loading...</div>}>
            <SetPasswordForm />
        </Suspense>
    );
}

