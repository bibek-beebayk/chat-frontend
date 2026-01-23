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
                        <span className="gradient-text">Hi-Rollon Portal</span>
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
                            href="/chat"
                            className={isActive('/chat') ? styles.active : ''}
                            onClick={closeMenu}
                        >
                            Chat
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
                        <span className={styles.username}>
                            {user.username} ({user.user_type})
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
