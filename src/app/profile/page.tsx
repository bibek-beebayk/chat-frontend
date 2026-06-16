'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { Toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { UserAvatar } from '@/components/social/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import styles from './page.module.css';

type ToastState = { message: string; type: 'success' | 'error' } | null;

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading, checkAuth, deleteAccount } = useAuth();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [toast, setToast] = useState<ToastState>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const [isVerifyPasswordModalOpen, setIsVerifyPasswordModalOpen] = useState(false);
    const [isEmailEntryModalOpen, setIsEmailEntryModalOpen] = useState(false);
    const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
    const [verifiedPassword, setVerifiedPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [emailOtp, setEmailOtp] = useState('');
    const [emailStepLoading, setEmailStepLoading] = useState(false);

    const [agentAvailability, setAgentAvailability] = useState('online');
    const [agentStatusNote, setAgentStatusNote] = useState('');
    const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleteFinalOpen, setIsDeleteFinalOpen] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [loading, router, user]);

    useEffect(() => {
        if (!user) return;
        setAgentAvailability(user.agent_availability || 'online');
        setAgentStatusNote(user.agent_status_note || '');
    }, [user]);

    const resetEmailFlow = () => {
        setVerifiedPassword('');
        setNewEmail('');
        setEmailOtp('');
        setIsVerifyPasswordModalOpen(false);
        setIsEmailEntryModalOpen(false);
        setIsOtpModalOpen(false);
        setEmailStepLoading(false);
    };

    const onPickAvatar = () => {
        fileInputRef.current?.click();
    };

    const onAvatarSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setToast({ message: 'Please select an image file.', type: 'error' });
            return;
        }

        const formData = new FormData();
        formData.append('profile_picture', file);

        try {
            setIsUploadingAvatar(true);
            await apiClient.postFormData('/api/auth/profile/picture/', formData);
            await checkAuth();
            setToast({ message: 'Profile picture updated.', type: 'success' });
        } catch (error: any) {
            setToast({ message: error?.message || 'Failed to update profile picture.', type: 'error' });
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const verifyCurrentPassword = async (password: string) => {
        try {
            setEmailStepLoading(true);
            await apiClient.post('/api/auth/verify-current-password/', { current_password: password });
            setVerifiedPassword(password);
            setIsVerifyPasswordModalOpen(false);
            setIsEmailEntryModalOpen(true);
        } catch (error: any) {
            setToast({ message: error?.message || 'Current password is incorrect.', type: 'error' });
        } finally {
            setEmailStepLoading(false);
        }
    };

    const requestEmailOtp = async () => {
        if (!newEmail.trim()) {
            setToast({ message: 'Please enter a new email address.', type: 'error' });
            return;
        }
        try {
            setEmailStepLoading(true);
            await apiClient.post('/api/auth/email-change/request/', {
                new_email: newEmail.trim(),
                current_password: verifiedPassword,
            });
            setIsEmailEntryModalOpen(false);
            setIsOtpModalOpen(true);
            setToast({ message: 'OTP sent to your new email.', type: 'success' });
        } catch (error: any) {
            setToast({ message: error?.message || 'Failed to request OTP.', type: 'error' });
        } finally {
            setEmailStepLoading(false);
        }
    };

    const verifyEmailOtp = async () => {
        if (!emailOtp.trim()) {
            setToast({ message: 'Please enter the OTP code.', type: 'error' });
            return;
        }
        try {
            setEmailStepLoading(true);
            await apiClient.post('/api/auth/email-change/verify/', {
                new_email: newEmail.trim(),
                otp_code: emailOtp.trim(),
            });
            await checkAuth();
            setToast({ message: 'Email changed successfully.', type: 'success' });
            resetEmailFlow();
        } catch (error: any) {
            setToast({ message: error?.message || 'Failed to verify OTP.', type: 'error' });
        } finally {
            setEmailStepLoading(false);
        }
    };

    const updateAvailability = async () => {
        try {
            setIsUpdatingAvailability(true);
            await apiClient.patch('/api/auth/agent-availability/', {
                agent_availability: agentAvailability,
                agent_status_note: agentStatusNote,
            });
            await checkAuth();
            setToast({ message: 'Availability updated.', type: 'success' });
        } catch (error: any) {
            setToast({ message: error?.message || 'Failed to update availability.', type: 'error' });
        } finally {
            setIsUpdatingAvailability(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            setIsDeletingAccount(true);
            await deleteAccount();
            setToast({ message: 'Account deleted successfully.', type: 'success' });
            window.location.href = '/login';
        } catch (error: any) {
            setToast({ message: error?.message || 'Failed to delete account.', type: 'error' });
        } finally {
            setIsDeletingAccount(false);
        }
    };

    if (loading || !user) {
        return null;
    }

    return (
        <DashboardLayout>
            <main className={styles.main}>
                <section className={styles.panel}>
                    <h1 className={styles.title}>Profile</h1>

                    <div className={styles.profileCard}>
                        <UserAvatar user={user} size={74} />
                        <div className={styles.identity}>
                            <h2 className={styles.username}>{user.username}</h2>
                            <p className={styles.email}>{user.email || 'No email set'}</p>
                            <p className={styles.userType}>{user.user_type}</p>
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={onAvatarSelected}
                        className={styles.hiddenFileInput}
                    />

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Account</h3>
                        <div className={styles.actionsList}>
                            <button type="button" className={styles.actionBtn} onClick={onPickAvatar} disabled={isUploadingAvatar}>
                                {isUploadingAvatar ? 'Uploading picture...' : 'Change Profile Picture'}
                            </button>
                            <button type="button" className={styles.actionBtn} onClick={() => setIsVerifyPasswordModalOpen(true)}>
                                Change Email
                            </button>
                            <button type="button" className={styles.actionBtn} onClick={() => setIsPasswordModalOpen(true)}>
                                Change Password
                            </button>
                        </div>
                    </div>

                    {user.user_type === 'agent' && (
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Agent Availability</h3>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Availability</label>
                                <select
                                    className={styles.input}
                                    value={agentAvailability}
                                    onChange={(e) => setAgentAvailability(e.target.value)}
                                >
                                    <option value="online">Online</option>
                                    <option value="busy">Busy</option>
                                    <option value="away">Away</option>
                                    <option value="offline">Offline</option>
                                </select>
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>Status note</label>
                                <input
                                    className={styles.input}
                                    value={agentStatusNote}
                                    onChange={(e) => setAgentStatusNote(e.target.value)}
                                    placeholder="Add quick status note"
                                    maxLength={120}
                                />
                            </div>
                            <button type="button" className={styles.primaryBtn} onClick={updateAvailability} disabled={isUpdatingAvailability}>
                                {isUpdatingAvailability ? 'Saving...' : 'Save Availability'}
                            </button>
                        </div>
                    )}

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Danger Zone</h3>
                        <button
                            type="button"
                            className={styles.dangerBtn}
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            disabled={isDeletingAccount}
                        >
                            {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
                        </button>
                    </div>
                </section>
            </main>

            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                onSuccess={(message) => setToast({ message, type: 'success' })}
                onError={(message) => setToast({ message, type: 'error' })}
            />

            <Modal
                isOpen={isVerifyPasswordModalOpen}
                onClose={resetEmailFlow}
                title="Verify Current Password"
                footer={
                    <>
                        <button className={styles.modalSecondaryBtn} onClick={resetEmailFlow} disabled={emailStepLoading}>
                            Cancel
                        </button>
                        <button
                            className={styles.modalPrimaryBtn}
                            onClick={() => verifyCurrentPassword(verifiedPassword)}
                            disabled={emailStepLoading || !verifiedPassword.trim()}
                        >
                            {emailStepLoading ? 'Verifying...' : 'Continue'}
                        </button>
                    </>
                }
            >
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>Current password</label>
                    <input
                        className={styles.input}
                        type="password"
                        value={verifiedPassword}
                        onChange={(e) => setVerifiedPassword(e.target.value)}
                        autoFocus
                    />
                </div>
            </Modal>

            <Modal
                isOpen={isEmailEntryModalOpen}
                onClose={resetEmailFlow}
                title="Enter New Email"
                footer={
                    <>
                        <button className={styles.modalSecondaryBtn} onClick={resetEmailFlow} disabled={emailStepLoading}>
                            Cancel
                        </button>
                        <button
                            className={styles.modalPrimaryBtn}
                            onClick={requestEmailOtp}
                            disabled={emailStepLoading || !newEmail.trim()}
                        >
                            {emailStepLoading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </>
                }
            >
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>New email address</label>
                    <input
                        className={styles.input}
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        autoFocus
                    />
                </div>
            </Modal>

            <Modal
                isOpen={isOtpModalOpen}
                onClose={resetEmailFlow}
                title="Verify OTP"
                footer={
                    <>
                        <button className={styles.modalSecondaryBtn} onClick={resetEmailFlow} disabled={emailStepLoading}>
                            Cancel
                        </button>
                        <button
                            className={styles.modalPrimaryBtn}
                            onClick={verifyEmailOtp}
                            disabled={emailStepLoading || !emailOtp.trim()}
                        >
                            {emailStepLoading ? 'Verifying...' : 'Verify & Update Email'}
                        </button>
                    </>
                }
            >
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>OTP sent to {newEmail || 'new email'}</label>
                    <input
                        className={styles.input}
                        type="text"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value)}
                        maxLength={6}
                        autoFocus
                    />
                </div>
            </Modal>

            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                title="Delete Account"
                footer={
                    <>
                        <button className={styles.modalSecondaryBtn} onClick={() => setIsDeleteConfirmOpen(false)} disabled={isDeletingAccount}>
                            Cancel
                        </button>
                        <button
                            className={styles.modalDangerBtn}
                            onClick={() => {
                                setIsDeleteConfirmOpen(false);
                                setIsDeleteFinalOpen(true);
                            }}
                            disabled={isDeletingAccount}
                        >
                            Continue
                        </button>
                    </>
                }
            >
                <p className={styles.modalText}>Are you sure you want to permanently delete your account?</p>
            </Modal>

            <Modal
                isOpen={isDeleteFinalOpen}
                onClose={() => setIsDeleteFinalOpen(false)}
                title="Final Confirmation"
                footer={
                    <>
                        <button className={styles.modalSecondaryBtn} onClick={() => setIsDeleteFinalOpen(false)} disabled={isDeletingAccount}>
                            Cancel
                        </button>
                        <button className={styles.modalDangerBtn} onClick={handleDeleteAccount} disabled={isDeletingAccount}>
                            {isDeletingAccount ? 'Deleting...' : 'Delete Permanently'}
                        </button>
                    </>
                }
            >
                <p className={styles.modalText}>This action cannot be undone.</p>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </DashboardLayout>
    );
}

