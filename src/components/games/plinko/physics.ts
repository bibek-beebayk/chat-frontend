/**
 * Shared Plinko board/physics setup - the single source of truth imported by
 * BOTH the offline seed-generator script (scripts/generate-plinko-seeds.ts,
 * run under `tsx` in Node) and the runtime browser component
 * (PlinkoCanvas.tsx). A seed verified offline only reliably reproduces the
 * same landing bin in the browser if every parameter here - peg positions,
 * restitution/friction, gravity, jitter range, even the fixed timestep - is
 * byte-for-byte identical between the two call sites. Never fork this logic.
 *
 * Coordinates are in a fixed "logical" board space (LOGICAL_WIDTH wide x a
 * row-count-dependent height), not real screen pixels - the renderer scales
 * this logical space to whatever the actual canvas size is. Board geometry
 * (peg/ball radius, spacing, bin layout, aspect ratio) is derived entirely
 * from the row count via computeBoardGeometry() below, so 8/12/16-row boards
 * are each purpose-built rather than a fixed 16-row layout with rows removed.
 */
import Matter from 'matter-js';

export const LOGICAL_WIDTH = 600;

const PEG_RESTITUTION = 0.5;
const PEG_FRICTION = 0.05;
const BALL_RESTITUTION = 0.5;
const BALL_FRICTION = 0.02;
const BALL_FRICTION_AIR = 0.001;
const LAUNCH_JITTER = 4; // logical units, +/- half this range around center

export const FIXED_DT = 1000 / 60; // ms per physics step - must match offline generator exactly

// Only 8 rows is offered for now (12/16 disabled at the product level, not
// removed - the geometry below still scales generically by row count, and
// the offline seed generator still supports any of these if re-enabled).
export const ROWS_OPTIONS = [8] as const;
export type PlinkoRowsOption = (typeof ROWS_OPTIONS)[number];

const ROWS_MIN = 8;
const ROWS_MAX = 16;

/** Linear interpolation of a value between the min and max row counts - the core knob for "purpose-built per row count" rather than one fixed layout. */
function lerpByRows(rows: number, atMin: number, atMax: number): number {
    const clamped = Math.max(ROWS_MIN, Math.min(ROWS_MAX, rows));
    const t = (clamped - ROWS_MIN) / (ROWS_MAX - ROWS_MIN);
    return atMin + (atMax - atMin) * t;
}

const TRAY_GAP = 46; // constant gap between the final peg row and the bin tray, regardless of row count - keeps the tray visually attached instead of the old row-count-dependent gap
const TRAY_BAND = 60; // vertical extent of the divider bodies / bin tray zone
const FLOOR_GAP = 55; // distance from binY down to the floor body
const FLOOR_THICKNESS = 20;
const BOTTOM_PADDING = 18;

export interface BoardGeometry {
    rows: number;
    width: number;
    height: number;
    aspectRatio: number;
    pegRadius: number;
    ballRadius: number;
    spawnY: number;
    topMargin: number;
    rowSpacing: number;
    pegSpacing: number;
    lastRowHalfWidth: number;
    numSlots: number;
    slotWidth: number;
    binY: number;
    floorY: number;
    /** Vertical extent (logical units) of the multiplier tray band, for rendering the DOM tray to line up with the divider bodies. */
    trayTop: number;
    trayHeight: number;
    binCenters: number[];
    /** Left edge x + width (logical units) of each bin, for rendering contiguous equal-width tray cells. */
    binLayout: { left: number; width: number; center: number }[];
    dividerXs: number[];
}

/**
 * Pure geometry, no Matter.js bodies - the single source of truth reused by
 * buildBoard() and by DOM layout (multiplier tray cells, canvas aspect
 * ratio). Every dimension is derived from `rows` so each row count gets a
 * board purpose-built for it: fewer rows -> bigger pegs/ball and more
 * spacing, more rows -> smaller/tighter to fit cleanly, while the peg
 * triangle always fills the board consistently (no leftover dead space).
 */
