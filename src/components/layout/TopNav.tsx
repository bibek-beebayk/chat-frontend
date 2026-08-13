import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { usePointsBalance } from '@/hooks/usePointsBalance';
import { resolveProfileImageUrl } from '@/lib/social';
import styles from './TopNav.module.css';

export function TopNav({ onMenuClick }: { onMenuClick: () => void }) {
    const { user } = useAuth();
    const { unreadCount, requestPermission } = useNotification();
    const pointsBalance = usePointsBalance();
    const profileImage = resolveProfileImageUrl(user);
    const userInitial = user?.username?.trim()?.[0]?.toUpperCase() || 'U';
    const userRole = user?.user_type ? user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1) : 'Account';

    return (
        <header className={styles.topNav}>
            <div className={styles.leftSection}>
                <button className={styles.hamburgerBtn} onClick={onMenuClick}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <div className={styles.mobileLogo}>
                    <img src="/logo-2.png" alt="Rollin Community" className={styles.logoImage} />
                </div>
            </div>

            <div className={styles.rightSection}>
                <Link href="/download" className={styles.downloadLink}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>Download</span>
                </Link>
                {/* <button className={styles.iconBtn}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button> */}
                <button className={styles.iconBtn} onClick={requestPermission} aria-label="Notifications">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    {unreadCount > 0 && (
                        <span className={styles.notificationBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                </button>

                {user?.user_type === 'player' && (
                    <Link href="/rewards" className={styles.pointsBadge} aria-label="Reward points">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        <span>{pointsBalance.toLocaleString()}</span>
                    </Link>
                )}

                {user && (
                    <Link href="/profile" className={styles.profileSection}>
                        {profileImage ? (
                            <img src={profileImage} alt={`${user.username} profile`} className={styles.avatar} />
                        ) : (
                            <span className={`${styles.avatar} ${styles.avatarFallback}`}>{userInitial}</span>
                        )}
                        <div className={styles.profileInfo}>
                            <span className={styles.username}>{user.username}</span>
                            <span className={styles.level}>{userRole}</span>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.chevron}><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </Link>
                )}
            </div>
        </header>
    );
}
