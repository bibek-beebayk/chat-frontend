/**
 * Free Drop's dedicated board/physics geometry - independent from Classic's
 * physics.ts (see that file's own header comment for why forking geometry
 * per mode, rather than branching one calculator, is intentional here: the
 * two boards have genuinely different peg layouts and must stay free to
 * diverge without risking Classic's already-verified geometry).
 *
 * Mirrors physics.ts's conventions closely (fixed logical board space,
 * row-count-driven sizing, offline-seed-friendly determinism) but the peg
 * layout is an equal-pegs-per-row grid with alternating stagger instead of
 * a triangle, and there's an extra dimension: the player's chosen
 * horizontal drop position, which becomes the ball's actual spawn x.
 *
 * The landing slot itself is decided server-side, from the REAL empirical
 * distribution of outcomes this geometry produces (see
 * scripts/generate-free-drop-physics-table.ts, which runs this exact module
 * many times per drop-position bucket and ships the result to the Django
 * backend as free_drop_physics_table.json - free_drop_services.py picks a
 * slot and a verified physics_seed from that data, and the frontend just
 * replays that seed at the player's exact drop position, no bucket
 * resolution or snapping at runtime).
 */
import Matter from 'matter-js';
import { createRng } from './shared/rng';

export const FREE_DROP_LOGICAL_WIDTH = 600;

const PEG_RESTITUTION = 0.5;
const PEG_FRICTION = 0.05;
const BALL_RESTITUTION = 0.5;
const BALL_FRICTION = 0.02;
const BALL_FRICTION_AIR = 0.001;
// Deterministic (seed-derived) initial motion, NOT a position offset - the
// ball's spawn x must always be exactly the player's chosen/authoritative
// position, never nudged. These substitute for the horizontal spawn jitter
// this used to apply directly to x (removed: it silently moved the ball
// away from the position the player actually selected).
const INITIAL_VX_JITTER = 0.6; // logical units/step, +/- half this range
const INITIAL_ANGULAR_VELOCITY_JITTER = 0.06; // rad/step, +/- half this range

export const FREE_DROP_FIXED_DT = 1000 / 60; // must match offline generator exactly

// Only 8 rows for now, matching Classic's current restriction and the
// backend's FREE_DROP_ROWS_CHOICES - structured to extend to 12/16 later.
export const FREE_DROP_ROWS_OPTIONS = [8] as const;
export type FreeDropRowsOption = (typeof FREE_DROP_ROWS_OPTIONS)[number];

// Mirrors plinko/free_drop_constants.py's PEGS_PER_ROW exactly - every row
// has this many pegs. Deliberately equal to `rows`, not an independently
// chosen number: see that file's comment for the full reasoning (the
// outcome model's rows+1 possible slots is what the last peg row's count
// has to support, exactly like Classic's triangular board).
const PEGS_PER_ROW: Record<number, number> = { 8: 8 };

export function getPegsPerRow(rows: number): number {
    return PEGS_PER_ROW[rows] ?? rows;
}

const ROWS_MIN = 8;
const ROWS_MAX = 16;

function lerpByRows(rows: number, atMin: number, atMax: number): number {
    const clamped = Math.max(ROWS_MIN, Math.min(ROWS_MAX, rows));
    const t = (clamped - ROWS_MIN) / (ROWS_MAX - ROWS_MIN);
    return atMin + (atMax - atMin) * t;
}

const TRAY_GAP = 46;
const TRAY_BAND = 60;
const FLOOR_GAP = 55;
const FLOOR_THICKNESS = 20;
const BOTTOM_PADDING = 18;
// Extra inset (beyond the ball's own radius) the valid drop range keeps from
// the walls, so the ball never visually touches/overlaps a wall while
// parked at the extreme ends of the drag rail.
const DROP_RANGE_WALL_MARGIN = 14;

