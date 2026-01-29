'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './ForgotPasswordModal.module.css';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const { forgotPasswordInit, forgotPasswordVerify, forgotPasswordConfirm } = useAuth();

    if (!isOpen) return null;

    const handleStep1 = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await forgotPasswordInit(email);
            setStep(2);
            setSuccessMessage(`OTP sent to ${email}`);
        } catch (err: any) {
            setError(err.message || 'Failed to send OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const token = await forgotPasswordVerify(email, otp);
            setResetToken(token);
            setStep(3);
            setSuccessMessage('OTP verified. Set your new password.');
        } catch (err: any) {
            setError(err.message || 'Invalid OTP.');
        } finally {
            setLoading(false);
        }
    };

    const handleStep3 = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (newPassword !== confirmNewPassword) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }

        try {
            await forgotPasswordConfirm(resetToken, newPassword, confirmNewPassword);
            setSuccessMessage("Password reset successfully!");
            setTimeout(() => {
                onClose();
                setStep(1);
                setEmail('');
                setOtp('');
                setNewPassword('');
                setConfirmNewPassword('');
                setResetToken('');
                setSuccessMessage('');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                <h2>Reset Password</h2>

                {error && <div className={styles.error}>{error}</div>}
                {successMessage && !error && <div className={styles.success}>{successMessage}</div>}

                {step === 1 && (
                    <form onSubmit={handleStep1}>
                        <p>Enter your email to receive an OTP.</p>
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={styles.input}
                        />
                        <button type="submit" disabled={loading} className={styles.btn}>
                            {loading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleStep2}>
                        <p>Enter the 6-digit OTP sent to {email}.</p>
                        <input
                            type="text"
                            placeholder="OTP Code"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                            maxLength={6}
                            className={styles.input}
                        />
                        <button type="submit" disabled={loading} className={styles.btn}>
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleStep3}>
                        <p>Create a new password.</p>
                        <input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            className={styles.input}
                        />
                        <input
                            type="password"
                            placeholder="Confirm New Password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            required
                            minLength={6}
                            className={styles.input}
                        />
                        <button type="submit" disabled={loading} className={styles.btn}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
