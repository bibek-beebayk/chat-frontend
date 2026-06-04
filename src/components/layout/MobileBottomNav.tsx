'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { usePendingConnectionsCount } from '@/hooks/usePendingConnectionsCount';
import styles from './MobileBottomNav.module.css';

type NavItem = {
    href: string;
    matchPaths?: string[];
    label: string;
    icon: React.ReactNode;
    badge?: number;
};

const hiddenPrefixes = ['/login', '/register', '/verify-otp', '/set-password', '/test-email', '/onboarding', '/post-login'];

export const MobileBottomNav: React.FC = () => {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const { unreadCount } = useNotification();
    const pendingConnections = usePendingConnectionsCount();

    const shouldHide = !user
        || loading
        || hiddenPrefixes.some((prefix) => pathname?.startsWith(prefix));

    useEffect(() => {
        if (typeof document === 'undefined') return;
        if (shouldHide) {
            document.body.classList.remove('has-mobile-bottom-nav');
            return;
        }
        document.body.classList.add('has-mobile-bottom-nav');
        return () => {
            document.body.classList.remove('has-mobile-bottom-nav');
        };
    }, [shouldHide]);

    const navItems = useMemo<NavItem[]>(() => {
        if (!user) return [];

        if (user.user_type === 'staff') {
            return [
                {
                    href: '/',
                    label: 'Home',
                    icon: <HomeIcon />,
                },
                {
                    href: '/chat',
                    matchPaths: ['/chat'],
                    label: 'Chats',
                    icon: <ChatIcon />,
                    badge: unreadCount,
                },
                {
                    href: '/staff-dashboard',
                    label: 'Dashboard',
                    icon: <DashboardIcon />,
                },
            ];
        }

        return [
            {
                href: '/',
                label: 'Home',
                icon: <HomeIcon />,
            },
            {
                href: '/chats',
                matchPaths: ['/chats', '/chat'],
                label: 'Chats',
                icon: <ChatIcon />,
                badge: unreadCount,
            },
            {
                href: '/posts',
                label: 'Posts',
                icon: <PostsIcon />,
            },
            {
                href: '/connections',
                label: 'Connections',
                icon: <ConnectionsIcon />,
                badge: pendingConnections,
            },
        ];
    }, [pendingConnections, unreadCount, user]);

    if (shouldHide) return null;

    return (
        <nav
            className={styles.nav}
            aria-label="Mobile bottom navigation"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, navItems.length)}, minmax(0, 1fr))` }}
        >
            {navItems.map((item) => {
                const activeCandidates = item.matchPaths && item.matchPaths.length > 0
                    ? item.matchPaths
                    : [item.href.split('?')[0]];
                const active = activeCandidates.some((path) => (
                    path === '/'
                        ? pathname === '/'
                        : pathname === path || pathname?.startsWith(`${path}/`)
                ));
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.item} ${active ? styles.active : ''}`}
                    >
                        <span className={styles.iconWrap}>
                            {item.icon}
                            {(item.badge || 0) > 0 && (
                                <span className={styles.badge}>{item.badge! > 99 ? '99+' : item.badge}</span>
                            )}
                        </span>
                        <span className={styles.label}>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
};

function HomeIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
        </svg>
    );
}

function ChatIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
    );
}

function PostsIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
            <line x1="7" y1="9" x2="17" y2="9" />
            <line x1="7" y1="13" x2="15" y2="13" />
            <line x1="7" y1="17" x2="13" y2="17" />
        </svg>
    );
}

function ConnectionsIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <path d="M20 8v6" />
            <path d="M23 11h-6" />
        </svg>
    );
}

function DashboardIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
        </svg>
    );
}
