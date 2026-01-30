'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import VerifyUserIDModal from '@/components/settings/VerifyUserIDModal';
import styles from './Header.module.css';

export const Header: React.FC = () => {
    const { user, logout, verifyUserID, initiateVerificationRequest } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const isActive = (path: string) => pathname === path;

    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
    const [showVerifyModal, setShowVerifyModal] = React.useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    if (!user) return null;

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <div className={styles.topRow}>
                    <Link href="/" className={styles.logo} onClick={closeMenu}>
                        <span className="gradient-text">Rollers Community</span>
                    </Link>
                    <button
                        className={styles.menuButton}
                        onClick={toggleMenu}
                        aria-label="Toggle menu"
                    >
                        <span className={`${styles.bar} ${isMenuOpen ? styles.open : ''}`}></span>
                        <span className={`${styles.bar} ${isMenuOpen ? styles.open : ''}`}></span>
                        <span className={`${styles.bar} ${isMenuOpen ? styles.open : ''}`}></span>
                    </button>
                </div>

                <div className={`${styles.menu} ${isMenuOpen ? styles.show : ''}`}>
                    <nav className={styles.nav}>
                        <Link
                            href="/"
                            className={isActive('/') ? styles.active : ''}
                            onClick={closeMenu}
                        >
                            Home
                        </Link>

                        <Link
                            href="/payments"
                            className={isActive('/payments') ? styles.active : ''}
                            onClick={closeMenu}
                        >
                            Payments
                        </Link>

                        {user.user_type === 'staff' && (
                            <Link
                                href="/staff-dashboard"
                                className={isActive('/staff-dashboard') ? styles.active : ''}
                                onClick={closeMenu}
                            >
                                Dashboard
                            </Link>
                        )}
                    </nav>

                    <div className={styles.userSection}>
                        {/* Mobile View: Expanded List */}
                        <div className={styles.mobileUserMenu}>
                            <div className={styles.mobileUserInfo}>
                                {user.username}
                                {(user.user_type === 'player' || user.user_type === 'agent') && (
                                    user.is_verified ? (
                                        <span style={{ color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }} title="Verified Account">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7l2 2 4-4" stroke="none" fill="currentColor" fillOpacity="0.2" />
                                            </svg>
                                            Verified
                                        </span>
                                    ) : user.verification_status === 'pending' ? (
                                        <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }} title="Verification Pending">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12 6 12 12 16 14"></polyline>
                                            </svg>
                                            Pending
                                        </span>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowVerifyModal(true);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                cursor: 'pointer',
                                                color: '#9ca3af',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.85rem'
                                            }}
                                            title="Click to verify your account"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                            </svg>
                                            Verify Now
                                        </button>
                                    )
                                )}
                            </div>
                            <Link href="/settings" className={styles.mobileMenuItem} onClick={closeMenu}>
                                Settings
                            </Link>
                            <button onClick={() => { closeMenu(); handleLogout(); }} className={styles.mobileMenuItem} style={{ color: '#ef4444' }}>
                                Logout
                            </button>
                        </div>

                        {/* Desktop View: Dropdown */}
                        <div className={styles.desktopUserMenu}>
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
                                    color: 'white',
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
                                    backgroundColor: '#1a1a1a',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    minWidth: '160px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                    zIndex: 100,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25rem'
                                }}>
                                    <Link
                                        href="/settings"
                                        onClick={() => setIsUserMenuOpen(false)}
                                        style={{
                                            color: 'white',
                                            textDecoration: 'none',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '4px',
                                            fontSize: '0.9rem',
                                            display: 'block',
                                            transition: 'background 0.2s',
                                            textAlign: 'left'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        Settings
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setIsUserMenuOpen(false);
                                            handleLogout();
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#ef4444',
                                            textAlign: 'left',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '4px',
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            width: '100%',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
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

            <VerifyUserIDModal
                isOpen={showVerifyModal}
                onClose={() => setShowVerifyModal(false)}
                onVerify={verifyUserID}
                onInitiate={initiateVerificationRequest}
            />
        </header>
    );
};
