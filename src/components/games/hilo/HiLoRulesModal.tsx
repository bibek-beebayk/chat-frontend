'use client';

import { Modal } from '@/components/ui/Modal';
import { PlayingCard } from './PlayingCard';
import styles from './HiLoRulesModal.module.css';

interface HiLoRulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const STEPS = [
    {
        title: 'Deal a card',
        body: 'Pick your play amount. One card is dealt face up.',
    },
    {
        title: 'Call the next card',
        body: 'Higher or lower? Ace is high, and suits never matter.',
    },
    {
        title: 'Climb the multiplier',
        body: 'Every correct call multiplies your play amount further.',
    },
    {
        title: 'Cash out, or push on',
        body: 'Take the win any time - or risk it all on one more card.',
    },
];

// The real shipped quotes for a face-up 9 (see hilo/constants.py's house
// edge and the odds table) - a worked example beats an abstract sentence,
// and these are the exact numbers the buttons will show.
const EXAMPLE = {
    card: { rank: '9' as const, suit: 'spades' as const },
    lower: { probability: '53.8%', multiplier: '1.66x' },
    higher: { probability: '38.5%', multiplier: '2.32x' },
};

export function HiLoRulesModal({ isOpen, onClose }: HiLoRulesModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Rollin Hi-Lo">
            <div className={styles.content}>
                <p className={styles.tagline}>Guess. Climb. Cash Out.</p>

                <ol className={styles.steps}>
                    {STEPS.map((step, index) => (
                        <li key={step.title} className={styles.step}>
                            <span className={styles.stepNumber}>{index + 1}</span>
                            <span className={styles.stepText}>
                                <strong>{step.title}</strong>
                                {step.body}
                            </span>
                        </li>
                    ))}
                </ol>

                <section className={styles.example} aria-label="Worked example">
                    <span className={styles.sectionLabel}>The riskier call always pays more</span>
                    <div className={styles.exampleBody}>
                        <PlayingCard card={EXAMPLE.card} revealed size="small" />
                        <div className={styles.quotes}>
                            <div className={`${styles.quote} ${styles.quoteLower}`}>
                                <span className={styles.quoteArrow}>▼</span>
                                <span className={styles.quoteName}>Lower</span>
                                <span className={styles.quoteOdds}>{EXAMPLE.lower.probability}</span>
                                <span className={styles.quotePays}>{EXAMPLE.lower.multiplier}</span>
                            </div>
                            <div className={`${styles.quote} ${styles.quoteHigher}`}>
                                <span className={styles.quoteArrow}>▲</span>
                                <span className={styles.quoteName}>Higher</span>
                                <span className={styles.quoteOdds}>{EXAMPLE.higher.probability}</span>
                                <span className={styles.quotePays}>{EXAMPLE.higher.multiplier}</span>
                            </div>
                        </div>
                    </div>
                    <p className={styles.exampleNote}>
                        Only two ranks beat a King, so calling Higher on one pays far more
                        than calling it on a 3. Both buttons always show their real odds.
                    </p>
                </section>

                <div className={styles.rules}>
                    <div className={`${styles.rule} ${styles.rulePush}`}>
                        <span className={styles.ruleTag}>Push</span>
                        <p>Draw the same rank and nothing is lost - you keep your multiplier and pick again from the new card.</p>
                    </div>
                    <div className={`${styles.rule} ${styles.ruleLoss}`}>
                        <span className={styles.ruleTag}>Wrong</span>
                        <p>Call it wrong and the round ends there. That play is lost.</p>
                    </div>
                    <div className={`${styles.rule} ${styles.ruleWin}`}>
                        <span className={styles.ruleTag}>100x</span>
                        <p>Reach the maximum multiplier and the round cashes out automatically.</p>
                    </div>
                </div>

                <p className={styles.fairness}>
                    Every card is generated on the server the moment you predict - never on
                    your device, and never decided in advance.
                </p>
            </div>
        </Modal>
    );
}
