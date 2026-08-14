'use client';

import { useAuth } from '@/contexts/AuthContext';
import styles from './WelcomeBanner.module.css';

export function WelcomeBanner() {
    const { user } = useAuth();
    if (!user) return null;

    return (
        <div className={styles.banner}>
            <h1>Welcome back, {user.first_name || user.username} <span aria-hidden="true">👋</span></h1>
        </div>
    );
}
