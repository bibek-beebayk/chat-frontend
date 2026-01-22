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

    if (!user) return null;

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <Link href="/" className={styles.logo}>
                    <span className="gradient-text">Deep Purple Casino</span>
                </Link>

                <nav className={styles.nav}>
                    <Link
                        href="/"
                        className={isActive('/') ? styles.active : ''}
                    >
                        Home
                    </Link>
                    <Link
                        href="/chat"
                        className={isActive('/chat') ? styles.active : ''}
                    >
                        Chat
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
                    <span className={styles.username}>
                        {user.username} ({user.user_type})
                    </span>
                    <button onClick={handleLogout} className={styles.logoutBtn}>
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
};
