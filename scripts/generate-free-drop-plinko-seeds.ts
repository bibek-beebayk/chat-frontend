/**
 * One-time offline generator for Free Drop, mirroring
 * scripts/generate-plinko-seeds.ts: finds real Matter.js physics seeds
 * (via freeDropPhysics.ts - the exact same module the browser uses) that
 * settle in each possible (rows, drop_bucket, slot_index) combination, and
 * writes them to freeDropSeedTable.ts.
 *
 * The extra dimension versus Classic is drop_bucket: each bucket has its
 * own resolved spawn x (see dropPositionForBucketIndex/dropPositionToSpawnX
 * in freeDropPhysics.ts), so a seed verified for bucket B is only ever
 * replayed with that same bucket's spawn x - never the player's raw
 * continuous position - which is what makes a chaotic physics sim
 * reproducible. See FreeDropPlinkoCanvas.tsx for the runtime lookup.
 *
 * A handful of (bucket, slot) combinations turn out to be effectively
 * unreachable from that bucket's exact spawn x within any practical search
 * budget - not just rare, but structurally so (a resonance/channeling
 * effect of a specific spawn x against this peg grid's exact spacing,
 * observed empirically: a *more* extreme bucket found the same far-side
 * slot instantly while a less extreme neighbor found zero hits in 308,000
 * attempts). For those, this generator borrows verified seeds from the
 * nearest bucket that *can* reach that slot, and records which bucket's
 * spawn x each seed actually requires (see SeedEntry) - so playback always
 * replays a genuine, physically-verified drop, just anchored to the
 * nearest reachable spawn position for that specific slot rather than the
 * literal requested bucket. This never affects payout math (the backend's
 * economic model never sees bucket indices at all, only the continuous
 * drop_position) - it only affects which verified physics run gets
 * replayed for the visual.
 *
 * Run with: npx tsx scripts/generate-free-drop-plinko-seeds.ts
 */
import fs from 'fs';
import path from 'path';
import {
    FREE_DROP_DROP_BUCKETS,
    FREE_DROP_ROWS_OPTIONS,
    dropPositionForBucketIndex,
    dropPositionToSpawnX,
    computeFreeDropBoardGeometry,
    simulateFreeDropToSettledSlot,
} from '../src/components/games/plinko/freeDropPhysics';

interface SeedEntry {
    seed: number;
    /** Which bucket's resolved spawn x this seed must be replayed at - usually its own bucket, but a borrowed entry points at the donor bucket instead. */
    bucket: number;
}

const SEEDS_PER_BIN = 3; // smaller than Classic's 5 - one more loop dimension (buckets) makes total search time balloon otherwise
const BASE_ATTEMPTS = 8000;
const EXTRA_BATCH = 20000;
const MAX_EXTRA_BATCHES = 6; // hard ceiling per (rows, bucket): up to 128,000 attempts - genuinely unreachable combos are handled by the borrowing pass below instead of an ever-larger budget

function generateForRowsAndBucket(rows: number, bucketIndex: number): Record<number, number[]> {
    const geometry = computeFreeDropBoardGeometry(rows);
    const spawnX = dropPositionToSpawnX(geometry, dropPositionForBucketIndex(bucketIndex));

    const buckets: Record<number, number[]> = {};
    for (let slot = 0; slot <= rows; slot += 1) buckets[slot] = [];

    // Offset the seed space per (rows, bucketIndex) so different buckets
    // don't all search the exact same seed sequence.
    let seed = 1 + bucketIndex * 1_000_000;
    let attempts = 0;

    function runBatch(count: number) {
        for (let i = 0; i < count; i += 1) {
            const slot = simulateFreeDropToSettledSlot(rows, seed, spawnX);
            if (buckets[slot].length < SEEDS_PER_BIN) buckets[slot].push(seed);
            seed += 1;
            attempts += 1;
        }
    }

    runBatch(BASE_ATTEMPTS);

    let extraBatches = 0;
    while (Object.values(buckets).some((arr) => arr.length === 0) && extraBatches < MAX_EXTRA_BATCHES) {
        runBatch(EXTRA_BATCH);
        extraBatches += 1;
    }

    const empty = Object.entries(buckets).filter(([, arr]) => arr.length === 0).map(([s]) => s);
    if (empty.length > 0) {
        console.log(`  rows=${rows} bucket=${bucketIndex}: unreached after ${attempts} attempts, slots [${empty.join(', ')}] - will try borrowing from a neighboring bucket`);
    }
    return buckets;
}

