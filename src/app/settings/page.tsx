'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { Toast } from '@/components/ui/Toast';
import styles from './page.module.css';

export default function SettingsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
