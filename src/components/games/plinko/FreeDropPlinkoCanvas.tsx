'use client';

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import {
    FREE_DROP_FIXED_DT,
    FREE_DROP_LOGICAL_WIDTH,
    FreeDropBoard,
    buildFreeDropBoard,
    computeFreeDropBoardGeometry,
    createFreeDropBall,
    dropPositionToSpawnX,
    freeDropBinIndexForX,
    isFreeDropNearRestInBin,
    spawnXToDropPosition,
} from './freeDropPhysics';
import { playPegHit, unlockAudio } from './audio';
import styles from './FreeDropPlinkoCanvas.module.css';

const FLASH_DURATION_MS = 260;
const PARTICLE_DURATION_MS = 320;
const SETTLE_STABLE_FRAMES = 15;

const PEG_LIGHT = '#eaf6ff';
const PEG_MID = '#8fb0ff';
const PEG_DARK = '#241a52';
const PEG_GLOW_COLOR = '255, 63, 176';
const PARTICLE_COLOR = '53, 213, 255';

interface Particle {
    x: number;
    y: number;
    start: number;
}

export interface FreeDropPlinkoCanvasHandle {
    play: (rows: number, slotIndex: number, dropPosition: number, physicsSeed: number, roundId?: number) => void;
}

interface FreeDropPlinkoCanvasProps {
    rows: number;
    multipliers: number[];
    /** Normalized [-1, 1] position the player has currently chosen - controlled by the parent, not internal state, so autoplay can hold it fixed across rounds. */
    dropPosition: number;
    /** True while a ball is falling or autoplay is running - repositioning is blocked during both. */
    dragDisabled: boolean;
    onDropPositionChange: (dropPosition: number) => void;
    onLanded?: () => void;
}

function tierForMultiplier(multiplier: number): 'extreme' | 'high' | 'mid' | 'low' {
    if (multiplier >= 10) return 'extreme';
    if (multiplier >= 3) return 'high';
    if (multiplier >= 1) return 'mid';
    return 'low';
}

/**
 * Free Drop's board renderer/controller - structurally mirrors
 * PlinkoCanvas.tsx (fixed-timestep rAF loop, refs for physics/animation
 * state, canvas 2D pin/ball rendering, real collisionStart-driven
 * flash/particle/audio) but adds the drag-to-position control and replays
 * physics from freeDropPhysics.ts's equal-pegs-per-row board instead of
 * Classic's triangle. See freeDropPhysics.ts's header for why this is a
 * separate module rather than a branch inside the Classic one.
 */
