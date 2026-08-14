'use client';

import { Modal } from '@/components/ui/Modal';
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
    onCloseAutoplayMenu: () => void;
    onSelectAutoplayCount: (count: number) => void;
}

/**
 * Drop and Autoplay share one `.actionRow` - on desktop they're inline at
 * the bottom of the card; on small screens `.actionRow` lifts out via
 * `position: fixed` to pin to the bottom of the viewport (see
 * PlinkoControls.module.css), while the rest of the card stays in normal
 * flow above it. Autoplay opens a round-count picker as a Modal rather than
 * an inline switch+menu, so "start autoplay" always looks and behaves the
 * same regardless of screen size.
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
    onCloseAutoplayMenu,
    onSelectAutoplayCount,
}: PlinkoControlsProps) {
    const autoplayActive = autoplayRemaining !== null;
    // While autoplay is running, the button must stay clickable (to stop
    // it) even though every other control is disabled - only gate opening
    // the picker on the normal disabled/wager-validity checks.
    const autoplayButtonDisabled = !autoplayActive && (disabled || !isValidWager);

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

            <div className={styles.riskWagerRow}>
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
                    <span>Wager</span>
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
            </div>

            <div className={styles.actionRow}>
                <button type="button" className={styles.dropButton} onClick={onDrop} disabled={disabled || !isValidWager}>
                    {autoplayActive ? 'Autoplay...' : disabled ? 'Dropping...' : 'Drop'}
                </button>

                <button
                    type="button"
                    className={`${styles.autoplayButton} ${autoplayActive ? styles.autoplayButtonActive : ''}`}
                    onClick={onToggleAutoplay}
                    disabled={autoplayButtonDisabled}
                    aria-pressed={autoplayActive}
                >
                    {autoplayActive ? `Stop (${autoplayRemaining})` : 'Autoplay'}
                </button>
            </div>

            <Modal isOpen={autoplayMenuOpen && !autoplayActive} onClose={onCloseAutoplayMenu} title="Autoplay - Select Rounds">
                <div className={styles.autoplayModalOptions}>
                    {AUTOPLAY_OPTIONS.map((count) => (
                        <button
                            key={count}
                            type="button"
                            className={styles.autoplayModalOption}
                            onClick={() => onSelectAutoplayCount(count)}
                        >
                            {count} rounds
                        </button>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