const table: Record<number, Record<number, Record<number, SeedEntry[]>>> = {};
for (const rows of FREE_DROP_ROWS_OPTIONS) {
    const nativeByBucket: Record<number, Record<number, number[]>> = {};
    const t0 = Date.now();
    for (let bucketIndex = 0; bucketIndex < FREE_DROP_DROP_BUCKETS; bucketIndex += 1) {
        nativeByBucket[bucketIndex] = generateForRowsAndBucket(rows, bucketIndex);
        console.log(`rows=${rows} bucket=${bucketIndex}/${FREE_DROP_DROP_BUCKETS - 1}: coverage ${Object.entries(nativeByBucket[bucketIndex]).map(([s, a]) => `${s}:${a.length}`).join(' ')}`);
    }

    table[rows] = {};
    for (let bucketIndex = 0; bucketIndex < FREE_DROP_DROP_BUCKETS; bucketIndex += 1) {
        table[rows][bucketIndex] = {};
        for (let slot = 0; slot <= rows; slot += 1) {
            const native = nativeByBucket[bucketIndex][slot];
            if (native.length > 0) {
                table[rows][bucketIndex][slot] = native.map((seed) => ({ seed, bucket: bucketIndex }));
                continue;
            }

            // Borrow from the nearest bucket (by index distance, ties
            // broken toward the lower index) that actually found this slot.
            let donor = -1;
            for (let d = 1; d < FREE_DROP_DROP_BUCKETS; d += 1) {
                const lo = bucketIndex - d;
                const hi = bucketIndex + d;
                if (lo >= 0 && (nativeByBucket[lo]?.[slot]?.length ?? 0) > 0) { donor = lo; break; }
                if (hi < FREE_DROP_DROP_BUCKETS && (nativeByBucket[hi]?.[slot]?.length ?? 0) > 0) { donor = hi; break; }
            }
            if (donor === -1) {
                throw new Error(`rows=${rows} bucket=${bucketIndex} slot=${slot}: no bucket anywhere found a seed for this slot - likely genuinely unreachable, needs a geometry fix`);
            }
            console.log(`  rows=${rows} bucket=${bucketIndex} slot=${slot}: borrowing from bucket=${donor}`);
            table[rows][bucketIndex][slot] = nativeByBucket[donor][slot].map((seed) => ({ seed, bucket: donor }));
        }
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`rows=${rows}: all buckets done in ${elapsed}s`);
}

const outPath = path.join(__dirname, '../src/components/games/plinko/freeDropSeedTable.ts');
const content = `// AUTO-GENERATED by scripts/generate-free-drop-plinko-seeds.ts - do not hand-edit.
// Maps rows -> drop_bucket -> slot_index -> a small pool of verified physics
// seed entries. Each entry's \`bucket\` field is which bucket's resolved
// spawn x it must be replayed at - almost always its own bucket, except for
// a handful of borrowed entries (see the generator script's header) where
// the exact requested bucket couldn't reach that slot within the search
// budget and a neighboring bucket's verified run is reused instead.
// Regenerate with: npx tsx scripts/generate-free-drop-plinko-seeds.ts

export interface FreeDropSeedEntry {
    seed: number;
    bucket: number;
}

export const FREE_DROP_SEED_TABLE: Record<number, Record<number, Record<number, FreeDropSeedEntry[]>>> = ${JSON.stringify(table, null, 4)};
`;
fs.writeFileSync(outPath, content);
console.log(`\nWrote ${outPath}`);
