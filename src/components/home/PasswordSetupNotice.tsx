'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './PasswordSetupNotice.module.css';

// Ported from the old shared homepage's inline notice (previously gated on
// user_type === 'player' there) - players who signed up via Google have no
// password, so they need a way to set one for username/email login too.
export function PasswordSetupNotice() {
    const { user } = useAuth();
    const router = useRouter();

    if (!user || user.has_usable_password !== false) return null;

    return (
        <section className={styles.notice}>
            <div className={styles.icon}>
                <LockIcon />
            </div>
            <div>
                <h2>Set up your password</h2>
                <p>You signed in with Google. Add a password so you can also log in with your username or email.</p>
            </div>
            <button type="button" onClick={() => router.push('/settings?setupPassword=1')}>
                Set password
            </button>
        </section>
    );
}

function LockIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}
