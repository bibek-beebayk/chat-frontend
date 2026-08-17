'use client';

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
    round: RocketRoundState | null;
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
    round,
    busy,
    onPlaceBet,
    onCashOut,
}: RocketControlsProps) {
    const roundActive = round !== null;
    const wagerAmount = Number(wagerInput);
    const isValidWager = Number.isFinite(wagerAmount) && wagerAmount > 0 && wagerAmount <= balance;
    const controlsDisabled = busy || roundActive;

    const liveMultiplier = round?.phase === 'running' ? Number(round.multiplier) : 1;
    const potentialReturn = wagerAmount > 0
        ? wagerAmount * (roundActive ? liveMultiplier : (autoCashoutEnabled ? Number(autoCashoutInput) || 1 : 1))
        : 0;

    const statusText = !round
        ? 'Ready to launch'
        : round.phase === 'countdown'
            ? 'Betting closed - launching soon'
            : round.phase === 'running'
                ? 'In flight - cash out any time'
                : round.phase === 'cashed_out'
                    ? 'Cashed out'
                    : 'Crashed';

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

            <div className={styles.returnRow}>
                <span>Potential Return</span>
                <strong>{potentialReturn.toLocaleString(undefined, { maximumFractionDigits: 2 })} RP</strong>
            </div>

            {round && round.phase === 'running' ? (
                <button type="button" className={styles.cashOutBtn} onClick={onCashOut} disabled={busy}>
                    Cash Out &middot; {potentialReturn.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </button>
            ) : round && round.phase === 'countdown' ? (
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
