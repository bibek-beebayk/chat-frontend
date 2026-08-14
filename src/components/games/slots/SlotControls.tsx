'use client';

import { Modal } from '@/components/ui/Modal';
import styles from './SlotControls.module.css';

const AUTOPLAY_OPTIONS = [5, 10, 20] as const;

interface SlotControlsProps {
    wager: number;
    onWagerChange: (wager: number) => void;
    presets: number[];
    disabled: boolean;
    isValidWager: boolean;
    autoplayRemaining: number | null;
    autoplayMenuOpen: boolean;
    onSpin: () => void;
    onToggleAutoplay: () => void;
    onCloseAutoplayMenu: () => void;
    onSelectAutoplayCount: (count: number) => void;
}

export function SlotControls({
    wager,
    onWagerChange,
    presets,
    disabled,
    isValidWager,
    autoplayRemaining,
    autoplayMenuOpen,
    onSpin,
    onToggleAutoplay,
    onCloseAutoplayMenu,
    onSelectAutoplayCount,
}: SlotControlsProps) {
    const autoplayActive = autoplayRemaining !== null;
    const autoplayButtonDisabled = !autoplayActive && (disabled || !isValidWager);

    return (
        <div className={styles.controls}>
            <div className={styles.presetRow}>
                {presets.map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        className={`${styles.presetBtn} ${wager === preset ? styles.presetActive : ''}`}
                        onClick={() => onWagerChange(preset)}
                        disabled={disabled}
                        aria-pressed={wager === preset}
                    >
                        {preset}
                    </button>
                ))}
            </div>

            <div className={styles.actionRow}>
                <button type="button" className={styles.spinBtn} onClick={onSpin} disabled={disabled || !isValidWager}>
                    {!isValidWager ? 'Not Enough RP' : autoplayActive ? 'Autoplay...' : disabled ? 'Spinning...' : 'SPIN'}
                </button>

                <button
                    type="button"
                    className={`${styles.autoplayBtn} ${autoplayActive ? styles.autoplayBtnActive : ''}`}
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
                        <button key={count} type="button" className={styles.autoplayModalOption} onClick={() => onSelectAutoplayCount(count)}>
                            {count} rounds
                        </button>
                    ))}
                </div>
            </Modal>
        </div>
    );
}
