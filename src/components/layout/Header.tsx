'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { usePendingConnectionsCount } from '@/hooks/usePendingConnectionsCount';
import { resolveProfileImageUrl } from '@/lib/social';
import VerifyUserIDModal from '@/components/settings/VerifyUserIDModal';
import styles from './Header.module.css';

export const Header: React.FC = () => {
    const { user, logout, verifyUserID, initiateVerificationRequest } = useAuth();
    const { requestPermission, unreadCount, permission } = useNotification();
    const pendingConnections = usePendingConnectionsCount();
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const isActive = (path: string) => pathname === path || pathname?.startsWith(`${path}/`);
    const chatHref = user?.user_type === 'staff' ? '/chat' : '/chats';
    const isChatActive = isActive('/chat') || isActive('/chats');

    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);
    const [showVerifyModal, setShowVerifyModal] = React.useState(false);

    React.useEffect(() => {
        setIsMobileDrawerOpen(false);
    }, [pathname]);

    if (!user) return null;
    const profileImage = resolveProfileImageUrl(user);
    const userInitial = user.username?.trim()?.[0]?.toUpperCase() || 'U';

    return (
        <header className={styles.header} data-app-header="true">
            <div className={styles.container}>
                <div className={styles.topRow}>
                    <Link href="/" className={styles.logo}>
                        <span className="gradient-text">Rollin Community</span>
                    </Link>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* Mobile Notification Bell */}
                        <button
                            onClick={requestPermission}
                            className={styles.mobileNotificationBtn} // New class for mobile styling
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-primary)',
                                position: 'relative',
                                alignItems: 'center',
                                padding: '8px'
                            }}
                            aria-label="Notifications"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                            </svg>
                            {unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    background: 'var(--color-error)',
                                    color: 'white',
                                    fontSize: '0.65rem',
                                    borderRadius: '50%',
                                    width: '16px',
                                    height: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid var(--color-bg-primary)'
                                }}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        <button
                            className={styles.mobileProfileButton}
                            onClick={() => setIsMobileDrawerOpen(true)}
                            aria-label="Open profile menu"
                        >
                            {profileImage ? (
                                <img src={profileImage} alt={`${user.username} profile`} className={styles.mobileProfileImage} />
                            ) : (
                                <span className={styles.mobileProfileInitial}>{userInitial}</span>
                            )}
                        </button>
                    </div>
                </div>

                <div className={styles.menu}>
                    <nav className={styles.nav}>
                        <Link
                            href="/"
                            className={isActive('/') ? styles.active : ''}
                        >
                            Home
                        </Link>

                        <Link
                            href={chatHref}
                            className={isChatActive ? styles.active : ''}
                        >
                            Chat
                        </Link>

                        <Link
                            href="/posts"
                            className={isActive('/posts') ? styles.active : ''}
                        >
                            Posts
                        </Link>

                        <Link
                            href="/connections"
                            className={`${isActive('/connections') ? styles.active : ''} ${styles.navWithBadge}`}
                        >
                            Connections
                            {pendingConnections > 0 && (
                                <span className={styles.navBadge}>
                                    {pendingConnections > 99 ? '99+' : pendingConnections}
                                </span>
                            )}
                        </Link>

                        <Link
                            href="/payments"
                            className={isActive('/payments') ? styles.active : ''}
                        >
                            Payments
                        </Link>

                        {user.user_type === 'staff' && (
                            <Link
                                href="/staff-dashboard"
                                className={isActive('/staff-dashboard') ? styles.active : ''}
                            >
                                Dashboard
                            </Link>
                        )}
                    </nav>

                    <div className={styles.userSection}>
                        {/* Desktop View: Dropdown */}
                        <div className={styles.desktopUserMenu}>
                            {/* Notification Bell */}
                            <button
                                onClick={requestPermission}
                                title={permission === 'granted' ? 'Notifications Enabled' : 'Enable Notifications'}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-text-primary)',
                                    marginRight: '1rem',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                                </svg>
                                {unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        background: 'var(--color-error)',
                                        color: 'white',
                                        fontSize: '0.7rem',
                                        borderRadius: '50%',
                                        width: '16px',
                                        height: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className={styles.username}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    color: 'var(--color-text-primary)',
                                    fontSize: '1rem',
                                    padding: 0
                                }}
                            >
                                {user.username}
                                {(user.user_type === 'player' || user.user_type === 'agent') && (
                                    user.is_verified ? (
                                        <span
                                            style={{
                                                marginLeft: '6px',
                                                color: '#3b82f6',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                verticalAlign: 'middle',
                                                gap: '4px',
                                                fontSize: '0.85rem',
                                                fontWeight: 500
                                            }}
                                            title="Verified Account"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7l2 2 4-4" stroke="none" fill="currentColor" fillOpacity="0.2" />
                                            </svg>
                                            Verified
                                        </span>
                                    ) : user.verification_status === 'pending' ? (
                                        <span
                                            style={{
                                                marginLeft: '6px',
                                                color: '#fbbf24',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                verticalAlign: 'middle',
                                                gap: '4px',
                                                fontSize: '0.85rem',
                                                fontWeight: 500
                                            }}
                                            title="Verification Pending"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12 6 12 12 16 14"></polyline>
                                            </svg>
                                            Pending
                                        </span>
                                    ) : (
                                        <span
                                            role="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowVerifyModal(true);
                                            }}
                                            style={{
                                                marginLeft: '6px',
                                                cursor: 'pointer',
                                                color: '#9ca3af',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                verticalAlign: 'middle',
                                                gap: '4px',
                                                fontSize: '0.85rem',
                                                fontWeight: 500
                                            }}
                                            title="Click to verify your account"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                            </svg>
                                            Verify Now
                                        </span>
                                    )
                                )}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px', opacity: 0.7 }}>
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>

                            {isUserMenuOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '0.5rem',
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    minWidth: '160px',
                                    boxShadow: 'var(--shadow-md)',
                                    zIndex: 100,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25rem'
                                }}>
                                    <Link
                                        href="/profile"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        style={{
                                            color: 'var(--color-text-primary)',
                                            textDecoration: 'none',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '4px',
                                            fontSize: '0.9rem',
                                            display: 'block',
                                            transition: 'background 0.2s',
                                            textAlign: 'left'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        Profile
                                    </Link>
                                    <Link
                                        href="/settings"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        style={{
                                            color: 'var(--color-text-primary)',
                                            textDecoration: 'none',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '4px',
                                            fontSize: '0.9rem',
                                            display: 'block',
                                            transition: 'background 0.2s',
                                            textAlign: 'left'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        Appearance
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setIsUserMenuOpen(false);
                                            handleLogout();
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--color-error)',
                                            textAlign: 'left',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '4px',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            width: '100%',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.14)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={`${styles.mobileDrawerBackdrop} ${isMobileDrawerOpen ? styles.open : ''}`}
                onClick={() => setIsMobileDrawerOpen(false)}
            />
            <aside className={`${styles.mobileDrawer} ${isMobileDrawerOpen ? styles.open : ''}`}>
                <div className={styles.mobileDrawerHeader}>
                    <div className={styles.mobileDrawerIdentity}>
                        {profileImage ? (
                            <img src={profileImage} alt={`${user.username} profile`} className={styles.mobileDrawerProfileImage} />
                        ) : (
                            <span className={styles.mobileDrawerInitial}>{userInitial}</span>
                        )}
                        <div className={styles.mobileDrawerTexts}>
                            <span className={styles.mobileDrawerName}>{user.username}</span>
                            <span className={styles.mobileDrawerSubtext}>Account</span>
                        </div>
                    </div>
                    <button className={styles.mobileDrawerClose} onClick={() => setIsMobileDrawerOpen(false)} aria-label="Close menu">
                        x
                    </button>
                </div>

                <div className={styles.mobileDrawerLinks}>
                    <Link href="/profile" className={styles.mobileDrawerLink} onClick={() => setIsMobileDrawerOpen(false)}>
                        Profile
                    </Link>
                    <Link href="/settings" className={styles.mobileDrawerLink} onClick={() => setIsMobileDrawerOpen(false)}>
                        Appearance
                    </Link>
                    <Link href="/posts/my" className={styles.mobileDrawerLink} onClick={() => setIsMobileDrawerOpen(false)}>
                        My Posts
                    </Link>
                    <button
                        className={`${styles.mobileDrawerLink} ${styles.mobileDrawerLogout}`}
                        onClick={() => {
                            setIsMobileDrawerOpen(false);
                            handleLogout();
                        }}
                    >
                        Logout
                    </button>
                </div>
            </aside>

            <VerifyUserIDModal
                isOpen={showVerifyModal}
                onClose={() => setShowVerifyModal(false)}
                onVerify={verifyUserID}
                onInitiate={initiateVerificationRequest}
            />
        </header>
    );
};