export function computeBoardGeometry(rows: number): BoardGeometry {
    const width = LOGICAL_WIDTH;

    const pegRadius = lerpByRows(rows, 7, 4.5);
    const ballRadius = lerpByRows(rows, 12, 8);

    const spawnY = ballRadius + 20;
    const dropGap = 34;
    const topMargin = spawnY + dropGap;

    // Total vertical span from the first to the last peg row - lets the
    // triangle grow slightly taller for denser boards while staying
    // proportionate for sparse ones (not a constant that leaves 8 rows
    // squashed into the upper half of the board).
    const triangleSpan = lerpByRows(rows, 430, 520);
    const rowSpacing = triangleSpan / (rows - 1);

    // The tray (numSlots = rows+1 bins, each one pegSpacing wide) is what
    // has to fit the canvas width - it's wider than the last peg row's own
    // span by one pegSpacing on each side (the two bins that catch the ball
    // falling outside the outermost pegs). Sizing pegSpacing from the peg
    // span alone (ignoring those two extra half-bins) let the tray overflow
    // the canvas; sizing it from the full tray span instead keeps everything
    // on-canvas at every row count.
    const numSlots = rows + 1;
    const traySpan = 0.86 * width;
    const pegSpacing = traySpan / numSlots;

    // Bin width is exactly the peg-to-peg pitch of the last row, not an
    // independently tuned value - a ball dropped through the pegs lands in
    // one of (rows - 1) interior gaps between adjacent last-row pegs, plus
    // the two gaps outside the outermost pegs, giving rows+1 bins each
    // exactly one pegSpacing wide. This guarantees every divider sits
    // exactly beneath the peg directly above it (proven below), instead of
    // drifting out of alignment toward the edges the way an independently
    // sized tray would.
    const slotWidth = pegSpacing;
    // The walls are invisible physics-only bodies (never drawn), so their
    // inner face sits flush with the tray's own outer edge - not pushed out
    // further "for ball clearance". A margin here used to leave a dead zone
    // beyond the last bin wide enough for the ball to visibly rest in, with
    // no tray cell drawn under it at all (the reported bug: the ball landed
    // outside the last tray while the payout - correctly clamped to that
    // slot - still paid out as if it had landed inside it).
    const lastRowHalfWidth = traySpan / 2;

    const binY = topMargin + triangleSpan + TRAY_GAP;
    const floorY = binY + FLOOR_GAP;
    const height = floorY + FLOOR_THICKNESS / 2 + BOTTOM_PADDING;
    const trayTop = binY - TRAY_BAND / 2;
    const trayHeight = floorY - trayTop;

    const binCenters: number[] = [];
    const binLayout: BoardGeometry['binLayout'] = [];
    const dividerXs: number[] = [];
    for (let k = 0; k < numSlots; k += 1) {
        const left = width / 2 - lastRowHalfWidth + k * slotWidth;
        const center = left + slotWidth / 2;
        binCenters.push(center);
        binLayout.push({ left, width: slotWidth, center });
    }
    for (let k = 0; k <= numSlots; k += 1) {
        dividerXs.push(width / 2 - lastRowHalfWidth + k * slotWidth);
    }

    return {
        rows,
        width,
        height,
        aspectRatio: width / height,
        pegRadius,
        ballRadius,
        spawnY,
        topMargin,
        rowSpacing,
        pegSpacing,
        lastRowHalfWidth,
        numSlots,
        slotWidth,
        binY,
        floorY,
        trayTop,
        trayHeight,
        binCenters,
        binLayout,
        dividerXs,
    };
}

