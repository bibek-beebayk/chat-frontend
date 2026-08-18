'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import styles from './page.module.css';
import DownloadAppModal from '@/components/auth/DownloadAppModal';

function RegisterPageContent() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const { register } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextUrl = searchParams.get('next');
    const loginHref = nextUrl ? `/login?next=${encodeURIComponent(nextUrl)}` : '/login';

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
            const response = await register({ username, email, user_type: 'player', password, confirm_password: confirmPassword });

            // Store email for OTP verification page
            localStorage.setItem('pendingVerificationEmail', response.email);

            // Redirect to OTP verification page
            const verifyUrl = nextUrl
                ? `/verify-otp?email=${encodeURIComponent(response.email)}&next=${encodeURIComponent(nextUrl)}`
                : `/verify-otp?email=${encodeURIComponent(response.email)}`;
            router.push(verifyUrl);
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

        return (
        <div className={`${styles.container} ${styles.loginCentered}`}>

            <div className={styles.topLogoContainer}>
                <img src="/logo-2.png" alt="Rollin Community Logo" className={styles.topLogoImage} />
            </div>
            
            <div className={`${styles.contentWrapper} ${styles.mainCard}`}>
                <div className={styles.leftCol}>
                    <div className={styles.hero}>
                        {/* <p className={styles.welcomeText}>Welcome to the official</p> */}
                        <div className={styles.titleRow}>
                            <img src="/logo-2.png" alt="Icon" className={styles.inlineLogo} />
                            <h1 className={`${styles.title} gradient-text`} style={{ textTransform: 'uppercase' }}>ROLLIN COMMUNITY</h1>
                        </div>
                        <p className={styles.subtitle}>The official community for Hi-Rollin players!</p>
                    </div>

                    <div className={styles.featureListContainer}>
                        <div className={styles.featureList}>
                            {[
                                { value: '15,000+', label: 'Active Members', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
                                { value: '100+', label: 'Daily Discussions', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> },
                                { value: 'Weekly', label: 'Community Rewards', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg> },
                                { value: 'Events', label: '& Giveaways', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M7 4h10"></path><path d="M5 4h14a2 2 0 0 1 2 2v2a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8V6a2 2 0 0 1 2-2z"></path></svg> },
                                { value: 'Direct Support', label: 'From Our Team', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg> }
                            ].flatMap((feature, _, array) => [feature, feature]).map((feature, idx) => (
                                <div key={idx} className={`${styles.featureItem} ${idx >= 5 ? styles.duplicateItem : ''}`}>
                                    <div className={styles.featureIcon}>{feature.icon}</div>
                                    <div className={styles.featureText}>
                                        <h4>{feature.value}</h4>
                                        <p>{feature.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={styles.rightCol}>
                    <div className={`${styles.loginCard}`}>
                <div className={styles.cardHeader}>
                    <h2>Create Account 🚀</h2>
                    <p>Join Rollin Community today!</p>
                </div>

                
                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.error}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            {error}
                        </div>
                    )}

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

                    <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Already have an account? </span>
                        <Link href={loginHref} className={styles.link}>
                            Sign In &rarr;
                        </Link>
                    </div>

                    <button 
                        type="button" 
                        onClick={() => setIsDownloadModalOpen(true)} 
                        className={styles.downloadPrompt}
                        style={{ background: 'rgba(153, 51, 255, 0.1)', cursor: 'pointer', textAlign: 'left', width: '100%', border: '1px solid rgba(153, 51, 255, 0.28)' }}
                    >
                        <span>Prefer the mobile app?</span>
                        <strong>Download App</strong>
                    </button>
                </form>

            </div>
            </div>
            </div>
            <DownloadAppModal 
                isOpen={isDownloadModalOpen}
                onClose={() => setIsDownloadModalOpen(false)}
            />
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RegisterPageContent />
        </Suspense>
    );
}
