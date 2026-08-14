'use client';

import { Modal } from '@/components/ui/Modal';
import { PlinkoMode } from '@/types';
import styles from './PlinkoRulesModal.module.css';

interface PlinkoRulesModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: PlinkoMode;
    multipliers: number[];
}

export function PlinkoRulesModal({ isOpen, onClose, mode, multipliers }: PlinkoRulesModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Plinko - How to Play">
            <div className={styles.content}>
                <section>
                    <h3>How it works</h3>
                    <ul className={styles.rulesList}>
                        <li>Choose your rows, risk level, and wager, then drop the ball.</li>
                        <li>The ball bounces down through the pegs and lands in one of the slots at the bottom.</li>
                        <li>Each slot has a multiplier - your payout is your wager x that slot's multiplier.</li>
                        {mode === 'free_drop' && (
                            <li>Free Drop: drag the ball left/right before dropping to choose your starting position - it shifts the odds toward the side you drop from.</li>
                        )}
                        <li>Higher risk levels spread the multipliers further apart (bigger potential wins, more small/zero outcomes too).</li>
                        <li>More rows means more possible landing slots and a wider multiplier spread.</li>
                    </ul>
                </section>

                <section>
                    <h3>Current multipliers</h3>
                    <div className={styles.multiplierRow}>
                        {multipliers.map((multiplier, index) => (
                            <span key={index} className={styles.multiplierChip}>{multiplier}x</span>
                        ))}
                    </div>
                </section>
            </div>
        </Modal>
    );
}
