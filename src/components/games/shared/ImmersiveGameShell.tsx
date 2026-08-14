'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePointsBalance } from '@/hooks/usePointsBalance';
import styles from './ImmersiveGameShell.module.css';

interface ImmersiveGameShellProps {
    gameName: string;
    onInfoClick: () => void;
    children: React.ReactNode;
}

/**
 * Wrap the actual gameplay UI of any game page (Plinko, Slots, and any
 * future game) in this. On mobile it hides the rest of the app's chrome
 * (top bar, bottom nav, support chat bubble, footer) via a body class that
 * each of those components' own CSS already knows to react to - see
 * `:global(body.game-immersive-mobile)` in TopNav.module.css,
 * MobileBottomNav.module.css, FloatingChat.module.css, and the plain
 * `footer` rule in globals.css. Desktop is unaffected; a new game page
 * only needs to wrap its content in this component and pass a
 * gameName/onInfoClick, nothing else to wire up per-game.
 *
 * The info button just calls onInfoClick - each game owns its own "how to
 * play" content (Slots already had a paytable modal; Plinko's is new) so
 * this component makes no assumption about what that modal looks like.
 *
 * The right side shows the player's live Reward Points balance (same
 * star+count styling as the site header's RP badge) - this is the one
 * balance display a game page needs on mobile, so each game's own in-page
 * balance readout should be hidden on mobile rather than duplicated.
 */
export function ImmersiveGameShell({ gameName, onInfoClick, children }: ImmersiveGameShellProps) {
    const balance = usePointsBalance();

    useEffect(() => {
        document.body.classList.add('game-immersive-mobile');
        return () => {
            document.body.classList.remove('game-immersive-mobile');
        };
    }, []);

    return (
        <div className={styles.shell}>
            <div className={styles.header}>
                <div className={styles.leftGroup}>
                    <Link href="/games" className={styles.backButton} aria-label="Back to Games">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18" />
                            <path d="M6 6l12 12" />
                        </svg>
                    </Link>
                    <button type="button" className={styles.infoButton} onClick={onInfoClick} aria-label={`How to play ${gameName}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4" />
                            <path d="M12 8h.01" />
                        </svg>
                    </button>
                </div>
                <h1 className={styles.gameName}>{gameName}</h1>
                <div className={styles.balancePill} aria-label="Reward points">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    <span>{balance.toLocaleString()}</span>
                </div>
            </div>
            {children}
        </div>
    );
}
