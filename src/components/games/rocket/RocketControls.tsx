'use client';

import { useEffect, useRef, useState } from 'react';
import { RocketConfig, RocketRoundState } from '@/types';
import styles from './RocketControls.module.css';

interface RocketControlsProps {
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

export function RocketControls({
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
}: RocketControlsProps) {
    const roundActive = currentRound !== null;
    const wagerAmount = Number(wagerInput);
    const isValidWager = Number.isFinite(wagerAmount) && wagerAmount > 0 && wagerAmount <= balance;
    const controlsDisabled = busy || roundActive;
    const isRunning = visualPhase === 'running';

    // Immediate pressed feedback the instant the player taps Cash Out,
    // independent of how long the actual server round-trip takes -
    // "the visual response must be immediate even if the authoritative
    // response takes a moment", without claiming a win before it's real.
    const [justPressed, setJustPressed] = useState(false);
    const pressedTimerRef = useRef<number | null>(null);
    useEffect(() => () => {
        if (pressedTimerRef.current !== null) window.clearTimeout(pressedTimerRef.current);
    }, []);

    const potentialReturn = wagerAmount > 0
        ? wagerAmount * (isRunning ? liveMultiplier : (autoCashoutEnabled ? Number(autoCashoutInput) || 1 : 1))
        : 0;

    const statusText = !currentRound
        ? 'Ready to launch'
        : visualPhase === 'countdown'
            ? 'Betting closed - launching soon'
            : 'In flight - cash out any time';

    const handleCashOutClick = () => {
        if (busy) return;
        setJustPressed(true);
        if (pressedTimerRef.current !== null) window.clearTimeout(pressedTimerRef.current);
        pressedTimerRef.current = window.setTimeout(() => setJustPressed(false), 900);
        onCashOut();
    };

    const glowTier = liveMultiplier >= 10 ? 3 : liveMultiplier >= 5 ? 2 : liveMultiplier >= 2 ? 1 : 0;

    return (
        <div className={styles.controls}>
            <div className={styles.field}>
                <div className={styles.fieldHeader}>
                    <span>Play Amount</span>
                    <span className={styles.statusTag}>{statusText}</span>
                </div>
                <input
                    type="number"
                    inputMode="decimal"
                    min={config.min_wager}
                    max={config.max_wager}
                    step="1"
                    className={styles.amountInput}
                    value={wagerInput}
                    onChange={(e) => onWagerChange(e.target.value)}
                    disabled={controlsDisabled}
                />
                <div className={styles.quickRow}>
                    {config.wager_quick_amounts.map((amount) => (
                        <button
                            key={amount}
                            type="button"
                            className={`${styles.quickBtn} ${Number(wagerInput) === amount ? styles.quickBtnActive : ''}`}
                            onClick={() => onWagerChange(String(amount))}
                            disabled={controlsDisabled}
                        >
                            {amount}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.field}>
                <label className={styles.autoCashoutHeader}>
                    <span>Auto Cash Out</span>
                    <input
                        type="checkbox"
                        checked={autoCashoutEnabled}
                        onChange={(e) => onAutoCashoutEnabledChange(e.target.checked)}
                        disabled={controlsDisabled}
                    />
                </label>
                {autoCashoutEnabled && (
                    <>
                        <input
                            type="number"
                            inputMode="decimal"
                            min={config.min_auto_cashout_multiplier}
                            max={config.max_auto_cashout_multiplier}
                            step="0.1"
                            className={styles.amountInput}
                            value={autoCashoutInput}
                            onChange={(e) => onAutoCashoutChange(e.target.value)}
                            disabled={controlsDisabled}
                        />
                        <div className={styles.quickRow}>
                            {config.auto_cashout_quick_options.map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={`${styles.quickBtn} ${autoCashoutInput === value ? styles.quickBtnActive : ''}`}
                                    onClick={() => onAutoCashoutChange(value)}
                                    disabled={controlsDisabled}
                                >
                                    {value}x
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {!isRunning && (
                <div className={styles.returnRow}>
                    <span>Potential Return</span>
                    <strong>{potentialReturn.toLocaleString(undefined, { maximumFractionDigits: 2 })} RP</strong>
                </div>
            )}

            {isRunning ? (
                <button
                    type="button"
                    className={`${styles.cashOutBtn} ${justPressed ? styles.cashOutBtnPressed : ''}`}
                    data-glow-tier={glowTier}
                    onClick={handleCashOutClick}
                    disabled={busy}
                >
                    {busy ? (
                        <span className={styles.cashOutSpinner} aria-hidden="true" />
                    ) : (
                        <>
                            <span className={styles.cashOutLabel}>CASH OUT</span>
                            <span className={styles.cashOutAmount}>{potentialReturn.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </>
                    )}
                </button>
            ) : visualPhase === 'countdown' ? (
                <button type="button" className={styles.playBtn} disabled>
                    Launching...
                </button>
            ) : (
                <button type="button" className={styles.playBtn} onClick={onPlaceBet} disabled={busy || !isValidWager}>
                    {!isValidWager ? 'Enter a Valid Amount' : 'Place Play'}
                </button>
            )}
        </div>
    );
}
