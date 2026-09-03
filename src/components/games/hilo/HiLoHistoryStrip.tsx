'use client';

import { HiLoHistoryItem } from '@/types';
import styles from './HiLoHistoryStrip.module.css';

interface HiLoHistoryStripProps {
    items: HiLoHistoryItem[];
    /** Chips-only, no label/card chrome - meant to sit inside the gameplay stage. */
    compact?: boolean;
}

const SUIT_GLYPHS: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
};

export function HiLoHistoryStrip({ items, compact }: HiLoHistoryStripProps) {
    if (items.length === 0) {
        return compact ? <div className={styles.compactWrap} /> : null;
    }

    if (compact) {
        return (
            <div className={styles.compactWrap}>
                <div className={styles.track}>
                    {items.map((item) => (
                        <span
                            key={item.round_id}
                            className={`${styles.chip} ${item.status === 'cashed_out' ? styles.chipWin : styles.chipLoss}`}
                        >
                            {Number(item.multiplier).toFixed(2)}x
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    // Full table - the design brief's per-prediction breakdown, flattened
    // across recent rounds so a player can see exactly what happened.
    const rows = items.flatMap((item) =>
        item.steps.map((step) => ({ key: `${item.round_id}-${step.step_index}`, step })),
    ).slice(0, 12);

    return (
        <div className={styles.wrap}>
            <span className={styles.label}>Recent Predictions</span>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th scope="col">From</th>
                        <th scope="col">Call</th>
                        <th scope="col">Next</th>
                        <th scope="col">Result</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ key, step }) => (
                        <tr key={key}>
                            <td>{step.from_card.rank}{SUIT_GLYPHS[step.from_card.suit]}</td>
                            <td className={styles.call}>{step.prediction}</td>
                            <td>{step.to_card.rank}{SUIT_GLYPHS[step.to_card.suit]}</td>
                            <td className={styles[`outcome_${step.outcome}`]}>{step.outcome}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
