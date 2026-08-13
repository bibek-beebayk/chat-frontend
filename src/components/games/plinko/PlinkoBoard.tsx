'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './PlinkoBoard.module.css';

const BOARD_ASPECT = 3 / 4; // width:height

const BASE_STEP_MS = 380;
const MIN_STEP_MS = 200;
const STEP_DECAY_MS = 5;
const BOUNCE_SETTLE_MS = 460; // matches the plinkoLandBounce keyframe duration
const LAUNCH_Y = 3; // percent, visible resting spot near the chute where the idle ball sits and drops start
const DRAG_RANGE = 35; // percent, +/- from center the launcher ball can be dragged

function segmentDuration(segmentIndex: number): number {
    return Math.max(MIN_STEP_MS, BASE_STEP_MS - segmentIndex * STEP_DECAY_MS);
}

function countRight(path: number[], uptoExclusive: number): number {
    return path.slice(0, uptoExclusive).reduce((sum, value) => sum + value, 0);
}

type Phase = 'idle' | 'dropping' | 'landed';

interface Point {
    x: number;
    y: number;
}

interface ResultBall extends Point {
    slotIndex: number;
}

interface PlinkoBoardProps {
    rows: number;
    multipliers: number[];
    path: number[] | null;
    disabled?: boolean;
    onRelease: (dropOffset: number) => void;
    onLanded?: () => void;
}

