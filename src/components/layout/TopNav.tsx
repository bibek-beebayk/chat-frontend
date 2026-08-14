import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { usePointsBalance } from '@/hooks/usePointsBalance';
import { resolveProfileImageUrl } from '@/lib/social';
import { PointsInfoBadge } from './PointsInfoBadge';
import styles from './TopNav.module.css';

export function TopNav({ onMenuClick }: { onMenuClick: () => void }) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const { unreadCount, requestPermission } = useNotification();
    const pointsBalance = usePointsBalance();
    const isPlayer = user?.user_type === 'player';
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const profileImage = resolveProfileImageUrl(user);
    const userInitial = user?.username?.trim()?.[0]?.toUpperCase() || 'U';
    const userRole = user?.user_type ? user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1) : 'Account';

    useEffect(() => {
        if (!profileMenuOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [profileMenuOpen]);

    const handleLogout = async () => {
        setProfileMenuOpen(false);
        await logout();
        router.push('/login');
    };

    return (
        <header className={styles.topNav}>
            <div className={styles.leftSection}>
                <button className={styles.hamburgerBtn} onClick={onMenuClick}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
            </div>

            <div className={styles.rightSection}>
                <button className={styles.iconBtn} onClick={requestPermission} aria-label="Notifications">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    {unreadCount > 0 && (
                        <span className={styles.notificationBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                </button>

                {isPlayer && <PointsInfoBadge balance={pointsBalance} />}

                {user && (
                    <div className={styles.profileMenuWrap} ref={profileMenuRef}>
                        <button
                            type="button"
                            className={styles.profileSection}
                            onClick={() => setProfileMenuOpen((open) => !open)}
                            aria-haspopup="menu"
                            aria-expanded={profileMenuOpen}
                        >
                            {profileImage ? (
                                <img src={profileImage} alt={`${user.username} profile`} className={styles.avatar} />
                            ) : (
                                <span className={`${styles.avatar} ${styles.avatarFallback}`}>{userInitial}</span>
                            )}
                            <div className={styles.profileInfo}>
                                <span className={styles.username}>{user.username}</span>
                                <span className={styles.level}>{userRole}</span>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`${styles.chevron} ${profileMenuOpen ? styles.chevronOpen : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>

                        {profileMenuOpen && (
                            <div className={styles.profileMenu} role="menu">
                                <div className={styles.profileMenuHeader}>
                                    <span className={styles.profileMenuName}>{user.username}</span>
                                    <span className={styles.profileMenuRole}>{userRole}</span>
                                </div>
                                <Link href="/profile" className={styles.profileMenuItem} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                    View Profile
                                </Link>
                                <Link href="/settings" className={styles.profileMenuItem} role="menuitem" onClick={() => setProfileMenuOpen(false)}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                    Settings
                                </Link>
                                <button type="button" className={`${styles.profileMenuItem} ${styles.profileMenuLogout}`} role="menuitem" onClick={handleLogout}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