export interface FreeDropBoardGeometry {
    rows: number;
    pegsPerRow: number;
    width: number;
    height: number;
    aspectRatio: number;
    pegRadius: number;
    ballRadius: number;
    spawnY: number;
    topMargin: number;
    rowSpacing: number;
    hSpacing: number;
    stagger: number;
    /** Half-extent of the tray span - walls sit flush with this, same convention as Classic's lastRowHalfWidth. */
    wallHalfWidth: number;
    /** Half-extent of the widest peg row (including stagger) - the valid drop range is bounded by this, not by the (wider) walls, so a spawn position always has real pegs to either side. */
    pegFieldHalfWidth: number;
    numSlots: number;
    slotWidth: number;
    binY: number;
    floorY: number;
    trayTop: number;
    trayHeight: number;
    binCenters: number[];
    binLayout: { left: number; width: number; center: number }[];
    dividerXs: number[];
    /** Valid horizontal spawn range (logical x, inclusive) - the drag UI and backend-independent frontend clamp both use this. */
    dropRangeMin: number;
    dropRangeMax: number;
}

/**
 * Pure geometry, no Matter.js bodies. Reuses Classic's tray/divider/slot
 * math verbatim (numSlots = rows+1, slotWidth sized off the full tray span)
 * since that's the same outcome-model requirement in both modes - only the
 * peg layout above the tray differs.
 */
export function computeFreeDropBoardGeometry(rows: number): FreeDropBoardGeometry {
    const width = FREE_DROP_LOGICAL_WIDTH;
    const pegsPerRow = getPegsPerRow(rows);

    const pegRadius = lerpByRows(rows, 7, 4.5);
    const ballRadius = lerpByRows(rows, 12, 8);

    const spawnY = ballRadius + 20;
    const dropGap = 34;
    const topMargin = spawnY + dropGap;

    const triangleSpan = lerpByRows(rows, 430, 520);
    const rowSpacing = triangleSpan / (rows - 1);

    const numSlots = rows + 1;
    const traySpan = 0.86 * width;
    const slotWidth = traySpan / numSlots;
    const wallHalfWidth = traySpan / 2;

    // Equal-column peg spacing derived from the same tray pitch as the
    // slots, so pegs and dividers share a consistent rhythm across the
    // board (not a coincidence - it's the same "divider = peg position"
    // alignment principle already proven for Classic, just applied to a
    // grid instead of a triangle).
    const hSpacing = slotWidth;
    const stagger = hSpacing / 2;

    // Half-extent of the widest row *including* the stagger. Rows alternate
    // +/-stagger/2 (not a one-sided +stagger shift - see buildFreeDropBoard)
    // so the peg field stays centered on the board instead of drifting
    // toward one wall.
    const pegFieldHalfWidth = ((pegsPerRow - 1) / 2) * hSpacing + stagger / 2;

    const binY = topMargin + triangleSpan + TRAY_GAP;
    const floorY = binY + FLOOR_GAP;
    const height = floorY + FLOOR_THICKNESS / 2 + BOTTOM_PADDING;
    const trayTop = binY - TRAY_BAND / 2;
    const trayHeight = floorY - trayTop;

    const binCenters: number[] = [];
    const binLayout: FreeDropBoardGeometry['binLayout'] = [];
    const dividerXs: number[] = [];
    for (let k = 0; k < numSlots; k += 1) {
        const left = width / 2 - wallHalfWidth + k * slotWidth;
        const center = left + slotWidth / 2;
        binCenters.push(center);
        binLayout.push({ left, width: slotWidth, center });
    }
    for (let k = 0; k <= numSlots; k += 1) {
        dividerXs.push(width / 2 - wallHalfWidth + k * slotWidth);
    }

    // Bounded by the peg field itself, not the (wider) walls - a spawn
    // position beyond the outermost peg column falls straight down with no
    // pegs to either side to bounce off, producing an almost-zero-variance
    // drop that can't reach most slots (this was a real bug caught by the
    // offline seed generator failing to find seeds for bucket 0).
    const dropRangeMin = width / 2 - pegFieldHalfWidth + ballRadius + DROP_RANGE_WALL_MARGIN;
    const dropRangeMax = width / 2 + pegFieldHalfWidth - ballRadius - DROP_RANGE_WALL_MARGIN;

    return {
        rows,
        pegsPerRow,
        width,
        height,
        aspectRatio: width / height,
        pegRadius,
        ballRadius,
        spawnY,
        topMargin,
        rowSpacing,
        hSpacing,
        stagger,
        wallHalfWidth,
        pegFieldHalfWidth,
        numSlots,
        slotWidth,
        binY,
        floorY,
        trayTop,
        trayHeight,
        binCenters,
        binLayout,
        dividerXs,
        dropRangeMin,
        dropRangeMax,
    };
}

