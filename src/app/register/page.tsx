'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import { UserType } from '@/types';
import styles from './page.module.css';

export default function RegisterPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [userType, setUserType] = useState<UserType>('player');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
            const response = await register({ username, email, user_type: userType, password, confirm_password: confirmPassword });

            // Store email for OTP verification page
            localStorage.setItem('pendingVerificationEmail', response.email);

            // Redirect to OTP verification page
            router.push(`/verify-otp?email=${encodeURIComponent(response.email)}`);
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
                    <p>Join Rollin Community today!</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.error}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            {error}
                        </div>
                    )}

                    <div className={styles.userTypeSection}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>I am a...</label>
                        <div className={styles.radioGroup}>
                            {userTypeOptions.map((option) => (
                                <label
                                    key={option.value}
                                    className={styles.radioLabel}
                                    data-checked={userType === option.value}
                                >
                                    <input
                                        type="radio"
                                        name="userType"
                                        value={option.value}
                                        checked={userType === option.value}
                                        onChange={(e) => setUserType(e.target.value as UserType)}
                                        className={styles.radioInput}
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
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                    />

                    <Input
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        rightElement={(
                            <button
                                type="button"
                                className={styles.passwordToggle}
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9-3-11-8a18.45 18.45 0 0 1 5.06-6.94" />
                                        <path d="M1 1l22 22" />
                                        <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9 3 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                        <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        )}
                        required
                    />

                    <Input
                        label="Confirm Password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                        rightElement={(
                            <button
                                type="button"
                                className={styles.passwordToggle}
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                            >
                                {showConfirmPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9-3-11-8a18.45 18.45 0 0 1 5.06-6.94" />
                                        <path d="M1 1l22 22" />
                                        <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9 3 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                        <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        )}
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={loading}
                        style={{ marginTop: '1rem', height: '3.2rem', fontSize: '1rem' }}
                    >
                        Create Account
                    </Button>

                    <div className={styles.footer}>
                        <span>Already have an account?</span>
                        <Link href="/login" className={styles.link}>
                            Sign In
                        </Link>
                    </div>
                    <div className={styles.footer}>
                        <span>Prefer the mobile app?</span>
                        <Link href="/download" className={styles.link}>
                            Download App
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
