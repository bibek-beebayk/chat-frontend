'use client';

import Image from 'next/image';
import styles from './Celebrations.module.css';

interface WelcomeModalProps {
    onDismissed: () => void;
}

/**
 * First-login greeting shown once atop /onboarding (gated by the page's own
 * has_completed_social_onboarding check - no separate "seen" tracking
 * needed here). One static screen rather than the mockup's multi-slide
 * carousel - there's only one real "step" in onboarding today, so slides
 * 2-5 would have nothing real to say.
 */
export function WelcomeModal({ onDismissed }: WelcomeModalProps) {
    return (
        <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Welcome to Rollin Community">
            <div className={styles.card}>
                <Image src="/logo-3.png" alt="Rollin Community" width={140} height={97} priority />
                <p className={styles.subtitle}>Welcome to Rollin Community!</p>
                <p className={styles.body}>Play games, earn rewards, connect and be part of the Rollin family.</p>
                <button type="button" className={styles.primaryBtn} onClick={onDismissed}>
                    Let&apos;s Go!
                </button>
            </div>
        </div>
    );
}
