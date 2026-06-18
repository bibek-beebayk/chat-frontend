'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './verify-otp.module.css';

import { Suspense } from 'react';

function VerifyOTPContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { verifyOTP, resendOTP } = useAuth();

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [expiresIn, setExpiresIn] = useState(30 * 60); // 30 minutes in seconds

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Get email from URL params or localStorage
        const emailParam = searchParams.get('email');
        const storedEmail = localStorage.getItem('pendingVerificationEmail');

        if (emailParam) {
            setEmail(emailParam);
            localStorage.setItem('pendingVerificationEmail', emailParam);
        } else if (storedEmail) {
            setEmail(storedEmail);
        } else {
            // No email found, redirect to register
            router.push('/register');
        }
    }, [searchParams, router]);

    useEffect(() => {
        // Countdown timer for OTP expiration
        if (expiresIn > 0) {
            const timer = setInterval(() => {
                setExpiresIn(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [expiresIn]);

    useEffect(() => {
        // Countdown timer for resend cooldown
        if (resendCooldown > 0) {
            const timer = setInterval(() => {
                setResendCooldown(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [resendCooldown]);

    const handleOtpChange = (index: number, value: string) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits are entered
        if (newOtp.every(digit => digit !== '') && index === 5) {
            handleVerify(newOtp.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);

        if (!/^\d+$/.test(pastedData)) return;

        const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
        setOtp(newOtp);

        // Focus the next empty input or the last one
        const nextIndex = Math.min(pastedData.length, 5);
        inputRefs.current[nextIndex]?.focus();

        // Auto-submit if all 6 digits are pasted
        if (pastedData.length === 6) {
            handleVerify(pastedData);
        }
    };

    const handleVerify = async (otpCode?: string) => {
        const code = otpCode || otp.join('');

        if (code.length !== 6) {
            setError('Please enter all 6 digits');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await verifyOTP(email, code);
            setSuccess('Email verified successfully! Redirecting...');
            localStorage.removeItem('pendingVerificationEmail');

            // Redirect after a short delay.
            setTimeout(() => {
                router.push('/post-login');
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Verification failed. Please try again.');
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await resendOTP(email);
            setSuccess('A new OTP code has been sent to your email!');
            setResendCooldown(60); // 60 seconds cooldown
            setExpiresIn(30 * 60); // Reset expiration timer
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (err: any) {
            setError(err.message || 'Failed to resend OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h1 className={styles.title}>📧 Verify Your Email</h1>
                    <p className={styles.description}>
                        We&apos;ve sent a 6-digit code to <strong>{email}</strong>
                    </p>
                </div>

                <div className={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={el => { inputRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleOtpChange(index, e.target.value)}
                            onKeyDown={e => handleKeyDown(index, e)}
                            onPaste={index === 0 ? handlePaste : undefined}
                            className={styles.otpInput}
                            disabled={loading}
                            autoFocus={index === 0}
                        />
                    ))}
                </div>

                {error && (
                    <div className={styles.error}>
                        <span className={styles.errorIcon}>⚠️</span>
                        {error}
                    </div>
                )}

                {success && (
                    <div className={styles.success}>
                        <span className={styles.successIcon}>✓</span>
                        {success}
                    </div>
                )}

                <button
                    onClick={() => handleVerify()}
                    disabled={loading || otp.some(digit => digit === '')}
                    className={styles.verifyButton}
                >
                    {loading ? 'Verifying...' : 'Verify Email'}
                </button>

                <div className={styles.footer}>
                    <div className={styles.timer}>
                        {expiresIn > 0 ? (
                            <p>Code expires in: <strong>{formatTime(expiresIn)}</strong></p>
                        ) : (
                            <p className={styles.expired}>Code has expired</p>
                        )}
                    </div>

                    <div className={styles.resend}>
                        <p>Didn&apos;t receive the code?</p>
                        <button
                            onClick={handleResend}
                            disabled={loading || resendCooldown > 0}
                            className={styles.resendButton}
                        >
                            {resendCooldown > 0
                                ? `Resend in ${resendCooldown}s`
                                : 'Resend OTP'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function VerifyOTPPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyOTPContent />
        </Suspense>
    );
}
