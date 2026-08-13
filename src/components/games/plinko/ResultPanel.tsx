import { formatPoints } from '@/lib/points';
import { PlinkoRound } from '@/types';
import styles from './ResultPanel.module.css';

export function ResultPanel({ round }: { round: PlinkoRound }) {
    // payout_amount is a Decimal - serializes as a string, parse before math/display.
    const payout = Number(round.payout_amount);
    const net = payout - round.wager_amount;
    return (
        <div className={`${styles.panel} ${net >= 0 ? styles.win : styles.loss}`}>
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
                <strong>{net >= 0 ? '+' : ''}{formatPoints(net)}</strong>
            </div>
        </div>
    );
}
