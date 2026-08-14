'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { SlotSymbolId, SlotWinningLine } from '@/types';
import { SlotReel, SlotReelHandle, TILE_HEIGHT } from './SlotReel';
import { playReelStop } from './audio';
import styles from './SlotGrid.module.css';

export interface SlotGridHandle {
    spinAll: (stops: [number, number, number], onAllSettled: () => void) => void;
}

interface SlotGridProps {
    reelStrips: SlotSymbolId[][];
    winningLines: SlotWinningLine[];
    showResult: boolean;
}

// Row for each reel column that a payline reads from - must match
// slots/constants.py::PAYLINES exactly (row 0 = top, 1 = middle, 2 = bottom).
const PAYLINE_ROWS: [number, number, number][] = [
    [1, 1, 1],
    [0, 0, 0],
    [2, 2, 2],
    [0, 1, 0],
    [2, 1, 2],
];

const STAGGER_MS: [number, number, number] = [1400, 1700, 2000];

export const SlotGrid = forwardRef<SlotGridHandle, SlotGridProps>(function SlotGrid(
    { reelStrips, winningLines, showResult },
    ref
) {
    const reelRefs = [useRef<SlotReelHandle>(null), useRef<SlotReelHandle>(null), useRef<SlotReelHandle>(null)];
    const [spinning, setSpinning] = useState(false);

    useImperativeHandle(ref, () => ({
        spinAll(stops, onAllSettled) {
            setSpinning(true);
            let settledCount = 0;
            for (let reelIndex = 0; reelIndex < 3; reelIndex++) {
                const handle = reelRefs[reelIndex].current;
                if (!handle) continue;
                handle.spin(stops[reelIndex], STAGGER_MS[reelIndex], () => {
                    playReelStop();
                    settledCount += 1;
                    if (settledCount === 3) {
                        setSpinning(false);
                        onAllSettled();
                    }
                });
            }
        },
    }));

    const highlightedCells = new Set<string>(); // `${reel}-${row}`
    if (showResult) {
        for (const line of winningLines) {
            const rows = PAYLINE_ROWS[line.line_index];
            for (let reel = 0; reel < 3; reel++) {
                highlightedCells.add(`${reel}-${rows[reel]}`);
            }
        }
    }
    const hasWin = showResult && winningLines.length > 0;

    return (
        <div className={styles.grid}>
            {reelStrips.map((strip, reelIndex) => (
                <div key={reelIndex} className={styles.reelSlot}>
                    <SlotReel ref={reelRefs[reelIndex]} strip={strip} reelIndex={reelIndex} />
                </div>
            ))}

            {hasWin && !spinning && (
                <div className={styles.overlay} aria-hidden="true">
                    {[0, 1, 2].map((reel) =>
                        [0, 1, 2].map((row) => {
                            const isWinning = highlightedCells.has(`${reel}-${row}`);
                            return (
                                <div
                                    key={`${reel}-${row}`}
                                    className={`${styles.cell} ${isWinning ? styles.cellWinning : styles.cellDimmed}`}
                                    style={{
                                        left: reel * TILE_HEIGHT,
                                        top: row * TILE_HEIGHT,
                                    }}
                                />
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
});
