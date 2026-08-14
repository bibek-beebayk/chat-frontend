'use client';

import { Modal } from '@/components/ui/Modal';
import { SlotConfig } from '@/types';
import { SYMBOL_GLYPH } from './symbolDisplay';
import styles from './SlotPaytableModal.module.css';

interface SlotPaytableModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: SlotConfig | null;
}

const PAYLINE_DIAGRAMS: Record<number, string[]> = {
    0: ['- - -', 'X X X', '- - -'],
    1: ['X X X', '- - -', '- - -'],
    2: ['- - -', '- - -', 'X X X'],
    3: ['X - X', '- X -', '- - -'],
    4: ['- - -', '- X -', 'X - X'],
};

export function SlotPaytableModal({ isOpen, onClose, config }: SlotPaytableModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Rollin 3x3 - Paytable & Rules">
            {!config ? (
                <p className={styles.muted}>Loading...</p>
            ) : (
                <div className={styles.content}>
                    <section>
                        <h3>Symbols (3-of-a-kind multiplier)</h3>
                        <div className={styles.symbolGrid}>
                            {config.symbols.map((symbol) => (
                                <div key={symbol.id} className={styles.symbolRow}>
                                    <span className={styles.symbolGlyph}>{SYMBOL_GLYPH[symbol.id]}</span>
                                    <span className={styles.symbolLabel}>{symbol.label}</span>
                                    <span className={styles.symbolMultiplier}>{config.paytable[symbol.id]}x</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3>Paylines</h3>
                        <div className={styles.paylineGrid}>
                            {config.paylines.map((_, index) => (
                                <div key={index} className={styles.paylineCard}>
                                    <span className={styles.paylineLabel}>Line {index + 1}</span>
                                    <pre className={styles.paylineDiagram}>{(PAYLINE_DIAGRAMS[index] || []).join('\n')}</pre>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3>How to play</h3>
                        <ul className={styles.rulesList}>
                            <li>Set your wager (total for the spin, not per line) and press SPIN.</li>
                            <li>A payline pays when all 3 of its positions show the same symbol - no partial matches.</li>
                            <li>Multiple paylines can win on the same spin; payouts are added together.</li>
                            <li>Wager range: {config.min_wager.toLocaleString()}-{config.max_wager.toLocaleString()} RP.</li>
                            <li>Game version: {config.game_version}</li>
                        </ul>
                    </section>
                </div>
            )}
        </Modal>
    );
}