// Mirrors plinko/free_drop_constants.py's DROP_BUCKETS exactly - the
// continuous drag position is snapped to one of these buckets *only* for
// picking a pre-verified offline physics seed (and a matching spawn x to
// replay it with); the value actually sent to the backend for the economic
// outcome is always the exact continuous drop_position, never bucketed. Odd
// so there's a true center bucket.
export const FREE_DROP_DROP_BUCKETS = 15;

/** Nearest discrete bucket index [0, FREE_DROP_DROP_BUCKETS) for a continuous drop_position - used only for seed-table lookup. */
export function bucketIndexForDropPosition(dropPosition: number): number {
    const clamped = Math.max(-1, Math.min(1, dropPosition));
    const t = (clamped + 1) / 2;
    return Math.round(t * (FREE_DROP_DROP_BUCKETS - 1));
}

/** The exact drop_position a given bucket index represents - used to resolve the matching spawn x an offline-verified seed was found for. */
export function dropPositionForBucketIndex(bucketIndex: number): number {
    return -1 + (bucketIndex / (FREE_DROP_DROP_BUCKETS - 1)) * 2;
}

/** Maps a normalized drop_position in [-1, 1] to a logical spawn x within the valid drop range. */
export function dropPositionToSpawnX(geometry: FreeDropBoardGeometry, dropPosition: number): number {
    const clamped = Math.max(-1, Math.min(1, dropPosition));
    const mid = (geometry.dropRangeMin + geometry.dropRangeMax) / 2;
    const halfRange = (geometry.dropRangeMax - geometry.dropRangeMin) / 2;
    return mid + clamped * halfRange;
}

/** Inverse of dropPositionToSpawnX - used to convert a drag gesture's logical x back into the normalized value sent to the backend. */
export function spawnXToDropPosition(geometry: FreeDropBoardGeometry, spawnX: number): number {
    const mid = (geometry.dropRangeMin + geometry.dropRangeMax) / 2;
    const halfRange = (geometry.dropRangeMax - geometry.dropRangeMin) / 2;
    const clampedX = Math.max(geometry.dropRangeMin, Math.min(geometry.dropRangeMax, spawnX));
    const normalized = halfRange === 0 ? 0 : (clampedX - mid) / halfRange;
    // Belt-and-suspenders: the math above should already stay within
    // [-1, 1] exactly, but floating-point rounding can occasionally produce
    // e.g. -1.0000000000000002, which fails the backend's [-1, 1] range
    // validation with a confusing error for a drop the player placed
    // legitimately at the extreme edge.
    return Math.max(-1, Math.min(1, normalized));
}

export interface FreeDropBoard {
    engine: Matter.Engine;
    world: Matter.World;
    pegs: Matter.Body[];
    rows: number;
    geometry: FreeDropBoardGeometry;
    rowSpacing: number;
    hSpacing: number;
    binCenters: number[];
    binY: number;
    wallHalfWidth: number;
}

