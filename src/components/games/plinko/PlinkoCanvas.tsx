'use client';

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import {
    FIXED_DT,
    LOGICAL_WIDTH,
    PlinkoBoard,
    buildBoard,
    computeBoardGeometry,
    createBall,
    isNearRestInBin,
} from './physics';
import { PLINKO_SEED_TABLE } from './plinkoSeedTable';
import { playPegHit, unlockAudio } from './audio';
import styles from './PlinkoCanvas.module.css';

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

export interface PlinkoCanvasHandle {
    play: (rows: number, slotIndex: number) => void;
}

interface PlinkoCanvasProps {
    rows: number;
    multipliers: number[];
    onLanded?: () => void;
}

function tierForMultiplier(multiplier: number): 'extreme' | 'high' | 'mid' | 'low' {
    if (multiplier >= 10) return 'extreme';
    if (multiplier >= 3) return 'high';
    if (multiplier >= 1) return 'mid';
    return 'low';
}

export const PlinkoCanvas = forwardRef<PlinkoCanvasHandle, PlinkoCanvasProps>(function PlinkoCanvas({ rows, multipliers, onLanded }, ref) {
    const [phase, setPhase] = useState<'idle' | 'dropping' | 'landed'>('idle');
    const [winningSlot, setWinningSlot] = useState<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const boardRef = useRef<PlinkoBoard | null>(null);
    const ballRef = useRef<Matter.Body | null>(null);
    const phaseRef = useRef<'idle' | 'dropping' | 'landed'>('idle');
    const winningSlotRef = useRef<number | null>(null);
    const stableFramesRef = useRef(0);
    const pegFlashesRef = useRef<Map<number, number>>(new Map());
    const particlesRef = useRef<Particle[]>([]);
    const rafRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const accumulatorRef = useRef(0);
    const scaleRef = useRef({ cssWidth: LOGICAL_WIDTH, dpr: 1 });
    const geometry = computeBoardGeometry(rows);
    const aspectRef = useRef(geometry.aspectRatio);
    aspectRef.current = geometry.aspectRatio;
    const onLandedRef = useRef(onLanded);
    onLandedRef.current = onLanded;

    // Rebuild the physics world whenever the row count changes. Collision
    // listener drives peg flash/particle/sound purely from real Matter.js
    // collisionStart events - never from timers or estimated positions.
    useEffect(() => {
        const board = buildBoard(rows);
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

    // Measures the wrapping column and sizes the canvas bitmap for the
    // device pixel ratio. The board's own CSS box already follows the
    // row-count-specific aspect ratio (set via inline style below); this
    // just letterboxes safely if the parent flex column further constrains
    // available height/width, and re-runs whenever that box's measured size
    // changes (including when the aspect ratio itself changes on a rows switch).
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

    // Fixed-timestep physics stepping decoupled from the render frame rate -
    // required so an offline-verified seed reproduces the exact same landing
    // bin regardless of the viewer's actual monitor refresh rate/jank.
    useEffect(() => {
        const tick = (now: number) => {
            if (lastTimeRef.current === null) lastTimeRef.current = now;
            const delta = Math.min(now - lastTimeRef.current, 100);
            lastTimeRef.current = now;
            accumulatorRef.current += delta;

            while (accumulatorRef.current >= FIXED_DT) {
                if (phaseRef.current === 'dropping' && boardRef.current && ballRef.current) {
                    Matter.Engine.update(boardRef.current.engine, FIXED_DT);
                    if (isNearRestInBin(boardRef.current, ballRef.current)) {
                        stableFramesRef.current += 1;
                        if (stableFramesRef.current > SETTLE_STABLE_FRAMES) {
                            phaseRef.current = 'landed';
                            setPhase('landed');
                            onLandedRef.current?.();
                        }
                    } else {
                        stableFramesRef.current = 0;
                    }
                }
                accumulatorRef.current -= FIXED_DT;
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

        // Idle drop-point guide: dashed line from the top edge down to the
        // launch position, plus a hollow ring marking exactly where the ball
        // appears - keeps the launcher visually connected to the peg
        // triangle with no dead space, and no separate decorative chrome.
        if (!ballRef.current && phaseRef.current !== 'dropping') {
            ctx.save();
            ctx.setLineDash([4, 5]);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(geometry.width / 2, 2);
            ctx.lineTo(geometry.width / 2, geometry.spawnY - geometry.ballRadius - 4);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(geometry.width / 2, geometry.spawnY, geometry.ballRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(53, 213, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Pegs drawn as physical 3D pins (cast shadow + cylindrical body + rim
        // highlight), not flat discs - glow is a delay-free reaction to real
        // collision events, never a timer/waypoint estimate.
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

            // Cast shadow on the board surface - reads as a pin standing proud of the board, not a sticker on it.
            ctx.beginPath();
            ctx.ellipse(x + r * 0.28, y + r * 0.4, r * 0.95, r * 0.55, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(4, 0, 16, 0.4)';
            ctx.fill();

            // Cylindrical body: highlight near the top-left light source fading to a dark rim.
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

            // Small specular dot for extra shine.
            ctx.beginPath();
            ctx.arc(x - r * 0.32, y - r * 0.32, r * 0.32, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Peg-hit particles - lightweight expanding rings, no library.
        particlesRef.current = particlesRef.current.filter((p) => now - p.start < PARTICLE_DURATION_MS);
        for (const p of particlesRef.current) {
            const t = (now - p.start) / PARTICLE_DURATION_MS;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4 + t * 14, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${PARTICLE_COLOR}, ${1 - t})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Landed-bin highlight - cosmetic only, the actual result already
        // came from the server. Colored by whether this slot's multiplier
        // is actually a net win (>=1x) or a loss (<1x) - a flat celebratory
        // color regardless of outcome made every landing look like a win.
        if (phaseRef.current === 'landed' && winningSlotRef.current !== null) {
            const cx = board.binCenters[winningSlotRef.current];
            const landedMultiplier = multipliers[winningSlotRef.current] ?? 0;
            const isNetWin = landedMultiplier >= 1;
            ctx.beginPath();
            ctx.arc(cx, board.binY, 26, 0, Math.PI * 2);
            ctx.fillStyle = isNetWin ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.16)';
            ctx.fill();
        }

        // Ball: rotation from real angular velocity, soft drop shadow, glossy highlight.
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
        play(playRows: number, slotIndex: number) {
            if (phaseRef.current === 'dropping') return; // guard against double-trigger
            const board = boardRef.current;
            if (!board || board.rows !== playRows) return;

            const seeds = PLINKO_SEED_TABLE[playRows]?.[slotIndex];
            const seed = seeds && seeds.length > 0 ? seeds[Math.floor(Math.random() * seeds.length)] : 1;

            if (ballRef.current) {
                Matter.Composite.remove(board.world, ballRef.current);
            }
            const ball = createBall(board, seed);
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

    const trayTopPercent = (geometry.trayTop / geometry.height) * 100;
    const trayHeightPercent = (geometry.trayHeight / geometry.height) * 100;

    return (
        <div className={styles.board} style={{ aspectRatio: geometry.aspectRatio }} onPointerDown={unlockAudio}>
            <canvas ref={canvasRef} className={styles.canvas} />
            <div className={styles.tray} style={{ top: `${trayTopPercent}%`, height: `${trayHeightPercent}%` }}>
                {geometry.binLayout.map((bin, idx) => {
                    const multiplier = multipliers[idx] ?? 0;
                    const isLanded = phase === 'landed' && winningSlot === idx;
                    // A landed slot below 1x is a real loss - it must not
                    // get the same bright celebratory pulse as a win, or
                    // every landing looks like a win regardless of outcome.
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
