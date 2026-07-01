'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { UserAvatar } from '@/components/social/UserAvatar';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeMode, useTheme } from '@/contexts/ThemeContext';
import styles from './page.module.css';

type ToastState = { message: string; type: 'success' | 'error' } | null;

export default function SettingsPage() {
    const router = useRouter();
    const { user, loading, checkAuth } = useAuth();
    const { themeMode, accentColor, accentOptions, setThemeMode, setAccentColor } = useTheme();
    const [toast, setToast] = useState<ToastState>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [preferences, setPreferences] = useState({
        emailUpdates: true,
        communityAlerts: true,
        directMessages: true,
        weeklyDigest: false,
    });

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

    if (loading || !user) {
        return null;
    }

    const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
    const userType = user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1);
    const isPasswordSetupMode = user.has_usable_password === false;

    const togglePreference = (key: keyof typeof preferences) => {
        setPreferences((current) => ({ ...current, [key]: !current[key] }));
    };

    return (
        <DashboardLayout>
            <PageShell
                title="Settings"
                eyebrow="Settings"
                description="Manage profile details, appearance, notifications, security, and community preferences."
                width="wide"
            >
                <div className={styles.settingsGrid}>
                    <section className={`${styles.panel} ${styles.profilePanel}`}>
                        <div className={styles.profileSummary}>
                            <UserAvatar user={user} size={72} />
                            <div>
                                <h2>{displayName}</h2>
                                <p>@{user.username}</p>
                                <span>{userType} Account</span>
                            </div>
                        </div>
                        <div className={styles.profileActions}>
                            <Link href="/profile" className={styles.primaryAction}>Edit Profile</Link>
                            <Link href="/posts/my" className={styles.secondaryAction}>My Posts</Link>
                        </div>
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.cardHeader}>
                            <div>
                                <h2 className={styles.sectionTitle}>Appearance</h2>
                                <p>Adjust how Rollin Community looks on this device.</p>
                            </div>
                        </div>

                        <div className={styles.section}>
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

                        <div className={styles.section}>
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
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.cardHeader}>
                            <div>
                                <h2 className={styles.sectionTitle}>Notifications</h2>
                                <p>Choose which community updates should reach you.</p>
                            </div>
                        </div>
                        <div className={styles.optionList}>
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
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.cardHeader}>
                            <div>
                                <h2 className={styles.sectionTitle}>Security</h2>
                                <p>Keep your login and account access current.</p>
                            </div>
                        </div>
                        <div className={styles.actionList}>
                            <button type="button" className={styles.actionRow} onClick={() => setIsPasswordModalOpen(true)}>
                                <span>
                                    <strong>{isPasswordSetupMode ? 'Set Password' : 'Change Password'}</strong>
                                    <small>{isPasswordSetupMode ? 'Add a password for username or email login.' : 'Update your current password.'}</small>
                                </span>
                                <span aria-hidden="true">›</span>
                            </button>
                            <Link href="/profile" className={styles.actionRow}>
                                <span>
                                    <strong>Email and Profile Security</strong>
                                    <small>Manage email changes and account verification.</small>
                                </span>
                                <span aria-hidden="true">›</span>
                            </Link>
                        </div>
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.cardHeader}>
                            <div>
                                <h2 className={styles.sectionTitle}>Other</h2>
                                <p>Quick links for account, payments, and policies.</p>
                            </div>
                        </div>
                        <div className={styles.linkGrid}>
                            <Link href="/payments">Payments</Link>
                            <Link href="/support">Support Center</Link>
                            <Link href="/privacy">Privacy Policy</Link>
                            <Link href="/terms">Terms of Service</Link>
                        </div>
                    </section>
                </div>

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
