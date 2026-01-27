'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './VerifyUserIDModal.module.css';

interface VerifyUserIDModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerify: (userId: string, otp: string) => Promise<any>;
    onInitiate: () => Promise<void>;
}

export default function VerifyUserIDModal({ isOpen, onClose, onVerify, onInitiate }: VerifyUserIDModalProps) {
    const [userId, setUserId] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState<'input-id' | 'input-otp'>('input-id');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setStep('input-id');
            setUserId('');
            setOtp(['', '', '', '', '', '']);
            setError('');
            setSuccess('');
        }
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return; // Prevent multiple chars

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleInitiate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userId.trim()) {
            setError('Please enter your user ID');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await onInitiate();
            setStep('input-otp');
            setSuccess('OTP sent to your email!');
        } catch (err: any) {
            setError(err.message || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpValue = otp.join('');

        if (otpValue.length !== 6) {
            setError('Please enter the complete 6-digit OTP');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await onVerify(userId.trim(), otpValue);
            setSuccess('Verification request sent. A staff will verify your account and contact you');

            // Close modal after a short delay
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return createPortal(
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>🔐 Verify Your Account</h2>
                    <button
                        onClick={handleClose}
                        className={styles.closeButton}
                        disabled={loading}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className={styles.content}>
                    <p className={styles.description}>
                        {step === 'input-id'
                            ? "Enter your external user ID to request notification. We'll send an OTP to your email to confirm."
                            : "Enter the 6-digit OTP sent to your email to verify your request."
                        }
                    </p>

                    {step === 'input-id' ? (
                        <form onSubmit={handleInitiate}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="userId" className={styles.label}>
                                    User ID
                                </label>
                                <input
                                    id="userId"
                                    type="text"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    placeholder="Enter your user ID"
                                    className={styles.input}
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className={styles.error}>
                                    <span className={styles.errorIcon}>⚠️</span>
                                    {error}
                                </div>
                            )}

                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className={styles.cancelButton}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.verifyButton}
                                    disabled={loading || !userId.trim()}
                                >
                                    {loading ? 'Sending...' : 'Next'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerify}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>
                                    Enter OTP
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                            className={styles.input}
                                            style={{ width: '3rem', textAlign: 'center' }}
                                            disabled={loading}
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>
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

                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    onClick={() => setStep('input-id')}
                                    className={styles.cancelButton}
                                    disabled={loading}
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    className={styles.verifyButton}
                                    disabled={loading || otp.some(d => !d)}
                                >
                                    {loading ? 'Verifying...' : 'Verify'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
