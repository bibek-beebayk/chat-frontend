'use client';

import { useEffect } from 'react';
import { formatPoints } from '@/lib/points';
import { PlinkoRound } from '@/types';
import styles from './PlinkoResultPopup.module.css';

export type PlinkoPopupState =
    | { kind: 'round'; round: PlinkoRound }
    | { kind: 'autoplay'; rounds: number; totalWager: number; totalPayout: number }
    | null;

const AUTO_DISMISS_MS = 1900;

type Magnitude = 'small' | 'medium' | 'big' | 'huge';

function winMagnitude(multiplier: number): Magnitude {
    if (multiplier < 2) return 'small';
    if (multiplier < 5) return 'medium';
    if (multiplier < 20) return 'big';
    return 'huge';
}

function winHeadline(magnitude: Magnitude): string {
    switch (magnitude) {
        case 'huge': return 'MASSIVE WIN!';
        case 'big': return 'Big Win!';
        case 'medium': return 'Nice Win!';
        default: return 'You Won!';
    }
}

function lossHeadline(multiplier: number): string {
    if (multiplier >= 0.7) return 'So Close!';
    if (multiplier >= 0.3) return 'Not This Time';
    return 'Tough Break';
}

/**
 * Shared win/loss popup for both a single manual round and an autoplay
 * session's cumulative result - the two have different inputs but resolve
 * to the same {isWin, headline, amount, detail, magnitude} shape so one
 * template renders both. Auto-dismisses (and can be closed early via the
 * backdrop, the × button, or another result replacing it outright) so it
 * never blocks the next drop.
 */
export function PlinkoResultPopup({ state, onClose }: { state: PlinkoPopupState; onClose: () => void }) {
    useEffect(() => {
        if (!state) return undefined;
        const timer = window.setTimeout(onClose, AUTO_DISMISS_MS);
        return () => window.clearTimeout(timer);
    }, [state, onClose]);

    if (!state) return null;

    let isWin: boolean;
    let headline: string;
    let amountLabel: string;
    let amount: number;
    let detail: string;
    let magnitude: Magnitude = 'small';

    if (state.kind === 'round') {
        const payout = Number(state.round.payout_amount);
        const net = payout - state.round.wager_amount;
        const multiplier = Number(state.round.multiplier);
        isWin = net >= 0;
        magnitude = winMagnitude(multiplier);
        headline = isWin ? winHeadline(magnitude) : lossHeadline(multiplier);
        amountLabel = isWin ? 'You won' : 'You lost';
        amount = Math.abs(net);
        detail = `x${multiplier.toFixed(2)} multiplier`;
    } else {
        const net = state.totalPayout - state.totalWager;
        isWin = net >= 0;
        magnitude = isWin && state.totalWager > 0 && net >= state.totalWager ? 'big' : 'medium';
        headline = isWin ? "Autoplay Complete – You're Up!" : 'Autoplay Complete';
        amountLabel = isWin ? 'Net won' : 'Net lost';
        amount = Math.abs(net);
        detail = `${state.rounds} round${state.rounds === 1 ? '' : 's'} played · ${formatPoints(state.totalWager)} wagered`;
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={`${styles.card} ${isWin ? styles.win : styles.loss} ${isWin ? styles[`magnitude-${magnitude}`] : ''}`}
                onClick={(event) => event.stopPropagation()}
                role="alertdialog"
                aria-live="polite"
            >
                <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">&times;</button>

                {isWin && (
                    <div className={styles.confetti} aria-hidden="true">
                        {Array.from({ length: 18 }).map((_, i) => (
                            <span key={i} className={styles.confettiPiece} style={{ '--i': i } as React.CSSProperties} />
                        ))}
                    </div>
                )}

                <div className={styles.icon}>{isWin ? <TrophyIcon /> : <RainCloudIcon />}</div>
                <h2 className={styles.headline}>{headline}</h2>
                <div className={styles.amountRow}>
                    <span>{amountLabel}</span>
                    <strong>{isWin ? '+' : '−'}{formatPoints(amount)} pts</strong>
                </div>
                <p className={styles.detail}>{detail}</p>
            </div>
        </div>
    );
}

function TrophyIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
            <path d="M8 5H5a1 1 0 0 0-1 1v1a3 3 0 0 0 3 3" />
            <path d="M16 5h3a1 1 0 0 1 1 1v1a3 3 0 0 1-3 3" />
            <path d="M12 12v4" />
            <path d="M9 20h6" />
            <path d="M10 16h4l1 4H9l1-4Z" />
        </svg>
    );
}

function RainCloudIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M7 16a4 4 0 0 1-.7-7.94 5 5 0 0 1 9.63-1.62A4.5 4.5 0 0 1 17.5 15H7Z" />
            <path d="M9 19v1" />
            <path d="M12 19v2" />
            <path d="M15 19v1" />
        </svg>
    );
}
