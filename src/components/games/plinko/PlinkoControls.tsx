'use client';

import { PlinkoConfig, PlinkoRiskLevel, PlinkoRows } from '@/types';
import styles from './PlinkoControls.module.css';

interface PlinkoControlsProps {
    config: PlinkoConfig;
    rows: PlinkoRows;
    riskLevel: PlinkoRiskLevel;
    wagerAmount: string;
    balance: number;
    disabled: boolean;
    isValidWager: boolean;
    onRowsChange: (rows: PlinkoRows) => void;
    onRiskChange: (risk: PlinkoRiskLevel) => void;
    onWagerChange: (value: string) => void;
    onDrop: () => void;
}

/**
 * Drop stays inside the same `.controls` card as the fields (not a separate
 * component) so its position/spacing relative to the card is identical on
 * desktop. On small screens, the card around it collapses via `visibility`
 * (not `display`) so this button - which explicitly sets its own
 * `visibility: visible` - can stay pinned and interactive even while the
 * rest of the card is hidden. See PlinkoControls.module.css.
 */
export function PlinkoControls({
    config,
    rows,
    riskLevel,
    wagerAmount,
    balance,
    disabled,
    isValidWager,
    onRowsChange,
    onRiskChange,
    onWagerChange,
    onDrop,
}: PlinkoControlsProps) {
    const maxWager = Math.min(config.max_wager, balance);

    return (
        <div className={styles.controls}>
            {config.rows_options.length > 1 && (
                <div className={styles.field}>
                    <span>Rows</span>
                    <div className={styles.optionRow}>
                        {config.rows_options.map((option) => (
                            <button
                                key={option}
                                type="button"
                                className={`${styles.optionBtn} ${rows === option ? styles.optionActive : ''}`}
                                onClick={() => onRowsChange(option)}
                                disabled={disabled}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className={styles.field}>
                <span>Risk</span>
                <div className={styles.optionRow}>
                    {config.risk_options.map((option) => (
                        <button
                            key={option}
                            type="button"
                            className={`${styles.optionBtn} ${riskLevel === option ? styles.optionActive : ''}`}
                            onClick={() => onRiskChange(option)}
                            disabled={disabled}
                        >
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <label className={styles.field}>
                <span>Wager (points)</span>
                <input
                    type="number"
                    min={config.min_wager}
                    max={maxWager}
                    value={wagerAmount}
                    onChange={(event) => onWagerChange(event.target.value)}
                    disabled={disabled}
                />
            </label>

            <button type="button" className={styles.dropButton} onClick={onDrop} disabled={disabled || !isValidWager}>
                {disabled ? 'Dropping...' : 'Drop'}
            </button>
        </div>
    );
}
