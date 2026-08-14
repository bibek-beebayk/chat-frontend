/**
 * Offline generator for Free Drop's physically-reachable outcome
 * distribution - the authoritative source the DJANGO BACKEND uses to pick
 * (slot_index, physics_seed) for a round, given a normalized drop_position.
 *
 * Why this exists: the physics engine (Matter.js) only exists in JS/TS, but
 * the backend is Python and must remain authoritative for economic outcomes
 * without trusting the browser. Rather than have the backend invent an
 * "abstract" outcome and hope physics can be forced to reproduce it (the
 * old model - an abstract biased random walk, decoupled from the actual
 * peg board, which could select slots that were physically unreachable
 * from the player's chosen position), this script runs the REAL physics
 * many times per drop-position bucket and records the actual empirical
 * distribution of landing slots, plus a pool of verified seeds per slot.
 * The backend then only ever picks from slots it KNOWS are physically
 * reachable from that bucket - nothing is invented, borrowed from a
 * different bucket, or snapped.
 *
 * A "bucket" here is purely an offline-search organization concept (there's
 * no way to search a fresh distribution for every possible float) - the
 * RUNTIME spawn position the frontend actually uses is always the player's
 * exact continuous drop_position, never snapped to a bucket's own x. With
 * FREE_DROP_DROP_BUCKETS buckets spanning the drop range, the gap between a
 * bucket's representative x and a real player's x anywhere inside that
 * bucket's slice is small relative to the ball's own radius; see
 * FreeDropPlinkoCanvas.tsx's mismatch-detection code for how the rare case
 * where this still flips the settled bin is handled (logged, never
 * silently steered/corrected - the payout was already decided server-side
 * before physics ever runs, so a mismatch can't corrupt the result, only
 * the cosmetic landing highlight).
 *
 * Output: chat-backend/plinko/free_drop_physics_table.json - the backend
 * loads this directly (see plinko/free_drop_constants.py). There is no
 * frontend-side seed table anymore; the frontend only ever uses the exact
 * physics_seed the backend returns for a given round.
 *
 * Run with: npx tsx scripts/generate-free-drop-physics-table.ts
 */
import fs from 'fs';
import path from 'path';
import {
    FREE_DROP_DROP_BUCKETS,
    FREE_DROP_ROWS_OPTIONS,
    computeFreeDropBoardGeometry,
    dropPositionForBucketIndex,
    dropPositionToSpawnX,
    simulateFreeDropToSettledSlot,
} from '../src/components/games/plinko/freeDropPhysics';

// Fixed sample size per bucket - this is a real empirical distribution, not
// a "search until every slot is found" pool. A slot with zero hits across
// the full sample is treated as not reachable from that bucket and is
// simply absent from the output - never backfilled.
const SAMPLE_ATTEMPTS = 20000;
const SEEDS_PER_SLOT = 5;

interface SlotEntry {
    seeds: number[];
    /** hitCount / SAMPLE_ATTEMPTS - the empirical probability of landing this slot from this bucket's exact spawn x. */
    weight: number;
}

function generateForRowsAndBucket(rows: number, bucketIndex: number): Record<number, SlotEntry> {
    const geometry = computeFreeDropBoardGeometry(rows);
    const spawnX = dropPositionToSpawnX(geometry, dropPositionForBucketIndex(bucketIndex));

    const hitCounts: Record<number, number> = {};
    const seedPools: Record<number, number[]> = {};
    for (let slot = 0; slot <= rows; slot += 1) {
        hitCounts[slot] = 0;
        seedPools[slot] = [];
    }

    const seedBase = 1 + bucketIndex * 1_000_000;
    for (let i = 0; i < SAMPLE_ATTEMPTS; i += 1) {
        const seed = seedBase + i;
        const slot = simulateFreeDropToSettledSlot(rows, seed, spawnX);
        hitCounts[slot] += 1;
        if (seedPools[slot].length < SEEDS_PER_SLOT) seedPools[slot].push(seed);
    }

    const result: Record<number, SlotEntry> = {};
    for (let slot = 0; slot <= rows; slot += 1) {
        if (hitCounts[slot] === 0) continue;
        result[slot] = { seeds: seedPools[slot], weight: hitCounts[slot] / SAMPLE_ATTEMPTS };
    }
    return result;
}

/**
 * Independent re-simulation double-check (same pattern already used for
 * Classic's seed table) - re-runs every collected seed fresh and confirms
 * it reproduces the exact slot it's filed under. This is the generation-
 * time reject-bad-entries step: if anything here doesn't reproduce (e.g. a
 * stale table generated before a physics change, like removing spawn-x
 * jitter), the script throws instead of writing a JSON file the backend
 * would treat as authoritative but that doesn't actually match the current
 * physics.
 */
function verifyTable(rows: number, buckets: Record<number, Record<number, SlotEntry>>) {
    let checked = 0;
    for (const [bucketStr, slots] of Object.entries(buckets)) {
        const bucketIndex = Number(bucketStr);
        const geometry = computeFreeDropBoardGeometry(rows);
        const spawnX = dropPositionToSpawnX(geometry, dropPositionForBucketIndex(bucketIndex));
        for (const [slotStr, entry] of Object.entries(slots)) {
            const expectedSlot = Number(slotStr);
            for (const seed of entry.seeds) {
                const actualSlot = simulateFreeDropToSettledSlot(rows, seed, spawnX);
                if (actualSlot !== expectedSlot) {
                    throw new Error(
                        `Verification failed: rows=${rows} bucket=${bucketIndex} seed=${seed} claimed slot=${expectedSlot} but re-simulation landed in slot=${actualSlot}`
                    );
                }
                checked += 1;
            }
        }
    }
    console.log(`rows=${rows}: verified ${checked} seeds, all reproduce their claimed slot exactly`);
}

const table: Record<number, Record<number, Record<number, SlotEntry>>> = {};
for (const rows of FREE_DROP_ROWS_OPTIONS) {
    table[rows] = {};
    const t0 = Date.now();
    for (let bucketIndex = 0; bucketIndex < FREE_DROP_DROP_BUCKETS; bucketIndex += 1) {
        const entry = generateForRowsAndBucket(rows, bucketIndex);
        table[rows][bucketIndex] = entry;
        const coverage = Object.entries(entry)
            .map(([s, e]) => `${s}:${(e.weight * 100).toFixed(1)}%`)
            .join(' ');
        console.log(`rows=${rows} bucket=${bucketIndex}/${FREE_DROP_DROP_BUCKETS - 1}: ${coverage}`);
    }
    console.log(`rows=${rows}: done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    verifyTable(rows, table[rows]);
}

const outPath = path.join(__dirname, '../../chat-backend/plinko/free_drop_physics_table.json');
fs.writeFileSync(outPath, JSON.stringify(table, null, 2));
console.log(`\nWrote ${outPath}`);
