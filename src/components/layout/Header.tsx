'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Header.module.css';

export const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const isActive = (path: string) => pathname === path;

    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    if (!user) return null;

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <div className={styles.topRow}>
                    <Link href="/" className={styles.logo} onClick={closeMenu}>
                        <span className="gradient-text">Hi-Rollin Portal</span>
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

                        <Link
                            href="/feed"
                            className={isActive('/feed') ? styles.active : ''}
                            onClick={closeMenu}
                        >
                            Feed
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
                        <span className={styles.username}>
                            {user.username}
                            {(user.user_type === 'player' || user.user_type === 'agent') && (
                                user.is_verified ? (
                                    <span
                                        style={{
                                            marginLeft: '6px',
                                            color: '#3b82f6',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            verticalAlign: 'middle'
                                        }}
                                        title="Verified Account"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7l2 2 4-4" stroke="none" fill="currentColor" fillOpacity="0.2" />
                                        </svg>
                                    </span>
                                ) : (
                                    <span
                                        style={{
                                            marginLeft: '6px',
                                            color: '#9ca3af',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            verticalAlign: 'middle'
                                        }}
                                        title="Unverified Account"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="8" x2="12" y2="12"></line>
                                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                        </svg>
                                    </span>
                                )
                            )}
                        </span>
                        <button onClick={handleLogout} className={styles.logoutBtn}>
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};
