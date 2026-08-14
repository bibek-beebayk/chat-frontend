'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { PromoCard } from '@/types';
import styles from './PromoCarousel.module.css';

interface PromoCarouselProps {
    cards: PromoCard[];
}

/**
 * Generic PromoCard[] renderer - the `kind` discriminant (not a fixed
 * tuple) is what lets this stay reusable as new promo types are added
 * later (e.g. referrals) with zero changes here. Scroll-snap track mirrors
 * PostCard.module.css's existing .galleryTrack/.gallerySlide pattern.
 */
export function PromoCarousel({ cards }: PromoCarouselProps) {
    const trackRef = useRef<HTMLDivElement>(null);

    if (cards.length === 0) return null;

    const scrollBy = (direction: 1 | -1) => {
        const track = trackRef.current;
        if (!track) return;
        track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.track} ref={trackRef} role="region" aria-label="Promotions" tabIndex={0}>
                {cards.map((card, i) => (
                    <PromoCardSlide key={i} card={card} />
                ))}
            </div>
            {cards.length > 1 && (
                <div className={styles.controls}>
                    <button type="button" className={styles.navBtn} onClick={() => scrollBy(-1)} aria-label="Previous promotion">‹</button>
                    <button type="button" className={styles.navBtn} onClick={() => scrollBy(1)} aria-label="Next promotion">›</button>
                </div>
            )}
        </div>
    );
}

function PromoCardSlide({ card }: { card: PromoCard }) {
    if (card.kind === 'challenge') {
        const percent = card.target > 0 ? Math.min(100, Math.round((card.current / card.target) * 100)) : 0;
        return (
            <Link href={card.href} className={`${styles.slide} ${styles.challenge}`}>
                <span className={styles.eyebrow}>Challenge</span>
                <h3>{card.label}</h3>
                <p>{card.current} / {card.target} complete · +{card.xpValue} XP</p>
                <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                </div>
            </Link>
        );
    }

    if (card.kind === 'streak') {
        return (
            <Link href={card.href} className={`${styles.slide} ${styles.streak}`}>
                <span className={styles.eyebrow}>7-Day Login Streak</span>
                <h3>{card.currentStreak} / {card.targetDays} days</h3>
                <p>Come back daily for a ${card.rewardAmount.toFixed(2)} credit.</p>
            </Link>
        );
    }

    const content = (
        <>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
            {card.ctaLabel && <span className={styles.cta}>{card.ctaLabel}</span>}
        </>
    );
    return card.href ? (
        <Link href={card.href} className={`${styles.slide} ${styles.static}`}>{content}</Link>
    ) : (
        <div className={`${styles.slide} ${styles.static}`}>{content}</div>
    );
}
