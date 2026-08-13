'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

function UsernameSetupContent() {
    const { user, loading, updateUsername } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextUrl = searchParams.get('next');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        if (!user.needs_username_setup) {
            router.replace(nextUrl || '/post-login');
            return;
        }
        setUsername(user.username || '');
    }, [loading, nextUrl, router, user]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const value = username.trim();
        setError('');

        if (value.length < 3) {
            setError('Username must be at least 3 characters.');
            return;
        }
        if (!/^[\w.@+-]+$/.test(value)) {
            setError('Use letters, numbers, and . @ + - _ only.');
            return;
        }

        setSubmitting(true);
        try {
            await updateUsername(value);
            router.replace(nextUrl || '/post-login');
        } catch (err: any) {
            setError(err.message || 'Could not update username.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !user || !user.needs_username_setup) {
        return (
            <main className={styles.loading}>
                <div className="spinner" />
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <section className={styles.card}>
                <img src="/logo-2.png" alt="Rollin Community" className={styles.logo} />
                <p className={styles.eyebrow}>One quick step</p>
                <h1>Choose your community username</h1>
                <p className={styles.copy}>
                    This is how other Rollin Community members will recognize you.
                </p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.error}>{error}</div>}
                    <label htmlFor="username">Username</label>
                    <input
                        id="username"
                        name="username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        autoComplete="username"
                        autoFocus
                        placeholder="Choose a username"
                    />
                    <small>Use letters, numbers, and . @ + - _</small>
                    <button type="submit" disabled={submitting}>
                        {submitting ? 'Saving...' : 'Continue'}
                    </button>
                </form>
            </section>
        </main>
    );
}

export default function UsernameSetupPage() {
    return (
        <Suspense fallback={<main className={styles.loading}><div className="spinner" /></main>}>
            <UsernameSetupContent />
        </Suspense>
    );
}
