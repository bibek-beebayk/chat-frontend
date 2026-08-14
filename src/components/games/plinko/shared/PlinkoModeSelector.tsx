'use client';

import { PlinkoMode } from '@/types';
import styles from './PlinkoModeSelector.module.css';

interface PlinkoModeSelectorProps {
    mode: PlinkoMode;
    disabled: boolean;
    onChange: (mode: PlinkoMode) => void;
}

/**
 * Switching modes unmounts the previous mode's game component entirely (see
 * app/games/plinko/page.tsx) - there's no shared mutable state between
 * Classic and Free Drop to reason about, so this only needs to report the
 * chosen mode upward, not coordinate anything else.
 */
export function PlinkoModeSelector({ mode, disabled, onChange }: PlinkoModeSelectorProps) {
    return (
        <div className={styles.modeRow}>
            <button
                type="button"
                className={`${styles.modeBtn} ${mode === 'classic' ? styles.modeActive : ''}`}
                onClick={() => onChange('classic')}
                disabled={disabled}
            >
                Classic
            </button>
            <button
                type="button"
                className={`${styles.modeBtn} ${mode === 'free_drop' ? styles.modeActive : ''}`}
                onClick={() => onChange('free_drop')}
                disabled={disabled}
            >
                Free Drop
            </button>
        </div>
    );
}
