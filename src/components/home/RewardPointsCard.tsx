'use client';

import Link from 'next/link';
import { usePointsBalance } from '@/hooks/usePointsBalance';
import { formatPoints } from '@/lib/points';
import styles from './RewardPointsCard.module.css';

/**
 * Desktop stat tile for the player's Reward Points balance - the third tile
 * alongside rank and streak. Balance only; the Rewards Center card below
 * owns the actual reward actions list.
 */
export function RewardPointsCard() {
    const balance = usePointsBalance();

    return (
        <div className={styles.card}>
            <div className={styles.headerRow}>
                <span className={styles.iconChip} aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                </span>
                <div>
                    <p className={styles.label}>Reward Points</p>
                    <p className={styles.value}>{formatPoints(balance)} RP</p>
                </div>
            </div>
            <Link href="/rewards" className={styles.redeemLink}>Redeem points &rarr;</Link>
        </div>
    );
}
