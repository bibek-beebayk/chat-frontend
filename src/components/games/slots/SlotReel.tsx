'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { SlotSymbolId } from '@/types';
import { SYMBOL_GLYPH } from './symbolDisplay';
import styles from './SlotReel.module.css';

export const TILE_HEIGHT = 100; // px - matches SlotReel.module.css .tile height
const STRIP_COPIES = 12; // generous headroom - see spin() math below for the max offset a single spin can reach
const EXTRA_LAPS = 5; // full laps of visual "spinning" before landing, tuned for a natural feel

export interface SlotReelHandle {
    /** Animates to the given stop index, calling onSettled when the reel has physically stopped. */
    spin: (targetStop: number, durationMs: number, onSettled: () => void) => void;
}

interface SlotReelProps {
    strip: SlotSymbolId[];
    reelIndex: number;
}

/**
 * Renders the *real* configured reel strip (not fake/random symbols) and
 * scrolls through it via a single CSS transform transition per spin, always
 * moving forward and landing exactly on the server-authoritative stop -
 * never swaps in a different final symbol set after the fact.
 */
export const SlotReel = forwardRef<SlotReelHandle, SlotReelProps>(function SlotReel({ strip, reelIndex }, ref) {
    const trackRef = useRef<HTMLDivElement>(null);
    const offsetRef = useRef(0); // always normalized to [0, strip.length) between spins

    const duplicatedStrip = useMemo(() => {
        const out: SlotSymbolId[] = [];
        for (let i = 0; i < STRIP_COPIES; i++) out.push(...strip);
        return out;
    }, [strip]);

    useImperativeHandle(ref, () => ({
        spin(targetStop, durationMs, onSettled) {
            const track = trackRef.current;
            if (!track) {
                onSettled();
                return;
            }
            const n = strip.length;
            const startOffset = offsetRef.current;
            const targetTopIndex = ((targetStop - 1) % n + n) % n;
            const deltaToTarget = ((targetTopIndex - startOffset) % n + n) % n;
            const totalTravel = EXTRA_LAPS * n + deltaToTarget;
            const finalOffset = startOffset + totalTravel;

            track.style.transition = `transform ${durationMs}ms cubic-bezier(0.22, 0.68, 0.16, 1)`;
            track.style.transform = `translateY(-${finalOffset * TILE_HEIGHT}px)`;

            const handleEnd = (event: TransitionEvent) => {
                if (event.propertyName !== 'transform') return;
                track.removeEventListener('transitionend', handleEnd);

                // Snap back to a small, bounded offset showing the identical
                // symbols (same position mod n) with no transition - invisible
                // to the viewer, keeps the pixel math bounded across a long
                // play session instead of growing forever.
                track.style.transition = 'none';
                track.style.transform = `translateY(-${targetTopIndex * TILE_HEIGHT}px)`;
                offsetRef.current = targetTopIndex;
                // Force reflow so the next spin's transition isn't merged with this reset.
                void track.offsetHeight;

                onSettled();
            };
            track.addEventListener('transitionend', handleEnd);
        },
    }), [strip]);

    return (
        <div className={styles.viewport} aria-hidden="true" data-reel-index={reelIndex}>
            <div ref={trackRef} className={styles.track} style={{ transform: 'translateY(0px)' }}>
                {duplicatedStrip.map((symbol, i) => (
                    <div key={i} className={styles.tile}>
                        <span className={`${styles.glyph} ${styles[symbol]}`}>{SYMBOL_GLYPH[symbol]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});
