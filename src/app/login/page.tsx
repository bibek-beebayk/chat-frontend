'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import styles from './page.module.css';
import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal';
import DownloadAppModal from '@/components/auth/DownloadAppModal';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const REMEMBER_LOGIN_KEY = 'rollinRememberLogin';
const REMEMBERED_IDENTIFIER_KEY = 'rollinRememberedIdentifier';

function LoginPageContent() {
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleReady, setGoogleReady] = useState(false);
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const googleButtonRef = useRef<HTMLDivElement>(null);
    const { login, googleLogin } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextUrl = searchParams.get('next');
    const registerHref = nextUrl ? `/register?next=${encodeURIComponent(nextUrl)}` : '/register';

    const finishLoginRedirect = useCallback(() => {
        const redirect = nextUrl ? `/post-login?next=${encodeURIComponent(nextUrl)}` : '/post-login';
        router.push(redirect);
    }, [nextUrl, router]);

    useEffect(() => {
        const remembered = localStorage.getItem(REMEMBER_LOGIN_KEY) === 'true';
        const rememberedIdentifier = localStorage.getItem(REMEMBERED_IDENTIFIER_KEY) || '';

        setRememberMe(remembered);
        if (rememberedIdentifier) {
            setUsernameOrEmail(rememberedIdentifier);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const identifier = usernameOrEmail.trim();

        try {
            await login({ username: identifier, password });
            if (rememberMe) {
                localStorage.setItem(REMEMBER_LOGIN_KEY, 'true');
                localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, identifier);
            } else {
                localStorage.removeItem(REMEMBER_LOGIN_KEY);
                localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
            }
            finishLoginRedirect();
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleCredential = useCallback(async (credential: string) => {
        setError('');
        setLoading(true);
        try {
            await googleLogin(credential);
            finishLoginRedirect();
        } catch (err: any) {
            setError(err.message || 'Google login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [finishLoginRedirect, googleLogin]);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID || !googleReady || !googleButtonRef.current) return;

        const google = (window as any).google;
        if (!google?.accounts?.id) return;

        googleButtonRef.current.innerHTML = '';
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: { credential?: string }) => {
                if (response.credential) {
                    handleGoogleCredential(response.credential);
                }
            },
        });
        google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'pill',
            text: 'continue_with',
            width: 320,
        });
    }, [googleReady, handleGoogleCredential]);

    return (
        <div className={`${styles.container} ${styles.loginCentered}`}>
            {GOOGLE_CLIENT_ID && (
                <Script
                    src="https://accounts.google.com/gsi/client"
                    strategy="afterInteractive"
                    onReady={() => setGoogleReady(true)}
                />
            )}
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
                            <h2>Welcome Back! 👋</h2>
                            <p>Login to continue to Rollin Community</p>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            {error && <div className={styles.error}>{error}</div>}

                            <Input
                                label="Username or email"
                                name="username"
                                type="text"
                                value={usernameOrEmail}
                                onChange={(e) => setUsernameOrEmail(e.target.value)}
                                placeholder="Enter username or email"
                                autoComplete="username"
                                leftElement={
                                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                }
                                required
                            />

                            <Input
                                label="Password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                leftElement={
                                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                }
                                rightElement={(
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowPassword((prev) => !prev)}
                                    >
                                        {showPassword ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9-3-11-8a18.45 18.45 0 0 1 5.06-6.94" /><path d="M1 1l22 22" /><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9 3 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" /></svg>
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>
                                        )}
                                    </button>
                                )}
                                required
                            />

                            <div className={styles.optionsRow}>
                                <label className={styles.checkbox}>
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setRememberMe(checked);
                                            if (!checked) {
                                                localStorage.removeItem(REMEMBER_LOGIN_KEY);
                                                localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
                                            }
                                        }}
                                    />
                                    Remember me
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsForgotModalOpen(true)}
                                    className={styles.link}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                    Forgot Password?
                                </button>
                            </div>

                            <Button type="submit" variant="primary" fullWidth loading={loading} size="lg">
                                Login &rarr;
                            </Button>

                            <div className={styles.divider}>or continue with</div>

                            <div className={styles.socialLogin}>
                                {GOOGLE_CLIENT_ID ? (
                                    <div className={styles.googleButtonSlot} ref={googleButtonRef} aria-label="Continue with Google" />
                                ) : (
                                    <button type="button" className={styles.socialBtn} disabled>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                        Google unavailable
                                    </button>
                                )}
                            </div>

                            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Don&apos;t have an account? </span>
                                <Link href={registerHref} className={styles.link}>
                                    Create Account &rarr;
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

            <ForgotPasswordModal
                isOpen={isForgotModalOpen}
                onClose={() => setIsForgotModalOpen(false)}
            />
            <DownloadAppModal 
                isOpen={isDownloadModalOpen}
                onClose={() => setIsDownloadModalOpen(false)}
            />
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginPageContent />
        </Suspense>
    );
}
