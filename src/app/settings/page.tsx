'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { UserAvatar } from '@/components/social/UserAvatar';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeMode, useTheme } from '@/contexts/ThemeContext';
import { apiClient } from '@/lib/api';
import styles from './page.module.css';

type ToastState = { message: string; type: 'success' | 'error' } | null;
type SectionKey = 'account' | 'appearance' | 'security' | 'notifications';

export default function SettingsPage() {
    const router = useRouter();
    const { user, loading, logout, checkAuth, deleteAccount } = useAuth();
    const { themeMode, accentColor, accentOptions, setThemeMode, setAccentColor } = useTheme();
    const [toast, setToast] = useState<ToastState>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [expandedSection, setExpandedSection] = useState<SectionKey | null>(null);
    const [preferences, setPreferences] = useState({
        emailUpdates: true,
        communityAlerts: true,
        directMessages: true,
        weeklyDigest: false,
    });

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
        if (
            !loading &&
            user &&
            typeof window !== 'undefined' &&
            new URLSearchParams(window.location.search).get('setupPassword') === '1'
        ) {
            setIsPasswordModalOpen(true);
        }
    }, [loading, user]);

    useEffect(() => {
        if (!user) return;
        setAgentAvailability(user.agent_availability || 'online');
        setAgentStatusNote(user.agent_status_note || '');
    }, [user]);

    if (loading || !user) {
        return null;
    }

    const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
    const isPasswordSetupMode = user.has_usable_password === false;

    const togglePreference = (key: keyof typeof preferences) => {
        setPreferences((current) => ({ ...current, [key]: !current[key] }));
    };

    const toggleSection = (key: SectionKey) => {
        setExpandedSection((current) => (current === key ? null : key));
    };

    const handleLogout = async () => {
        if (!window.confirm('Log out of Rollin Community?')) return;
        await logout();
        router.push('/login');
    };

    const resetEmailFlow = () => {
        setVerifiedPassword('');
        setNewEmail('');
        setEmailOtp('');
        setIsVerifyPasswordModalOpen(false);
        setIsEmailEntryModalOpen(false);
        setIsOtpModalOpen(false);
        setEmailStepLoading(false);
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

    return (
        <DashboardLayout>
            <PageShell title="Settings" eyebrow="" description="" width="wide">
                <section className={styles.profileCard}>
                    <div className={styles.avatarRing}>
                        <UserAvatar user={user} size={64} />
                        <span className={styles.crownBadge} aria-hidden="true">👑</span>
                    </div>
                    <div className={styles.profileInfo}>
                        <h2>{displayName}</h2>
                        <p>@{user.username}</p>
                    </div>
                    <Link href="/profile" className={styles.viewProfileBtn}>View Profile</Link>
                </section>

                <div className={styles.menuList}>
                    <button
                        type="button"
                        className={styles.menuRow}
                        onClick={() => toggleSection('account')}
                        aria-expanded={expandedSection === 'account'}
                    >
                        <span className={styles.menuLeft}><AccountIcon /> Account</span>
                        <ChevronIcon expanded={expandedSection === 'account'} />
                    </button>
                    {expandedSection === 'account' && (
                        <div className={styles.expandedPanel}>
                            <button type="button" className={styles.actionRow} onClick={() => setIsVerifyPasswordModalOpen(true)}>
                                <span>
                                    <strong>Change Email</strong>
                                    <small>Update the email address linked to your account.</small>
                                </span>
                                <span aria-hidden="true">›</span>
                            </button>
                            {/* Payments link temporarily hidden - not deleted, just unlinked from Settings for now. */}

                            {user.user_type === 'agent' && (
                                <div className={styles.subSection}>
                                    <h3 className={styles.optionTitle}>Agent Availability</h3>
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
                        </div>
                    )}

                    <button
                        type="button"
                        className={styles.menuRow}
                        onClick={() => toggleSection('appearance')}
                        aria-expanded={expandedSection === 'appearance'}
                    >
                        <span className={styles.menuLeft}><AppearanceIcon /> Appearance</span>
                        <ChevronIcon expanded={expandedSection === 'appearance'} />
                    </button>
                    {expandedSection === 'appearance' && (
                        <div className={styles.expandedPanel}>
                            <div className={styles.subSection}>
                                <h3 className={styles.optionTitle}>Theme</h3>
                                <div className={styles.segment}>
                                    {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            className={`${styles.segmentBtn} ${themeMode === mode ? styles.active : ''}`}
                                            onClick={() => setThemeMode(mode)}
                                        >
                                            {mode[0].toUpperCase() + mode.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.subSection}>
                                <h3 className={styles.optionTitle}>Accent Color</h3>
                                <div className={styles.accentGrid}>
                                    {accentOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            className={`${styles.accentBtn} ${accentColor.toLowerCase() === option.value.toLowerCase() ? styles.activeAccent : ''}`}
                                            onClick={() => setAccentColor(option.value)}
                                            title={option.label}
                                            aria-label={option.label}
                                        >
                                            <span className={styles.accentDot} style={{ backgroundColor: option.value }} />
                                            <span className={styles.accentLabel}>{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        className={styles.menuRow}
                        onClick={() => toggleSection('security')}
                        aria-expanded={expandedSection === 'security'}
                    >
                        <span className={styles.menuLeft}><SecurityIcon /> Security</span>
                        <ChevronIcon expanded={expandedSection === 'security'} />
                    </button>
                    {expandedSection === 'security' && (
                        <div className={styles.expandedPanel}>
                            <button type="button" className={styles.actionRow} onClick={() => setIsPasswordModalOpen(true)}>
                                <span>
                                    <strong>{isPasswordSetupMode ? 'Set Password' : 'Change Password'}</strong>
                                    <small>{isPasswordSetupMode ? 'Add a password for username or email login.' : 'Update your current password.'}</small>
                                </span>
                                <span aria-hidden="true">›</span>
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        className={styles.menuRow}
                        onClick={() => toggleSection('notifications')}
                        aria-expanded={expandedSection === 'notifications'}
                    >
                        <span className={styles.menuLeft}><NotificationsIcon /> Notifications</span>
                        <ChevronIcon expanded={expandedSection === 'notifications'} />
                    </button>
                    {expandedSection === 'notifications' && (
                        <div className={styles.expandedPanel}>
                            <SettingToggle
                                title="Email Updates"
                                description="Announcements, events, and reward reminders."
                                checked={preferences.emailUpdates}
                                onClick={() => togglePreference('emailUpdates')}
                            />
                            <SettingToggle
                                title="Community Alerts"
                                description="Activity on pinned posts, tips, and discussions."
                                checked={preferences.communityAlerts}
                                onClick={() => togglePreference('communityAlerts')}
                            />
                            <SettingToggle
                                title="Direct Messages"
                                description="New chat and support message notifications."
                                checked={preferences.directMessages}
                                onClick={() => togglePreference('directMessages')}
                            />
                            <SettingToggle
                                title="Weekly Digest"
                                description="A weekly summary of popular community activity."
                                checked={preferences.weeklyDigest}
                                onClick={() => togglePreference('weeklyDigest')}
                            />
                        </div>
                    )}

                    <Link href="/privacy" className={styles.menuRow}>
                        <span className={styles.menuLeft}><PrivacyIcon /> Privacy</span>
                        <ChevronIcon />
                    </Link>

                    <div className={styles.menuRow}>
                        <span className={styles.menuLeft}><LanguageIcon /> Language</span>
                        <span className={styles.menuValue}>English</span>
                    </div>

                    <div className={styles.menuDivider} />

                    <Link href="/support" className={styles.menuRow}>
                        <span className={styles.menuLeft}><HelpIcon /> Help &amp; Support</span>
                        <ChevronIcon />
                    </Link>
                    <Link href="/terms" className={styles.menuRow}>
                        <span className={styles.menuLeft}><TermsIcon /> Terms of Service</span>
                        <ChevronIcon />
                    </Link>
                    <Link href="/about" className={styles.menuRow}>
                        <span className={styles.menuLeft}><AboutIcon /> About Rollin Community</span>
                        <ChevronIcon />
                    </Link>
                </div>

                <section className={styles.dangerZone}>
                    <h3 className={styles.dangerZoneTitle}>Danger Zone</h3>
                    <p className={styles.dangerZoneDesc}>Permanently remove your account and related access.</p>
                    <button
                        type="button"
                        className={styles.dangerBtn}
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        disabled={isDeletingAccount}
                    >
                        {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
                    </button>
                </section>

                <button type="button" className={styles.logoutBtn} onClick={handleLogout}>Log Out</button>

                <ChangePasswordModal
                    isOpen={isPasswordModalOpen}
                    onClose={() => setIsPasswordModalOpen(false)}
                    requiresCurrentPassword={!isPasswordSetupMode}
                    onSuccess={(message) => {
                        setToast({ message, type: 'success' });
                        setIsPasswordModalOpen(false);
                        if (isPasswordSetupMode) {
                            checkAuth().finally(() => router.replace('/'));
                            return;
                        }
                        checkAuth();
                    }}
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

                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </PageShell>
        </DashboardLayout>
    );
}

function SettingToggle({
    title,
    description,
    checked,
    onClick,
}: {
    title: string;
    description: string;
    checked: boolean;
    onClick: () => void;
}) {
    return (
        <button type="button" className={styles.settingToggle} onClick={onClick} aria-pressed={checked}>
            <span>
                <strong>{title}</strong>
                <small>{description}</small>
            </span>
            <span className={`${styles.switch} ${checked ? styles.switchActive : ''}`}>
                <span />
            </span>
        </button>
    );
}

function ChevronIcon({ expanded }: { expanded?: boolean }) {
    return (
        <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={styles.chevron}
            style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
        >
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}

function AccountIcon() {
    return (
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function AppearanceIcon() {
    return (
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 3.2 19.47c.7-.24.9-1.13.36-1.65a2.2 2.2 0 0 1 1.5-3.8H18a3 3 0 0 0 3-3 10 10 0 0 0-9-11Z" />
            <circle cx="8" cy="9" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="14.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="17" cy="12.5" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="10" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
        </svg>
    );
}

function SecurityIcon() {
    return (
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        </svg>
    );
}

function NotificationsIcon() {
    return (
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}

function PrivacyIcon() {
    return (
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function LanguageIcon() {
    return (
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
        </svg>
    );
}

function HelpIcon() {
    return (
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

function TermsIcon() {
    return (
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
    );
}

function AboutIcon() {
    return (
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    );
}
