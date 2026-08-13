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
    onRowsChange: (rows: PlinkoRows) => void;
    onRiskChange: (risk: PlinkoRiskLevel) => void;
    onWagerChange: (value: string) => void;
}

export function PlinkoControls({
    config,
    rows,
    riskLevel,
    wagerAmount,
    balance,
    disabled,
    onRowsChange,
    onRiskChange,
    onWagerChange,
}: PlinkoControlsProps) {
    const wagerNumber = Number(wagerAmount);
    const maxWager = Math.min(config.max_wager, balance);
    const isValidWager = wagerNumber >= config.min_wager && wagerNumber <= maxWager;

    return (
        <div className={styles.controls}>
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

            <p className={styles.hint}>
                {disabled
                    ? 'Ball dropping...'
                    : isValidWager
                        ? 'Drag the ball left or right on the board, then let go to drop it.'
                        : 'Enter a valid wager to enable dropping.'}
            </p>
        </div>
    );
}
