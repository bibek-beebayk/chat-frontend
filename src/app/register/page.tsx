'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import { UserType } from '@/types';
import styles from '../login/page.module.css';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [userType, setUserType] = useState<UserType>('player');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            await register({ username, user_type: userType, password, confirm_password: confirmPassword });
            router.push('/login');
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const userTypeOptions = [
        { value: 'player', label: 'Player' },
        { value: 'agent', label: 'Agent' },
    ];

    return (
        <div className={styles.container}>
            <div className={`${styles.loginCard} glass`}>
                <div className={styles.header}>
                    <h1 className="gradient-text">Create Account</h1>
                    <p>Join Hi-Rollin Portal today!</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.error}>{error}</div>}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>Who are you?</label>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            {userTypeOptions.map((option) => (
                                <label key={option.value} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--color-text-primary)' }}>
                                    <input
                                        type="radio"
                                        name="userType"
                                        value={option.value}
                                        checked={userType === option.value}
                                        onChange={(e) => setUserType(e.target.value as UserType)}
                                        style={{
                                            marginRight: '0.5rem',
                                            width: '1.2rem',
                                            height: '1.2rem',
                                            accentColor: '#8b5cf6'
                                        }}
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <Input
                        label="Username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a username"
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Choose a password"
                        required
                    />

                    <Input
                        label="Confirm Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={loading}
                    >
                        Register
                    </Button>

                    <div className={styles.footer}>
                        <p>
                            Already have an account?{' '}
                            <Link href="/login" className={styles.link}>
                                Login here
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
