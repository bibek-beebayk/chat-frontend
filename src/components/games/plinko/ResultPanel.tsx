import { PlinkoRound } from '@/types';
import styles from './ResultPanel.module.css';

export function ResultPanel({ round }: { round: PlinkoRound }) {
    const net = round.payout_amount - round.wager_amount;
    return (
        <div className={`${styles.panel} ${net >= 0 ? styles.win : styles.loss}`}>
            <div>
                <span>Landed</span>
                <strong>Slot {round.slot_index} &middot; x{Number(round.multiplier).toFixed(2)}</strong>
            </div>
            <div>
                <span>Wagered</span>
                <strong>{round.wager_amount.toLocaleString()}</strong>
            </div>
            <div>
                <span>Payout</span>
                <strong>{round.payout_amount.toLocaleString()}</strong>
            </div>
            <div>
                <span>Net</span>
                <strong>{net >= 0 ? '+' : ''}{net.toLocaleString()}</strong>
            </div>
        </div>
    );
}
