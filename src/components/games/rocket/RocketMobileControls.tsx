'use client';

import { RocketConfig, RocketRoundState } from '@/types';
import styles from './RocketMobileControls.module.css';

const BET_OPTIONS = [5, 10, 20];

interface RocketMobileControlsProps {
    config: RocketConfig;
    wagerInput: string;
    onWagerChange: (value: string) => void;
    autoCashoutEnabled: boolean;
    onAutoCashoutEnabledChange: (value: boolean) => void;
    autoCashoutInput: string;
    onAutoCashoutChange: (value: string) => void;
    balance: number;
    currentRound: RocketRoundState | null;
    visualPhase: 'countdown' | 'running' | null;
    liveMultiplier: number;
    busy: boolean;
    onPlaceBet: () => void;
    onCashOut: () => void;
}

/**
 * Compact, mobile-only overlay control bar meant to sit directly on top of
 * the full-screen RocketDisplay stage - three small button toggles (bet
 * amount, auto cash out) plus the one large Play/Cash Out action, instead
 * of the full form-style panel RocketControls renders on tablet/desktop
 * (that component stays as-is there; this one is CSS-hidden above the
 * mobile breakpoint - see the .hideOnMobile / .mobileOnly split between
 * this file's module.css and RocketControls.module.css).
 */
export function RocketMobileControls({
    config,
    wagerInput,
    onWagerChange,
    autoCashoutEnabled,
    onAutoCashoutEnabledChange,
    autoCashoutInput,
    onAutoCashoutChange,
    balance,
    currentRound,
    visualPhase,
    liveMultiplier,
    busy,
    onPlaceBet,
    onCashOut,
}: RocketMobileControlsProps) {
    const roundActive = currentRound !== null;
    const wagerAmount = Number(wagerInput);
    const isValidWager = Number.isFinite(wagerAmount) && wagerAmount > 0 && wagerAmount <= balance;
    const controlsDisabled = busy || roundActive;
    const isRunning = visualPhase === 'running';

    const autoOptions = config.auto_cashout_quick_options;
    const autoIndex = autoOptions.indexOf(autoCashoutInput);

    const cycleBet = () => {
        if (controlsDisabled) return;
        const currentIndex = BET_OPTIONS.indexOf(wagerAmount);
        const next = BET_OPTIONS[(currentIndex + 1) % BET_OPTIONS.length] ?? BET_OPTIONS[0];
        onWagerChange(String(next));
    };

    const cycleAutoCashout = () => {
        if (controlsDisabled) return;
        if (!autoCashoutEnabled) {
            onAutoCashoutEnabledChange(true);
            onAutoCashoutChange(autoOptions[0]);
            return;
        }
        const next = autoIndex + 1;
        if (next >= autoOptions.length) {
            onAutoCashoutEnabledChange(false);
        } else {
            onAutoCashoutChange(autoOptions[next]);
        }
    };

    const potentialReturn = wagerAmount > 0
        ? wagerAmount * (isRunning ? liveMultiplier : (autoCashoutEnabled ? Number(autoCashoutInput) || 1 : 1))
        : 0;

    return (
        <div className={styles.bar}>
            <div className={styles.toggleRow}>
                <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={cycleBet}
                    disabled={controlsDisabled}
                    aria-label="Change play amount"
                >
                    <span className={styles.toggleLabel}>Bet</span>
                    <span className={styles.toggleValue}>{wagerAmount}</span>
                </button>

                <button
                    type="button"
                    className={`${styles.toggleBtn} ${autoCashoutEnabled ? styles.toggleBtnActive : ''}`}
                    onClick={cycleAutoCashout}
                    disabled={controlsDisabled}
                    aria-pressed={autoCashoutEnabled}
                    aria-label="Cycle auto cash out target"
                >
                    <span className={styles.toggleLabel}>Auto</span>
                    <span className={styles.toggleValue}>{autoCashoutEnabled ? `${autoCashoutInput}x` : 'Off'}</span>
                </button>
            </div>

            {isRunning ? (
                <button type="button" className={`${styles.actionBtn} ${styles.actionBtnCashOut}`} onClick={onCashOut} disabled={busy}>
                    <span className={styles.actionLabel}>Cash Out</span>
                    <span className={styles.actionAmount}>{potentialReturn.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </button>
            ) : visualPhase === 'countdown' ? (
                <button type="button" className={styles.actionBtn} disabled>
                    Launching...
                </button>
            ) : (
                <button type="button" className={styles.actionBtn} onClick={onPlaceBet} disabled={busy || !isValidWager}>
                    {!isValidWager ? 'Not Enough RP' : 'Play'}
                </button>
            )}
        </div>
    );
}
