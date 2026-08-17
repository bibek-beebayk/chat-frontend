'use client';

import { Modal } from '@/components/ui/Modal';
import styles from './RocketRulesModal.module.css';

interface RocketRulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RocketRulesModal({ isOpen, onClose }: RocketRulesModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Rollin Rocket - How to Play">
            <div className={styles.content}>
                <ul className={styles.list}>
                    <li>Choose a play amount and place your play - the rocket launches after a short countdown.</li>
                    <li>The multiplier climbs from 1.00x and accelerates the longer the rocket flies.</li>
                    <li>Cash out any time to lock in your play amount &times; the current multiplier.</li>
                    <li>If the rocket crashes before you cash out, that round's play is lost.</li>
                    <li>Set Auto Cash Out to automatically lock in a target multiplier without needing to tap in time.</li>
                    <li>The crash point is generated and hidden server-side before the round starts - it's never decided by your device.</li>
                </ul>
            </div>
        </Modal>
    );
}
