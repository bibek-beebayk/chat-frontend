'use client';

import { HiLoConfig, HiLoDirection, HiLoRoundState } from '@/types';
import { HiLoPhase } from './HiLoTable';
import { formatPercent, isDirectionAvailable, projectedMultiplier, stepMultiplier, winProbability } from './odds';
import styles from './HiLoControls.module.css';

interface HiLoControlsProps {
    config: HiLoConfig;
    wagerInput: string;
    onWagerChange: (value: string) => void;
    balance: number;
    round: HiLoRoundState | null;
    phase: HiLoPhase;
    busy: boolean;
    onDeal: () => void;
    onPredict: (direction: HiLoDirection) => void;
    onCashOut: () => void;
    /** Compact bottom-docked variant used on mobile, over the stage. */
    variant?: 'panel' | 'mobile';
}

/**
 * Bet controls before a round, prediction controls during one. Every button's
 * disabled state is derived from `phase` rather than ad-hoc booleans - during
 * REVEALING everything is locked, which together with the step_index echo in
 * HiLoGame is what makes a double-tap unable to draw a second card.
 */
export function HiLoControls({
    config,
    wagerInput,
    onWagerChange,
    balance,
    round,
    phase,
    busy,
    onDeal,
    onPredict,
    onCashOut,
    variant = 'panel',
}: HiLoControlsProps) {
    const roundActive = round !== null && round.status === 'active';
    const canPredict = roundActive && phase === 'awaiting_prediction' && !busy;
    const wagerAmount = Number(wagerInput);
    const wagerValid = Number.isFinite(wagerAmount)
        && wagerAmount >= Number(config.min_wager)
        && wagerAmount <= Number(config.max_wager)
        && wagerAmount <= balance;

    const rank = round?.current_card.rank ?? null;
    const multiplier = round ? Number(round.multiplier) : 1;

    const renderPredictButton = (direction: HiLoDirection) => {
        const available = rank !== null && isDirectionAvailable(rank, direction);
        const step = rank !== null ? stepMultiplier(rank, direction, config) : null;
        const projected = rank !== null ? projectedMultiplier(multiplier, rank, direction, config) : null;
        const probability = rank !== null ? winProbability(rank, direction) : 0;

        return (
            <button
                type="button"
                className={`${styles.predictButton} ${direction === 'higher' ? styles.higher : styles.lower}`}
                onClick={() => onPredict(direction)}
                disabled={!canPredict || !available}
                aria-label={
                    available
                        ? `${direction}, ${formatPercent(probability)} chance, pays ${step?.toFixed(2)}x`
                        : `${direction} is not possible from this card`
                }
            >
                <span className={styles.predictArrow}>{direction === 'higher' ? '▲' : '▼'}</span>
                <span className={styles.predictLabel}>{direction === 'higher' ? 'Higher' : 'Lower'}</span>
                {available ? (
                    <span className={styles.predictOdds}>
                        <em>{formatPercent(probability)}</em>
                        <i>{projected !== null ? `${projected.toFixed(2)}x` : ''}</i>
                    </span>
                ) : (
                    <span className={styles.predictOdds}><em>Not possible</em></span>
                )}
            </button>
        );
    };

    return (
        <div className={`${styles.wrap} ${variant === 'mobile' ? styles.mobile : ''}`}>
            {roundActive ? (
                <>
                    <div className={styles.predictRow}>
                        {renderPredictButton('lower')}
                        {renderPredictButton('higher')}
                    </div>
                    <p className={styles.pushNote}>
                        Same rank is a push - your multiplier is kept and you pick again.
                    </p>
                    <button
                        type="button"
                        className={styles.cashOutButton}
                        onClick={onCashOut}
                        disabled={!round.can_cash_out || busy || phase === 'revealing'}
                    >
                        {round.can_cash_out
                            ? `Cash Out ${Number(round.potential_payout).toLocaleString(undefined, { maximumFractionDigits: 2 })} RP`
                            : 'Cash Out (win one first)'}
                    </button>
                </>
            ) : (
                <>
                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>Play Amount</span>
                        <input
                            type="number"
                            className={styles.input}
                            value={wagerInput}
                            min={config.min_wager}
                            max={config.max_wager}
                            step="1"
                            inputMode="numeric"
                            onChange={(event) => onWagerChange(event.target.value)}
                            disabled={busy}
                        />
                    </label>
                    <div className={styles.quickRow}>
                        {config.wager_quick_amounts.map((amount) => (
                            <button
                                type="button"
                                key={amount}
                                className={`${styles.quickButton} ${Number(wagerInput) === amount ? styles.quickActive : ''}`}
                                onClick={() => onWagerChange(String(amount))}
                                disabled={busy || amount > balance}
                            >
                                {amount}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className={styles.dealButton}
                        onClick={onDeal}
                        disabled={!wagerValid || busy || phase === 'dealing'}
                    >
                        {phase === 'dealing' ? 'Dealing…' : 'Deal'}
                    </button>
                    {!wagerValid && wagerInput !== '' && (
                        <p className={styles.helper}>
                            {wagerAmount > balance
                                ? 'Not enough Reward Points for this play.'
                                : `Enter between ${config.min_wager} and ${config.max_wager}.`}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
