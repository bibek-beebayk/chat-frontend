'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import styles from './page.module.css';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userData = await login({ username, password });
            if (userData?.user_type === 'staff') {
                router.push('/staff-dashboard');
            } else {
                router.push('/');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={`${styles.loginCard} glass`}>
                <div className={styles.header}>
                    <h1 className="gradient-text">Hi-Rollin  Portal</h1>
                    <p>Welcome back! Please login to your account.</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.error}>{error}</div>}

                    <Input
                        label="Username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={loading}
                    >
                        Login
                    </Button>

                    <div className={styles.footer}>
                        <p>
                            Don't have an account?{' '}
                            <Link href="/register" className={styles.link}>
                                Register here
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