/** Deterministic seeded PRNG (mulberry32) - same output on every platform, unlike Math.random(). */
export function createRng(seed: number): () => number {
    let a = seed >>> 0;
    return function rng() {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export interface PlinkoBoard {
    engine: Matter.Engine;
    world: Matter.World;
    pegs: Matter.Body[];
    rows: number;
    geometry: BoardGeometry;
    rowSpacing: number;
    pegSpacing: number;
    binCenters: number[];
    binY: number;
    lastRowHalfWidth: number;
}

export function buildBoard(rows: number): PlinkoBoard {
    const engine = Matter.Engine.create();
    engine.gravity.y = 1;
    const world = engine.world;

    const geometry = computeBoardGeometry(rows);
    const { width, height, pegRadius, topMargin, rowSpacing, pegSpacing, lastRowHalfWidth, binY, floorY, binCenters, dividerXs } = geometry;

    const pegs: Matter.Body[] = [];
    for (let i = 0; i < rows; i += 1) {
        const pegCount = i + 1;
        const y = topMargin + i * rowSpacing;
        for (let j = 0; j < pegCount; j += 1) {
            const x = width / 2 + (j - (pegCount - 1) / 2) * pegSpacing;
            const peg = Matter.Bodies.circle(x, y, pegRadius, {
                isStatic: true,
                restitution: PEG_RESTITUTION,
                friction: PEG_FRICTION,
                label: 'peg',
            });
            pegs.push(peg);
        }
    }
    Matter.Composite.add(world, pegs);

    const wallLeft = Matter.Bodies.rectangle(width / 2 - lastRowHalfWidth - 10, height / 2, 20, height, {
        isStatic: true,
        label: 'wall',
    });
    const wallRight = Matter.Bodies.rectangle(width / 2 + lastRowHalfWidth + 10, height / 2, 20, height, {
        isStatic: true,
        label: 'wall',
    });

    const floor = Matter.Bodies.rectangle(width / 2, floorY, width, FLOOR_THICKNESS, { isStatic: true, label: 'floor' });

    const dividers: Matter.Body[] = dividerXs.map((x) =>
        Matter.Bodies.rectangle(x, binY, 4, TRAY_BAND, { isStatic: true, label: 'divider' })
    );
    Matter.Composite.add(world, [wallLeft, wallRight, floor, ...dividers]);

    return { engine, world, pegs, rows, geometry, rowSpacing, pegSpacing, binCenters, binY, lastRowHalfWidth };
}

/** Drops a fresh ball body (seeded launch jitter) into the board's world, sized/positioned for that board's row count. Does not add it - caller adds so it can attach collision listeners first if needed. */
export function createBall(board: PlinkoBoard, seed: number): Matter.Body {
    const rng = createRng(seed);
    const jitter = (rng() - 0.5) * LAUNCH_JITTER;
    const { width, ballRadius, spawnY } = board.geometry;
    return Matter.Bodies.circle(width / 2 + jitter, spawnY, ballRadius, {
        restitution: BALL_RESTITUTION,
        friction: BALL_FRICTION,
        frictionAir: BALL_FRICTION_AIR,
        label: 'ball',
    });
}

/** Which of the rows+1 bins a ball's current x position falls into. */
export function binIndexForX(board: PlinkoBoard, x: number): number {
    const numSlots = board.rows + 1;
    const slotWidth = (2 * board.lastRowHalfWidth) / numSlots;
    let slot = Math.floor((x - (LOGICAL_WIDTH / 2 - board.lastRowHalfWidth)) / slotWidth);
    return Math.max(0, Math.min(numSlots - 1, slot));
}

/**
 * True once the ball has come to rest inside the bin region. Caller tracks
 * `stableFrames` across calls (one call per physics step) and should treat
 * a run of ~15 consecutive true results as "settled" - a single low-speed
 * frame isn't enough (the ball can still be mid-bounce).
 */
export function isNearRestInBin(board: PlinkoBoard, ball: Matter.Body): boolean {
    if (ball.position.y <= board.binY - 20) return false;
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    return speed < 0.15;
}

/** Fast-forwarded simulation with no rendering - used only by the offline generator. */
export function simulateToSettledSlot(rows: number, seed: number, maxSteps = 1200): number {
    const board = buildBoard(rows);
    const ball = createBall(board, seed);
    Matter.Composite.add(board.world, ball);

    let stableFrames = 0;
    for (let step = 0; step < maxSteps; step += 1) {
        Matter.Engine.update(board.engine, FIXED_DT);
        if (isNearRestInBin(board, ball)) {
            stableFrames += 1;
            if (stableFrames > 15) break;
        } else {
            stableFrames = 0;
        }
    }

    return binIndexForX(board, ball.position.x);
}
