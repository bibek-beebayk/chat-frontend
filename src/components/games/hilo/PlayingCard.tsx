'use client';

import { HiLoCard } from '@/types';
import styles from './PlayingCard.module.css';

const SUIT_GLYPHS: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
};

interface PlayingCardProps {
    card: HiLoCard | null;
    /** false shows the Rollin card back - the flip is driven by this alone. */
    revealed: boolean;
    /** Visual state of the stage the card sits in, applied as a glow. */
    tone?: 'neutral' | 'win' | 'push' | 'loss';
    size?: 'large' | 'small';
}

/**
 * One playing card, with a CSS-only 3D flip between the Rollin back and the
 * face. No animation library: the flip is a `rotateY` on an inner wrapper
 * with `backface-visibility: hidden` on both faces, so React only ever
 * toggles a class and the browser does the rest. Respects
 * prefers-reduced-motion (see the stylesheet).
 */
export function PlayingCard({ card, revealed, tone = 'neutral', size = 'large' }: PlayingCardProps) {
    const isRed = card ? card.suit === 'hearts' || card.suit === 'diamonds' : false;
    const glyph = card ? SUIT_GLYPHS[card.suit] : '';

    return (
        <div
            className={`${styles.card} ${size === 'small' ? styles.small : ''} ${styles[tone]}`}
            aria-label={card && revealed ? `${card.rank} of ${card.suit}` : 'Face-down card'}
            role="img"
        >
            <div className={`${styles.inner} ${revealed ? styles.revealed : ''}`}>
                <div className={styles.back}>
                    <span className={styles.crown}>&#9819;</span>
                    <span className={styles.monogram}>R</span>
                </div>
                <div className={`${styles.face} ${isRed ? styles.red : styles.black}`}>
                    <span className={styles.cornerTop}>
                        <em>{card?.rank}</em>
                        <i>{glyph}</i>
                    </span>
                    <span className={styles.pip}>{glyph}</span>
                    <span className={styles.cornerBottom}>
                        <em>{card?.rank}</em>
                        <i>{glyph}</i>
                    </span>
                </div>
            </div>
        </div>
    );
}
