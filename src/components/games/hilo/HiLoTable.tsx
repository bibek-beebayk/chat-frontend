'use client';

import { HiLoCard, HiLoHistoryItem, HiLoOutcome, HiLoRoundState } from '@/types';
import { HiLoHistoryStrip } from './HiLoHistoryStrip';
import { PlayingCard } from './PlayingCard';
import styles from './HiLoTable.module.css';

export type HiLoPhase =
    | 'idle'
    | 'dealing'
    | 'awaiting_prediction'
    | 'revealing'
    | 'win'
    | 'push'
    | 'loss'
    | 'round_complete';

interface HiLoTableProps {
    phase: HiLoPhase;
    round: HiLoRoundState | null;
    /** The round that just ended, held on screen briefly before the next one. */
    resultRound: HiLoRoundState | null;
    previousCard: HiLoCard | null;
    revealCard: HiLoCard | null;
    lastOutcome: HiLoOutcome | null;
    history: HiLoHistoryItem[];
    soundMuted: boolean;
    onToggleMute: () => void;
}

const OUTCOME_LABEL: Record<HiLoOutcome, string> = {
    win: 'Correct',
    push: 'Same rank - push',
    loss: 'Wrong',
};

export function HiLoTable({
    phase,
    round,
    resultRound,
    previousCard,
    revealCard,
    lastOutcome,
    history,
    soundMuted,
    onToggleMute,
}: HiLoTableProps) {
    const shown = round ?? resultRound;
    const multiplier = shown ? Number(shown.multiplier) : 1;
    const potential = shown ? Number(shown.potential_payout) : 0;

    // During a reveal the drawn card is shown in the main slot flipping over;
    // otherwise the round's own face-up card is what the next prediction is
    // made against.
    const revealing = phase === 'revealing' || phase === 'win' || phase === 'push' || phase === 'loss';
    const mainCard = revealing ? revealCard : (shown?.current_card ?? null);
    const mainRevealed = phase !== 'dealing' && phase !== 'revealing' && mainCard !== null;

    const tone = phase === 'win' ? 'win' : phase === 'push' ? 'push' : phase === 'loss' ? 'loss' : 'neutral';

    return (
        <div className={styles.stage}>
            <div className={styles.topRow}>
                <HiLoHistoryStrip items={history} compact />
                <button
                    type="button"
                    className={styles.muteButton}
                    onClick={onToggleMute}
                    aria-label={soundMuted ? 'Unmute sound' : 'Mute sound'}
                >
                    {soundMuted ? '🔇' : '🔊'}
                </button>
            </div>

            <div className={styles.multiplierBlock}>
                <span
                    className={`${styles.multiplier} ${phase === 'win' ? styles.multiplierBump : ''} ${phase === 'loss' ? styles.multiplierLost : ''}`}
                >
                    {multiplier.toFixed(2)}x
                </span>
                <span className={styles.potential}>
                    {phase === 'loss' || resultRound?.status === 'busted'
                        ? 'Round lost'
                        : `Potential win ${potential.toLocaleString(undefined, { maximumFractionDigits: 2 })} RP`}
                </span>
            </div>

            <div className={styles.cards}>
                <div className={styles.previousSlot}>
                    {previousCard && (
                        <>
                            <span className={styles.slotLabel}>Previous</span>
                            <PlayingCard card={previousCard} revealed size="small" />
                        </>
                    )}
                </div>

                <PlayingCard card={mainCard} revealed={mainRevealed} tone={tone} />

                <div className={styles.streakSlot}>
                    {shown && shown.streak > 0 && (
                        <>
                            <span className={styles.slotLabel}>Streak</span>
                            <span className={styles.streakValue}>{shown.streak}</span>
                        </>
                    )}
                </div>
            </div>

            <div className={styles.bannerRow} aria-live="polite">
                {lastOutcome && revealing && (
                    <span className={`${styles.banner} ${styles[`banner_${lastOutcome}`]}`}>
                        {OUTCOME_LABEL[lastOutcome]}
                    </span>
                )}
                {resultRound?.status === 'cashed_out' && (
                    <span className={`${styles.banner} ${styles.banner_win}`}>
                        {resultRound.capped ? 'Max multiplier - paid out ' : 'Cashed out '}
                        {Number(resultRound.payout_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} RP
                    </span>
                )}
                {phase === 'idle' && !resultRound && (
                    <span className={styles.hint}>Pick an amount and deal to start.</span>
                )}
            </div>
        </div>
    );
}
