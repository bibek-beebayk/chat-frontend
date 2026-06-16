import React from 'react';
import Link from 'next/link';
import styles from './TopNav.module.css';

export function TopNav({ onMenuClick }: { onMenuClick: () => void }) {
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
                <button className={styles.iconBtn}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
                <button className={styles.iconBtn}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    <span className={styles.notificationBadge}>3</span>
                </button>
                
                <Link href="/profile" className={styles.profileSection}>
                    <img src="https://i.pravatar.cc/150?u=beebayk" alt="Avatar" className={styles.avatar} />
                    <div className={styles.profileInfo}>
                        <span className={styles.username}>beebayk</span>
                        <span className={styles.level}>Level 12</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.chevron}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </Link>
            </div>
        </header>
    );
}
