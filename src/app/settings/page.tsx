'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { Toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import styles from './page.module.css';

export default function SettingsPage() {
    const { user, deleteAccount } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleteFinalOpen, setIsDeleteFinalOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleDeleteAccount = async () => {
        try {
            setIsDeletingAccount(true);
            await deleteAccount();
            setToast({ message: 'Account deleted successfully.', type: 'success' });
            window.location.href = '/login';
        } catch (error: any) {
            const msg = error?.message || 'Failed to delete account.';
            setToast({ message: msg, type: 'error' });
        } finally {
            setIsDeletingAccount(false);
        }
    };

    // Provide default user object if null to avoid runtime crashes during redirects/loading
    if (!user) return null; // Or loading spinner

    return (
        <div className={styles.pageWrapper}>
            <Header />
            <main className={styles.container}>
                <div className={styles.content}>
                    {/* Sidepanel */}
                    <aside className={styles.sidebar}>
                        <button
                            className={`${styles.menuItem} ${activeTab === 'profile' ? styles.active : ''}`}
                            onClick={() => setActiveTab('profile')}
                        >
                            Profile
                        </button>
                        {/* Future items: Notifications, Appearance, etc. */}
                    </aside>

                    {/* Main Panel */}
                    <section className={styles.mainPanel}>
                        {activeTab === 'profile' && (
                            <div>
                                <h1 className={styles.sectionTitle}>Profile Settings</h1>

                                <div className={styles.profileField}>
                                    <span className={styles.label}>Username</span>
                                    <div className={styles.value}>{user.username}</div>
                                </div>

                                <div className={styles.profileField}>
                                    <span className={styles.label}>Email</span>
                                    <div className={styles.value}>{user.email || 'Not set'}</div>
                                </div>

                                <div className={styles.profileField} style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                                    <span className={styles.label}>Security</span>
                                    <button
                                        onClick={() => setIsPasswordModalOpen(true)}
                                        className={styles.actionButton}
                                    >
                                        Change Password
                                    </button>
                                </div>

                                <div className={styles.profileField} style={{ marginTop: '1.2rem' }}>
                                    <span className={styles.label}>Danger Zone</span>
                                    <button
                                        onClick={() => setIsDeleteConfirmOpen(true)}
                                        className={`${styles.actionButton} ${styles.dangerButton}`}
                                        disabled={isDeletingAccount}
                                    >
                                        {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* Modals & Toasts */}
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
                onSuccess={(msg) => setToast({ message: msg, type: 'success' })}
                onError={(msg) => setToast({ message: msg, type: 'error' })}
            />

            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                title="Delete Account"
                footer={
                    <>
                        <button
                            className={styles.modalSecondaryBtn}
                            onClick={() => setIsDeleteConfirmOpen(false)}
                            disabled={isDeletingAccount}
                        >
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
                <p className={styles.modalText}>
                    Are you sure you want to permanently delete your account? This action cannot be undone.
                </p>
            </Modal>

            <Modal
                isOpen={isDeleteFinalOpen}
                onClose={() => setIsDeleteFinalOpen(false)}
                title="Final Confirmation"
                footer={
                    <>
                        <button
                            className={styles.modalSecondaryBtn}
                            onClick={() => setIsDeleteFinalOpen(false)}
                            disabled={isDeletingAccount}
                        >
                            Cancel
                        </button>
                        <button
                            className={styles.modalDangerBtn}
                            onClick={handleDeleteAccount}
                            disabled={isDeletingAccount}
                        >
                            {isDeletingAccount ? 'Deleting...' : 'Delete Permanently'}
                        </button>
                    </>
                }
            >
                <p className={styles.modalText}>
                    All data related to your account will be removed permanently. Do you want to proceed?
                </p>
            </Modal>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