export const FreeDropPlinkoCanvas = forwardRef<FreeDropPlinkoCanvasHandle, FreeDropPlinkoCanvasProps>(function FreeDropPlinkoCanvas(
    { rows, multipliers, dropPosition, dragDisabled, onDropPositionChange, onLanded },
    ref
) {
    const [phase, setPhase] = useState<'idle' | 'dropping' | 'landed'>('idle');
    const [winningSlot, setWinningSlot] = useState<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const railRef = useRef<HTMLDivElement>(null);
    const boardRef = useRef<FreeDropBoard | null>(null);
    const ballRef = useRef<Matter.Body | null>(null);
    const phaseRef = useRef<'idle' | 'dropping' | 'landed'>('idle');
    const winningSlotRef = useRef<number | null>(null);
    const stableFramesRef = useRef(0);
    const pegFlashesRef = useRef<Map<number, number>>(new Map());
    const particlesRef = useRef<Particle[]>([]);
    const rafRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const accumulatorRef = useRef(0);
    const scaleRef = useRef({ cssWidth: FREE_DROP_LOGICAL_WIDTH, dpr: 1 });
    const geometry = computeFreeDropBoardGeometry(rows);
    const aspectRef = useRef(geometry.aspectRatio);
    aspectRef.current = geometry.aspectRatio;
    const onLandedRef = useRef(onLanded);
    onLandedRef.current = onLanded;
    const dropPositionRef = useRef(dropPosition);
    dropPositionRef.current = dropPosition;
    const draggingRef = useRef(false);
    const pointerIdRef = useRef<number | null>(null);
    // Diagnostic context for the mismatch check below - not used for
    // anything economic, just so a mismatch log is actually actionable.
    const landedContextRef = useRef<{ roundId?: number; dropPosition: number; physicsSeed: number } | null>(null);

    // Rebuild the physics world whenever the row count changes - same
    // collision-driven flash/particle/sound wiring as Classic.
    useEffect(() => {
        const board = buildFreeDropBoard(rows);
        boardRef.current = board;
        ballRef.current = null;
        winningSlotRef.current = null;
        pegFlashesRef.current = new Map();
        particlesRef.current = [];
        stableFramesRef.current = 0;
        phaseRef.current = 'idle';
        setPhase('idle');
        setWinningSlot(null);

        const handleCollision = (event: Matter.IEventCollision<Matter.Engine>) => {
            for (const pair of event.pairs) {
                const isBallPair = pair.bodyA.label === 'ball' || pair.bodyB.label === 'ball';
                if (!isBallPair) continue;
                const peg = pair.bodyA.label === 'peg' ? pair.bodyA : pair.bodyB.label === 'peg' ? pair.bodyB : null;
                if (!peg) continue;
                pegFlashesRef.current.set(peg.id, performance.now());
                particlesRef.current.push({ x: peg.position.x, y: peg.position.y, start: performance.now() });
                playPegHit();
            }
        };
        Matter.Events.on(board.engine, 'collisionStart', handleCollision);

        return () => {
            Matter.Events.off(board.engine, 'collisionStart', handleCollision);
            Matter.World.clear(board.world, false);
            Matter.Engine.clear(board.engine);
        };
    }, [rows]);

    // Same letterboxing/resize convention as Classic's PlinkoCanvas.
    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const columnEl = canvas?.parentElement;
        if (!canvas || !columnEl) return undefined;

        const updateSize = () => {
            const availableW = columnEl.clientWidth;
            const availableH = columnEl.clientHeight;
            if (availableW <= 0 || availableH <= 0) return;
            const aspect = aspectRef.current;
            let width = availableW;
            let height = width / aspect;
            if (height > availableH) {
                height = availableH;
                width = height * aspect;
            }
            const dpr = window.devicePixelRatio || 1;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            scaleRef.current = { cssWidth: width, dpr };
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(columnEl);
        return () => observer.disconnect();
    }, [rows]);

    useEffect(() => {
        const tick = (now: number) => {
            if (lastTimeRef.current === null) lastTimeRef.current = now;
            const delta = Math.min(now - lastTimeRef.current, 100);
            lastTimeRef.current = now;
            accumulatorRef.current += delta;

            while (accumulatorRef.current >= FREE_DROP_FIXED_DT) {
                if (phaseRef.current === 'dropping' && boardRef.current && ballRef.current) {
                    Matter.Engine.update(boardRef.current.engine, FREE_DROP_FIXED_DT);
                    if (isFreeDropNearRestInBin(boardRef.current, ballRef.current)) {
                        stableFramesRef.current += 1;
                        if (stableFramesRef.current > SETTLE_STABLE_FRAMES) {
                            phaseRef.current = 'landed';
                            setPhase('landed');

                            // Mismatch check: the server already decided the
                            // authoritative slot/payout before physics ever
                            // ran (see FreeDropPlinkoGame.tsx), so this can
                            // never corrupt the result - it's purely a
                            // diagnostic signal that the exact spawn x +
                            // seed didn't reproduce the expected bin
                            // (possible in principle since the physics_seed
                            // was verified against a bucket's representative
                            // x, not necessarily byte-identical to the
                            // player's exact x - see the offline generator's
                            // header comment). Never steer/snap to "fix" it.
                            const physicalSlot = freeDropBinIndexForX(boardRef.current, ballRef.current.position.x);
                            if (physicalSlot !== winningSlotRef.current && landedContextRef.current) {
                                console.error('[FreeDrop] physics/server slot mismatch', {
                                    roundId: landedContextRef.current.roundId,
                                    dropPosition: landedContextRef.current.dropPosition,
                                    physicsSeed: landedContextRef.current.physicsSeed,
                                    expectedSlot: winningSlotRef.current,
                                    physicalSlot,
                                });
                            }

                            onLandedRef.current?.();
                        }
                    } else {
                        stableFramesRef.current = 0;
                    }
                }
                accumulatorRef.current -= FREE_DROP_FIXED_DT;
            }

            draw();
            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function draw() {
        const canvas = canvasRef.current;
        const board = boardRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !board) return;

        const { geometry } = board;
        const { cssWidth, dpr } = scaleRef.current;
        const scale = cssWidth / geometry.width;
        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
        ctx.clearRect(0, 0, geometry.width, geometry.height);

        const now = performance.now();

        // Drop rail: a dashed horizontal track across the valid drop range,
        // always visible outside the 'dropping' phase so the player can see
        // (and drag) where the next ball will spawn, even right after a
        // previous round's ball has settled.
        if (phaseRef.current !== 'dropping') {
            ctx.save();
            ctx.setLineDash([4, 5]);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(geometry.dropRangeMin, geometry.spawnY);
            ctx.lineTo(geometry.dropRangeMax, geometry.spawnY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            const previewX = dropPositionToSpawnX(geometry, dropPositionRef.current);
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.translate(previewX, geometry.spawnY);
            const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, geometry.ballRadius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.45, '#35d5ff');
            grad.addColorStop(1, '#8b3fe8');
            ctx.beginPath();
            ctx.arc(0, 0, geometry.ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.restore();
        }

        for (const peg of board.pegs) {
            const flashStart = pegFlashesRef.current.get(peg.id);
            let glow = 0;
            if (flashStart !== undefined) {
                const t = (now - flashStart) / FLASH_DURATION_MS;
                if (t < 1) glow = 1 - t;
                else pegFlashesRef.current.delete(peg.id);
            }
            const r = geometry.pegRadius;
            const { x, y } = peg.position;

            ctx.beginPath();
            ctx.ellipse(x + r * 0.28, y + r * 0.4, r * 0.95, r * 0.55, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(4, 0, 16, 0.4)';
            ctx.fill();

            const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r * 1.05);
            if (glow > 0) {
                grad.addColorStop(0, '#fff6fb');
                grad.addColorStop(0.55, `rgba(${PEG_GLOW_COLOR}, 0.9)`);
                grad.addColorStop(1, '#4a1030');
            } else {
                grad.addColorStop(0, PEG_LIGHT);
                grad.addColorStop(0.55, PEG_MID);
                grad.addColorStop(1, PEG_DARK);
            }
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            if (glow > 0) {
                ctx.shadowBlur = 14 * glow;
                ctx.shadowColor = `rgba(${PEG_GLOW_COLOR}, 1)`;
            } else {
                ctx.shadowBlur = 0;
            }
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x - r * 0.32, y - r * 0.32, r * 0.32, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        particlesRef.current = particlesRef.current.filter((p) => now - p.start < PARTICLE_DURATION_MS);
        for (const p of particlesRef.current) {
            const t = (now - p.start) / PARTICLE_DURATION_MS;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4 + t * 14, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${PARTICLE_COLOR}, ${1 - t})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (phaseRef.current === 'landed' && winningSlotRef.current !== null) {
            const cx = board.binCenters[winningSlotRef.current];
            const landedMultiplier = multipliers[winningSlotRef.current] ?? 0;
            const isNetWin = landedMultiplier >= 1;
            ctx.beginPath();
            ctx.arc(cx, board.binY, 26, 0, Math.PI * 2);
            ctx.fillStyle = isNetWin ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.16)';
            ctx.fill();
        }

        const ball = ballRef.current;
        if (ball) {
            ctx.save();
            ctx.translate(ball.position.x, ball.position.y);

            ctx.beginPath();
            ctx.arc(1.5, 2.5, geometry.ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fill();

            ctx.rotate(ball.angle);
            const grad = ctx.createRadialGradient(-3, -3, 1, 0, 0, geometry.ballRadius);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.45, '#35d5ff');
            grad.addColorStop(1, '#8b3fe8');
            ctx.beginPath();
            ctx.arc(0, 0, geometry.ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(geometry.ballRadius * 0.8, 0);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }
    }

    useImperativeHandle(ref, () => ({
        play(playRows: number, slotIndex: number, forDropPosition: number, physicsSeed: number, roundId?: number) {
            if (phaseRef.current === 'dropping') return; // guard against double-trigger
            const board = boardRef.current;
            if (!board || board.rows !== playRows) return;

            // The ball spawns at the player's EXACT chosen position - never
            // snapped to a bucket, never substituted, never a different
            // seed picked client-side. The backend already decided both the
            // authoritative slot and the physics_seed to use before this is
            // ever called (see FreeDropPlinkoGame.tsx / free_drop_services.py)
            // - this is purely a replay of that decision, using genuine
            // Matter.js physics with no steering once released.
            const spawnX = dropPositionToSpawnX(board.geometry, forDropPosition);
            landedContextRef.current = { roundId, dropPosition: forDropPosition, physicsSeed };

            if (ballRef.current) {
                Matter.Composite.remove(board.world, ballRef.current);
            }
            const ball = createFreeDropBall(board, physicsSeed, spawnX);
            Matter.Composite.add(board.world, ball);
            ballRef.current = ball;
            winningSlotRef.current = slotIndex;
            stableFramesRef.current = 0;
            pegFlashesRef.current = new Map();
            particlesRef.current = [];
            phaseRef.current = 'dropping';
            setPhase('dropping');
            setWinningSlot(slotIndex);
        },
    }));

    function logicalXFromClientX(clientX: number): number {
        const canvas = canvasRef.current;
        const board = boardRef.current;
        if (!canvas || !board) return dropPositionToSpawnX(geometry, dropPositionRef.current);
        const rect = canvas.getBoundingClientRect();
        const { cssWidth } = scaleRef.current;
        const scale = cssWidth / board.geometry.width;
        return (clientX - rect.left) / scale;
    }

    function updateFromClientX(clientX: number) {
        const board = boardRef.current;
        if (!board) return;
        const x = logicalXFromClientX(clientX);
        const clamped = Math.max(board.geometry.dropRangeMin, Math.min(board.geometry.dropRangeMax, x));
        onDropPositionChange(spawnXToDropPosition(board.geometry, clamped));
    }

    function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
        if (dragDisabled || phaseRef.current === 'dropping') return;
        unlockAudio();
        draggingRef.current = true;
        pointerIdRef.current = event.pointerId;
        railRef.current?.setPointerCapture(event.pointerId);
        updateFromClientX(event.clientX);
    }

    function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
        if (!draggingRef.current || pointerIdRef.current !== event.pointerId) return;
        updateFromClientX(event.clientX);
    }

    function endDrag(event: React.PointerEvent<HTMLDivElement>) {
        if (pointerIdRef.current !== event.pointerId) return;
        draggingRef.current = false;
        pointerIdRef.current = null;
        if (railRef.current?.hasPointerCapture(event.pointerId)) {
            railRef.current.releasePointerCapture(event.pointerId);
        }
    }

    const trayTopPercent = (geometry.trayTop / geometry.height) * 100;
    const trayHeightPercent = (geometry.trayHeight / geometry.height) * 100;
    // Covers from the top edge down through the spawn line, with a little
    // breathing room below it - just the zone where dragging makes sense,
    // not the whole board (the peg field below stays click-through).
    const railHeightPercent = ((geometry.spawnY + geometry.ballRadius + 10) / geometry.height) * 100;

    return (
        <div className={styles.board} style={{ aspectRatio: geometry.aspectRatio }} onPointerDown={unlockAudio}>
            <canvas ref={canvasRef} className={styles.canvas} />
            <div
                ref={railRef}
                className={`${styles.dropRail} ${dragDisabled || phase === 'dropping' ? styles.dropRailDisabled : ''}`}
                style={{ height: `${railHeightPercent}%` }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                role="slider"
                aria-label="Drop position"
                aria-valuemin={-1}
                aria-valuemax={1}
                aria-valuenow={Math.round(dropPosition * 100) / 100}
                aria-disabled={dragDisabled || phase === 'dropping'}
            />
            <div className={styles.tray} style={{ top: `${trayTopPercent}%`, height: `${trayHeightPercent}%` }}>
                {geometry.binLayout.map((bin, idx) => {
                    const multiplier = multipliers[idx] ?? 0;
                    const isLanded = phase === 'landed' && winningSlot === idx;
                    const landedClass = isLanded ? (multiplier >= 1 ? styles.slotWon : styles.slotLost) : '';
                    const leftPercent = (bin.left / geometry.width) * 100;
                    const widthPercent = (bin.width / geometry.width) * 100;
                    return (
                        <div
                            key={idx}
                            className={`${styles.slot} ${styles[`tier-${tierForMultiplier(multiplier)}`]} ${landedClass}`}
                            style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                        >
                            {multiplier}x
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
