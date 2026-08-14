'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { pointsApi } from '@/lib/points';
import { PointsInfo } from '@/types';
import styles from './PointsInfoBadge.module.css';

interface PointsInfoBadgeProps {
    balance: number;
}

/**
 * The RP badge in the top bar links straight to /rewards as before. A
 * separate small "i" button beside it toggles a popup on click explaining
 * what Reward Points are, how they're earned, and the current redemption
 * minimum/conversion rate. All of that except the static blurb comes from
 * /api/points/info/ (backed by the admin-configurable
 * PointsRedemptionConfig) - never hardcoded, since staff can change the
 * rate/minimum at any time.
 */
export function PointsInfoBadge({ balance }: PointsInfoBadgeProps) {
    const [open, setOpen] = useState(false);
    const [info, setInfo] = useState<PointsInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    const loadInfo = () => {
        if (info || loading) return;
        setLoading(true);
        setError(null);
        pointsApi.getInfo()
            .then(setInfo)
            .catch((err) => setError(err?.message || 'Unable to load Reward Points info.'))
            .finally(() => setLoading(false));
    };

    const toggleOpen = () => {
        setOpen((prev) => {
            const next = !prev;
            if (next) loadInfo();
            return next;
        });
    };

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    return (
        <div className={styles.wrap} ref={wrapRef}>
            <Link href="/rewards" className={styles.badge} aria-label="Reward points">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <span>{balance.toLocaleString()}</span>
            </Link>

            <button
                type="button"
                className={styles.infoBtn}
                onClick={toggleOpen}
                aria-label="About Reward Points"
                aria-haspopup="true"
                aria-expanded={open}
            >
                i
            </button>

            {open && (
                <div className={styles.popover} role="region" aria-label="Reward Points details">
                    <h4>Reward Points</h4>
                    <p className={styles.blurb}>
                        Reward Points (RP) are what you wager and win when you play games like Plinko, and can be redeemed for Hi-Rollin credit.
                    </p>

                    {loading && !info ? (
                        <p className={styles.muted}>Loading...</p>
                    ) : error && !info ? (
                        <div>
                            <p className={styles.muted}>Unable to load details.</p>
                            <button type="button" className={styles.retryBtn} onClick={loadInfo}>Retry</button>
                        </div>
                    ) : info ? (
                        <>
                            <div className={styles.section}>
                                <h5>How to earn</h5>
                                <ul>
                                    {info.earn_actions.map((action) => (
                                        <li key={action.slug}>
                                            <span>{action.label}</span>
                                            <strong>+{action.points_value.toLocaleString()} RP</strong>
                                        </li>
                                    ))}
                                    <li>
                                        <span>Win game rounds</span>
                                        <strong>Varies</strong>
                                    </li>
                                </ul>
                            </div>
                            <div className={styles.section}>
                                <h5>Redeem</h5>
                                <ul>
                                    <li>
                                        <span>Minimum to redeem</span>
                                        <strong>{info.min_redemption_points.toLocaleString()} RP</strong>
                                    </li>
                                    <li>
                                        <span>Conversion rate</span>
                                        <strong>{formatRpPerDollar(info.rp_to_credit_rate)} RP = $1 credit</strong>
                                    </li>
                                </ul>
                            </div>
                        </>
                    ) : null}

                    <Link href="/rewards" className={styles.viewLink}>View Rewards</Link>
                </div>
            )}
        </div>
    );
}

function formatRpPerDollar(rate: string): string {
    const num = Number(rate);
    if (!num) return '—';
    return Math.round(1 / num).toLocaleString();
}
