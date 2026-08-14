import { formatPoints } from '@/lib/points';
import { PlinkoRound } from '@/types';
import styles from './ResultPanel.module.css';

interface ResultPanelProps {
    round: PlinkoRound;
    /** Single-line strip (multiplier/wager/payout/net only, no slot index) - used just below the mode switcher on mobile. */
    compact?: boolean;
}

export function ResultPanel({ round, compact }: ResultPanelProps) {
    // payout_amount is a Decimal - serializes as a string, parse before math/display.
    const payout = Number(round.payout_amount);
    const net = payout - round.wager_amount;
    const isWin = net >= 0;

    if (compact) {
        return (
            <div className={styles.compactPanel}>
                <span className={styles.compactMultiplier}>x{Number(round.multiplier).toFixed(2)}</span>
                <span className={styles.compactStat}>W {formatPoints(round.wager_amount)}</span>
                <span className={styles.compactStat}>P {formatPoints(payout)}</span>
                <span className={`${styles.compactStat} ${isWin ? styles.compactPositive : styles.compactNegative}`}>
                    {isWin ? '+' : ''}{formatPoints(net)}
                </span>
            </div>
        );
    }

    return (
        <div className={`${styles.panel} ${isWin ? styles.win : styles.loss}`}>
            <div>
                <span>Landed</span>
                <strong>Slot {round.slot_index} &middot; x{Number(round.multiplier).toFixed(2)}</strong>
            </div>
            <div>
                <span>Wagered</span>
                <strong>{formatPoints(round.wager_amount)}</strong>
            </div>
            <div>
                <span>Payout</span>
                <strong>{formatPoints(payout)}</strong>
            </div>
            <div>
                <span>Net</span>
                <strong>{isWin ? '+' : ''}{formatPoints(net)}</strong>
            </div>
        </div>
    );
}
