'use client';

import { PlinkoConfig, PlinkoRiskLevel, PlinkoRows, PlinkoWager } from '@/types';
import styles from './PlinkoControls.module.css';

const AUTOPLAY_OPTIONS = [5, 10, 20] as const;

interface PlinkoControlsProps {
    config: PlinkoConfig;
    rows: PlinkoRows;
    riskLevel: PlinkoRiskLevel;
    wagerAmount: PlinkoWager;
    disabled: boolean;
    isValidWager: boolean;
    autoplayRemaining: number | null;
    autoplayMenuOpen: boolean;
    onRowsChange: (rows: PlinkoRows) => void;
    onRiskChange: (risk: PlinkoRiskLevel) => void;
    onWagerChange: (value: PlinkoWager) => void;
    onDrop: () => void;
    onToggleAutoplay: () => void;
    onSelectAutoplayCount: (count: number) => void;
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
    disabled,
    isValidWager,
    autoplayRemaining,
    autoplayMenuOpen,
    onRowsChange,
    onRiskChange,
    onWagerChange,
    onDrop,
    onToggleAutoplay,
    onSelectAutoplayCount,
}: PlinkoControlsProps) {
    const autoplayActive = autoplayRemaining !== null;
    // While autoplay is running, the switch must stay clickable (to stop
    // it) even though every other control is disabled - only gate opening
    // the picker on the normal disabled/wager-validity checks.
    const autoplayToggleDisabled = !autoplayActive && (disabled || !isValidWager);

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

            <div className={styles.field}>
                <span>Wager (points)</span>
                <div className={styles.optionRow}>
                    {config.wager_options.map((option) => (
                        <button
                            key={option}
                            type="button"
                            className={`${styles.optionBtn} ${wagerAmount === option ? styles.optionActive : ''}`}
                            onClick={() => onWagerChange(option)}
                            disabled={disabled}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.field}>
                <span>Autoplay{autoplayActive ? ` · ${autoplayRemaining} left` : ''}</span>
                <div className={styles.autoplayControls}>
                    <button
                        type="button"
                        className={`${styles.autoplaySwitch} ${autoplayActive ? styles.autoplaySwitchActive : ''}`}
                        onClick={onToggleAutoplay}
                        disabled={autoplayToggleDisabled}
                        aria-pressed={autoplayActive}
                        aria-label={autoplayActive ? 'Stop autoplay' : 'Start autoplay'}
                    >
                        <span className={styles.autoplaySwitchKnob} />
                    </button>

                    {autoplayMenuOpen && !autoplayActive && (
                        <div className={styles.optionRow}>
                            {AUTOPLAY_OPTIONS.map((count) => (
                                <button
                                    key={count}
                                    type="button"
                                    className={styles.optionBtn}
                                    onClick={() => onSelectAutoplayCount(count)}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <button type="button" className={styles.dropButton} onClick={onDrop} disabled={disabled || !isValidWager}>
                {autoplayActive ? 'Autoplay...' : disabled ? 'Dropping...' : 'Drop'}
            </button>
        </div>
    );
}