export function buildFreeDropBoard(rows: number): FreeDropBoard {
    const engine = Matter.Engine.create();
    engine.gravity.y = 1;
    const world = engine.world;

    const geometry = computeFreeDropBoardGeometry(rows);
    const { width, height, pegRadius, pegsPerRow, topMargin, rowSpacing, hSpacing, stagger, wallHalfWidth, binY, floorY, binCenters, dividerXs } = geometry;

    const pegs: Matter.Body[] = [];
    for (let i = 0; i < rows; i += 1) {
        const y = topMargin + i * rowSpacing;
        // Centered +/-stagger/2 (not a one-sided +stagger shift) so the
        // peg field as a whole stays symmetric around the board center -
        // see pegFieldHalfWidth's comment in computeFreeDropBoardGeometry.
        const offset = i % 2 === 1 ? stagger / 2 : -stagger / 2;
        for (let j = 0; j < pegsPerRow; j += 1) {
            const x = width / 2 + (j - (pegsPerRow - 1) / 2) * hSpacing + offset;
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

    const wallLeft = Matter.Bodies.rectangle(width / 2 - wallHalfWidth - 10, height / 2, 20, height, {
        isStatic: true,
        label: 'wall',
    });
    const wallRight = Matter.Bodies.rectangle(width / 2 + wallHalfWidth + 10, height / 2, 20, height, {
        isStatic: true,
        label: 'wall',
    });

    const floor = Matter.Bodies.rectangle(width / 2, floorY, width, FLOOR_THICKNESS, { isStatic: true, label: 'floor' });

    const dividers: Matter.Body[] = dividerXs.map((x) =>
        Matter.Bodies.rectangle(x, binY, 4, TRAY_BAND, { isStatic: true, label: 'divider' })
    );
    Matter.Composite.add(world, [wallLeft, wallRight, floor, ...dividers]);

    return { engine, world, pegs, rows, geometry, rowSpacing, hSpacing, binCenters, binY, wallHalfWidth };
}

/**
 * Drops a fresh ball body at the player-chosen spawn x (clamped to the
 * valid drop range) with a small seeded jitter - unlike Classic's fixed
 * center spawn, spawnX here is genuine player input, not cosmetic. Does not
 * add it to the world - caller adds so it can attach collision listeners
 * first if needed.
 */
export function createFreeDropBall(board: FreeDropBoard, seed: number, spawnX: number): Matter.Body {
    const rng = createRng(seed);
    const { ballRadius, spawnY, dropRangeMin, dropRangeMax } = board.geometry;
    // spawnX is the authoritative position (either the player's exact
    // drop_position resolved to logical x, or - during offline table
    // generation - a bucket's representative x) - it is used exactly as
    // given, never offset. Clamping here only guards against float noise
    // at the extreme ends of the valid range, not a meaningful adjustment.
    const clampedX = Math.max(dropRangeMin, Math.min(dropRangeMax, spawnX));
    const ball = Matter.Bodies.circle(clampedX, spawnY, ballRadius, {
        restitution: BALL_RESTITUTION,
        friction: BALL_FRICTION,
        frictionAir: BALL_FRICTION_AIR,
        label: 'ball',
    });
    // Deterministic (seed-derived) initial velocity/spin substitutes for
    // the old horizontal spawn-position jitter - real trajectory variation
    // without ever moving the ball off its authoritative starting x.
    const vx = (rng() - 0.5) * INITIAL_VX_JITTER;
    const angularVelocity = (rng() - 0.5) * INITIAL_ANGULAR_VELOCITY_JITTER;
    Matter.Body.setVelocity(ball, { x: vx, y: 0 });
    Matter.Body.setAngularVelocity(ball, angularVelocity);
    return ball;
}

/** Which of the rows+1 bins a ball's current x position falls into. */
export function freeDropBinIndexForX(board: FreeDropBoard, x: number): number {
    const numSlots = board.rows + 1;
    const slotWidth = (2 * board.wallHalfWidth) / numSlots;
    const slot = Math.floor((x - (FREE_DROP_LOGICAL_WIDTH / 2 - board.wallHalfWidth)) / slotWidth);
    return Math.max(0, Math.min(numSlots - 1, slot));
}

/**
 * True once the ball has come to rest inside the bin region. Caller tracks
 * `stableFrames` across calls (one call per physics step) and should treat
 * a run of ~15 consecutive true results as "settled".
 */
export function isFreeDropNearRestInBin(board: FreeDropBoard, ball: Matter.Body): boolean {
    if (ball.position.y <= board.binY - 20) return false;
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    return speed < 0.15;
}

/** Fast-forwarded simulation with no rendering - used only by the offline generator. */
export function simulateFreeDropToSettledSlot(rows: number, seed: number, spawnX: number, maxSteps = 1200): number {
    const board = buildFreeDropBoard(rows);
    const ball = createFreeDropBall(board, seed, spawnX);
    Matter.Composite.add(board.world, ball);

    let stableFrames = 0;
    for (let step = 0; step < maxSteps; step += 1) {
        Matter.Engine.update(board.engine, FREE_DROP_FIXED_DT);
        if (isFreeDropNearRestInBin(board, ball)) {
            stableFrames += 1;
            if (stableFrames > 15) break;
        } else {
            stableFrames = 0;
        }
    }

    return freeDropBinIndexForX(board, ball.position.x);
}