export function PlinkoBoard({ rows, multipliers, path, disabled, onRelease, onLanded }: PlinkoBoardProps) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [roundToken, setRoundToken] = useState(0);
    const [launcherX, setLauncherX] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    // The most recently landed ball, frozen in place at its slot. Persists
    // until the *next* drop actually begins (not on any timer) - a fresh
    // draggable ball appears at the top right after landing, coexisting with
    // this one, so both are visible until the user drops the new one.
    const [resultBall, setResultBall] = useState<ResultBall | null>(null);
    const [boardSize, setBoardSize] = useState<{ width: number; height: number } | null>(null);
    const boardRef = useRef<HTMLDivElement>(null);
    const dropTimerRef = useRef<number | null>(null);
    const prevPathRef = useRef<number[] | null>(null);
    // Snapshot of launcherX at the moment the current round's ball was
    // released - frozen for the whole fall so a later drag (for the *next*
    // ball) can't retroactively affect an animation already in flight.
    const dropStartXRef = useRef(50);

    const pegSpacing = 90 / rows;
    const rowSpacing = 80 / rows;

    // The board's children are all `position: absolute`, so they contribute
    // no intrinsic size - a pure CSS aspect-ratio box collapses to 0x0 here.
    // Measure the wrapping column instead and compute a pixel size that fits
    // it while preserving BOARD_ASPECT, so the board actually fills the
    // available height (or width, whichever is the binding constraint).
    useLayoutEffect(() => {
        const columnEl = boardRef.current?.parentElement;
        if (!columnEl) return undefined;

        const updateSize = () => {
            const availableW = columnEl.clientWidth;
            const availableH = columnEl.clientHeight;
            if (availableW <= 0 || availableH <= 0) return;
            let width = availableW;
            let height = width / BOARD_ASPECT;
            if (height > availableH) {
                height = availableH;
                width = height * BOARD_ASPECT;
            }
            setBoardSize({ width, height });
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(columnEl);
        return () => observer.disconnect();
    }, []);

    // Reacts to a genuinely new round arriving from the server (a fresh array
    // reference from the API response). Not tied to whether `path` is
    // null/non-null so that a rejected drop (validation failed before any API
    // call) leaves the board untouched in its idle state. The actual fall is
    // driven entirely by a single CSS animation (built below) rather than a
    // chain of per-row timers, so it plays as one continuous motion instead
    // of visibly resetting velocity at each peg.
    useEffect(() => {
        if (path === prevPathRef.current) return;
        prevPathRef.current = path;
        if (dropTimerRef.current) {
            window.clearTimeout(dropTimerRef.current);
            dropTimerRef.current = null;
        }
        if (!path) return undefined;

        dropStartXRef.current = launcherX;
        setResultBall(null);
        setPhase('dropping');
        setRoundToken((token) => token + 1);

        return () => {
            if (dropTimerRef.current) {
                window.clearTimeout(dropTimerRef.current);
                dropTimerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path]);

    const isLanded = phase === 'landed';
    const isDropping = phase === 'dropping';
    const isIdle = phase === 'idle';

    const pegs: Point[] = [];
    for (let i = 0; i < rows; i += 1) {
        const pegCount = i + 1;
        for (let j = 0; j < pegCount; j += 1) {
            pegs.push({
                x: 50 + (j - (pegCount - 1) / 2) * pegSpacing,
                y: 5 + i * rowSpacing,
            });
        }
    }

    // Dense decorative dot field (independent of the functional triangular
    // peg positions above, which are only used for the ball's waypoint math).
    const DOT_COLUMNS = 9;
    const DOT_ROWS = Math.max(rows + 2, 10);
    const decorativeDots: Point[] = [];
    for (let r = 0; r < DOT_ROWS; r += 1) {
        const rowOffset = r % 2 === 0 ? 0 : (100 - 16) / (DOT_COLUMNS - 1) / 2;
        for (let c = 0; c < DOT_COLUMNS; c += 1) {
            const x = 8 + rowOffset + c * ((100 - 16) / (DOT_COLUMNS - 1));
            const y = 8 + r * (78 / (DOT_ROWS - 1));
            if (x >= 3 && x <= 97) decorativeDots.push({ x, y });
        }
    }

    // Every waypoint (step 0..rows) the ball passes through this round, plus
    // the per-segment timing needed to express the whole fall as one CSS
    // keyframe animation. Waypoint k (k=1..rows-1) sits at row (k-1)'s actual
    // peg height - the peg it's arriving at, not yet bounced off - so its X
    // only reflects bounces already fully resolved *before* that row (row
    // (k-1)'s own bounce takes effect on the *next* segment, as the ball
    // leaves it). That's what keeps the very first segment (launch -> row 0)
    // a straight vertical drop instead of already leaning toward whichever
    // side row 0's bounce will send it - there's no bounce to react to until
    // the ball actually reaches row 0. The final waypoint is the resting
    // slot position, which - unlike the intermediate ones - does need every
    // bounce including the last row's. Since the landed slot's payout
    // position is fixed regardless of drop point, a small correction toward
    // that fixed target ramps in from 0 at the first real waypoint up to the
    // full amount by landing, so the ball still lands exactly on its real
    // slot without that correction being visible as diagonal drift on the
    // free-fall segment.
    let waypoints: Point[] | null = null;
    let segmentDurations: number[] = [];
    let totalFallDuration = 0;
    let keyframeStops: number[] = [];
    if (path) {
        segmentDurations = Array.from({ length: rows }, (_, i) => segmentDuration(i));
        totalFallDuration = segmentDurations.reduce((a, b) => a + b, 0);
        let cumulativeMs = 0;
        keyframeStops = [0];
        segmentDurations.forEach((d) => {
            cumulativeMs += d;
            keyframeStops.push((cumulativeMs / totalFallDuration) * 100);
        });

        const dropX = dropStartXRef.current;
        waypoints = Array.from({ length: rows + 1 }, (_, step) => {
            if (step === 0) return { x: dropX, y: LAUNCH_Y };
            const bouncesApplied = step === rows ? rows : step - 1;
            const rightCount = countRight(path, bouncesApplied);
            const xOffsetSteps = 2 * rightCount - bouncesApplied;
            const rawX = dropX + xOffsetSteps * (pegSpacing / 2);
            const correctionT = rows > 1 ? (step - 1) / (rows - 1) : 1;
            const correction = correctionT * (dropX - 50);
            const y = step === rows ? 5 + rows * rowSpacing : 5 + (step - 1) * rowSpacing;
            return { x: rawX - correction, y };
        });
    }

    const finalWaypoint = waypoints ? waypoints[rows] : null;

    // Which peg (and nearest decorative dot) each row's bounce actually
    // touches, with the elapsed time (ms) at which the ball arrives there -
    // drives delay-based flash animations so they stay in sync with the
    // single continuous fall animation without any per-row React state.
    const pegHitDelays = new Map<number, number>();
    const dotHitDelays = new Map<number, number>();
    if (path && waypoints) {
        let cumulativeMs = 0;
        for (let r = 0; r < rows; r += 1) {
            cumulativeMs += segmentDurations[r];
            const col = countRight(path, r);
            const pegIdx = (r * (r + 1)) / 2 + col;
            pegHitDelays.set(pegIdx, cumulativeMs);

            const peg = pegs[pegIdx];
            if (peg) {
                let bestDist = Infinity;
                let bestDotIdx = -1;
                decorativeDots.forEach((dot, idx) => {
                    const dist = (dot.x - peg.x) ** 2 + (dot.y - peg.y) ** 2;
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestDotIdx = idx;
                    }
                });
                if (bestDotIdx >= 0) dotHitDelays.set(bestDotIdx, cumulativeMs);
            }
        }
    }

    const fallAnimationName = `plinkoFall${roundToken}`;
    const fallAnimationCss = waypoints
        ? `@keyframes ${fallAnimationName} { ${waypoints
            .map((wp, i) => `${keyframeStops[i].toFixed(4)}% { left: ${wp.x.toFixed(3)}%; top: ${wp.y.toFixed(3)}%; }`)
            .join(' ')} }`
        : '';

    const handleFallAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
        // animationend bubbles - ignore anything except the fall animation on
        // this element itself (a child's own animation, e.g. the spin/squash,
        // would otherwise fire this prematurely).
        if (event.target !== event.currentTarget) return;
        if (!path || !finalWaypoint) return;
        setPhase('landed');
        onLanded?.();
        const finalSlot = path.reduce((sum, value) => sum + value, 0);
        setResultBall({ x: finalWaypoint.x, y: finalWaypoint.y, slotIndex: finalSlot });
        dropTimerRef.current = window.setTimeout(() => {
            setPhase('idle');
            setRoundToken((token) => token + 1);
        }, BOUNCE_SETTLE_MS);
    };

    const percentFromClientX = (clientX: number): number => {
        const rect = boardRef.current?.getBoundingClientRect();
        if (!rect || rect.width === 0) return launcherX;
        const raw = ((clientX - rect.left) / rect.width) * 100;
        return Math.max(50 - DRAG_RANGE, Math.min(50 + DRAG_RANGE, raw));
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isIdle || disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDragging(true);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        setLauncherX(percentFromClientX(event.clientX));
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        setIsDragging(false);
        const releaseX = percentFromClientX(event.clientX);
        setLauncherX(releaseX);
        const dropOffset = Math.max(-1, Math.min(1, (releaseX - 50) / DRAG_RANGE));
        onRelease(dropOffset);
    };

    const handlePointerCancel = () => {
        setIsDragging(false);
    };

    const idleOrLandedX = isIdle ? launcherX : finalWaypoint ? finalWaypoint.x : 50;
    const idleOrLandedY = isIdle ? LAUNCH_Y : finalWaypoint ? finalWaypoint.y : LAUNCH_Y;

    return (
        <div
            className={styles.board}
            ref={boardRef}
            style={boardSize ? { width: boardSize.width, height: boardSize.height } : undefined}
        >
            {isDropping && fallAnimationCss && <style>{fallAnimationCss}</style>}

            <div className={styles.chevronRail} data-side="left">
                {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className={`${styles.chevron} ${idx % 2 === 0 ? styles.chevronCyan : styles.chevronPink}`} />
                ))}
            </div>
            <div className={styles.chevronRail} data-side="right">
                {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className={`${styles.chevron} ${idx % 2 === 0 ? styles.chevronPink : styles.chevronCyan}`} />
                ))}
            </div>

            <div className={styles.chute} />

            {pegs.map((peg, idx) => {
                const pegDelay = pegHitDelays.get(idx);
                const isPegHit = isDropping && pegDelay !== undefined;
                return (
                    <div
                        key={isPegHit ? `peg-${idx}-hit-${roundToken}` : `peg-${idx}`}
                        className={`${styles.peg} ${isPegHit ? styles.pegHit : ''}`}
                        style={{ left: `${peg.x}%`, top: `${peg.y}%`, animationDelay: isPegHit ? `${pegDelay}ms` : undefined }}
                    />
                );
            })}

            {decorativeDots.map((dot, idx) => {
                const delay = dotHitDelays.get(idx);
                const isHit = isDropping && delay !== undefined;
                return (
                    <div
                        key={isHit ? `dot-${idx}-hit-${roundToken}` : `dot-${idx}`}
                        className={`${styles.dot} ${isHit ? styles.dotHit : ''}`}
                        style={{ left: `${dot.x}%`, top: `${dot.y}%`, animationDelay: isHit ? `${delay}ms` : undefined }}
                    />
                );
            })}

            <svg className={styles.fanLines} viewBox="0 0 100 100" preserveAspectRatio="none">
                {multipliers.map((_, idx) => {
                    const xPercent = 50 + (2 * idx - rows) * (pegSpacing / 2);
                    return (
                        <line
                            key={idx}
                            x1="50"
                            y1="100"
                            x2={xPercent}
                            y2="88"
                            className={styles.fanLine}
                        />
                    );
                })}
            </svg>

            {isIdle && <div className={styles.launcherTrack} style={{ left: `${50 - DRAG_RANGE}%`, width: `${DRAG_RANGE * 2}%` }} />}

            {resultBall && phase !== 'landed' && (
                <div className={styles.ballWrapper} style={{ left: `${resultBall.x}%`, top: `${resultBall.y}%` }}>
                    <div className={styles.ballSquash}>
                        <div className={`${styles.ballSpin} ${styles.ballSpinPaused}`} />
                    </div>
                </div>
            )}

            {(path || isIdle) && (
                <div
                    key={roundToken}
                    className={`${styles.ballWrapper} ${isDropping ? styles.dropping : ''} ${isIdle ? styles.idleBall : ''} ${disabled && isIdle ? styles.idleDisabled : ''}`}
                    style={
                        isDropping
                            ? { animation: `${fallAnimationName} ${totalFallDuration}ms ease-in-out forwards` }
                            : {
                                left: `${idleOrLandedX}%`,
                                top: `${idleOrLandedY}%`,
                                transition: isDragging ? 'none' : 'left 200ms ease, top 200ms ease',
                            }
                    }
                    onAnimationEnd={isDropping ? handleFallAnimationEnd : undefined}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                >
                    <div
                        key={isLanded ? 'landed' : 'falling'}
                        className={`${styles.ballSquash} ${isLanded ? styles.ballLanded : ''}`}
                    >
                        <div className={`${styles.ballSpin} ${isLanded || isIdle ? styles.ballSpinPaused : ''}`} />
                    </div>
                </div>
            )}

            {multipliers.map((mult, idx) => {
                const xPercent = 50 + (2 * idx - rows) * (pegSpacing / 2);
                const isWinning = resultBall !== null && resultBall.slotIndex === idx;
                return (
                    <div
                        key={idx}
                        className={`${styles.slot} ${isWinning ? styles.slotWinning : ''}`}
                        style={{ left: `${xPercent}%` }}
                    >
                        {mult}x
                    </div>
                );
            })}
        </div>
    );
}
