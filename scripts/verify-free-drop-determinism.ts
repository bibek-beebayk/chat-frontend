/**
 * Lightweight verification script for Free Drop's exact-position/
 * deterministic-seed guarantees. The repo has no frontend test runner
 * (no jest/vitest in package.json) - rather than bring one in just for
 * this, this follows the same convention already used for the offline
 * seed generators (a standalone script run via `npx tsx`) and asserts the
 * pure-function-level properties that matter for correctness:
 *
 *  - normalized drop positions never escape [-1, 1], even at the extreme
 *    ends where floating-point rounding is most likely to overshoot
 *  - the ball's actual Matter.js spawn x is EXACTLY the requested position,
 *    never offset (the old spawn-x jitter bug)
 *  - the same (rows, seed, spawnX) always reproduces the same landing slot
 *  - no runtime file still references the removed bucket-seed-table/
 *    fallback-seed pattern
 *
 * Run with: npx tsx scripts/verify-free-drop-determinism.ts
 */
import fs from 'fs';
import path from 'path';
import Matter from 'matter-js';
import {
    buildFreeDropBoard,
    computeFreeDropBoardGeometry,
    createFreeDropBall,
    dropPositionToSpawnX,
    freeDropBinIndexForX,
    simulateFreeDropToSettledSlot,
    spawnXToDropPosition,
} from '../src/components/games/plinko/freeDropPhysics';

let failures = 0;
function check(name: string, pass: boolean, detail?: string) {
    if (pass) {
        console.log(`  ok  - ${name}`);
    } else {
        failures += 1;
        console.error(`FAIL - ${name}${detail ? `: ${detail}` : ''}`);
    }
}

console.log('1. Normalized drop position never escapes [-1, 1]');
const rows = 8;
const geometry = computeFreeDropBoardGeometry(rows);
{
    const farLeft = spawnXToDropPosition(geometry, geometry.dropRangeMin - 50); // beyond range on purpose
    const farRight = spawnXToDropPosition(geometry, geometry.dropRangeMax + 50);
    check('extreme left clamps to >= -1', farLeft >= -1, `got ${farLeft}`);
    check('extreme left clamps to exactly -1', farLeft === -1, `got ${farLeft}`);
    check('extreme right clamps to <= 1', farRight <= 1, `got ${farRight}`);
    check('extreme right clamps to exactly 1', farRight === 1, `got ${farRight}`);

    // Exercise every x in the valid range densely - none should ever
    // produce a value outside [-1, 1], including float-rounding edge cases.
    let sawOutOfRange = false;
    for (let i = 0; i <= 1000; i += 1) {
        const x = geometry.dropRangeMin + (i / 1000) * (geometry.dropRangeMax - geometry.dropRangeMin);
        const normalized = spawnXToDropPosition(geometry, x);
        if (normalized < -1 || normalized > 1) sawOutOfRange = true;
    }
    check('dense sweep across full drop range never escapes [-1, 1]', !sawOutOfRange);
}

console.log('\n2. Ball spawns at the exact requested x - no jitter offset');
{
    const board = buildFreeDropBoard(rows);
    for (const dropPosition of [-1, -0.5, 0, 0.37, 1]) {
        const spawnX = dropPositionToSpawnX(geometry, dropPosition);
        for (const seed of [1, 42, 999999]) {
            const ball = createFreeDropBall(board, seed, spawnX);
            check(
                `dropPosition=${dropPosition} seed=${seed}: spawn x is exact (no position jitter)`,
                ball.position.x === spawnX,
                `expected ${spawnX}, got ${ball.position.x}`
            );
            Matter.Composite.remove(board.world, ball);
        }
    }
}

console.log('\n3. Deterministic replay: same (rows, seed, spawnX) always lands in the same slot');
{
    for (const dropPosition of [-1, -0.42, 0, 0.61, 1]) {
        const spawnX = dropPositionToSpawnX(geometry, dropPosition);
        for (const seed of [7, 12345]) {
            const runs = new Set<number>();
            for (let i = 0; i < 5; i += 1) {
                runs.add(simulateFreeDropToSettledSlot(rows, seed, spawnX));
            }
            check(
                `dropPosition=${dropPosition} seed=${seed}: 5 replays all land in the same slot`,
                runs.size === 1,
                `got slots ${[...runs].join(',')}`
            );
        }
    }
}

console.log('\n4. freeDropBinIndexForX resolves the extremes to the outer bins');
{
    const board = buildFreeDropBoard(rows);
    const leftSlot = freeDropBinIndexForX(board, geometry.width / 2 - board.wallHalfWidth + 0.01);
    const rightSlot = freeDropBinIndexForX(board, geometry.width / 2 + board.wallHalfWidth - 0.01);
    check('leftmost x resolves to slot 0', leftSlot === 0, `got ${leftSlot}`);
    check('rightmost x resolves to slot rows', rightSlot === rows, `got ${rightSlot}`);
}

console.log('\n5. No runtime file still references the removed bucket-seed-table pattern');
{
    const runtimeFiles = [
        '../src/components/games/plinko/FreeDropPlinkoCanvas.tsx',
        '../src/components/games/plinko/FreeDropPlinkoGame.tsx',
    ];
    const bannedPatterns = ['FREE_DROP_SEED_TABLE', 'freeDropSeedTable', '{ seed: 1, bucket:', 'Math.random()'];
    for (const rel of runtimeFiles) {
        const full = path.join(__dirname, rel);
        const content = fs.readFileSync(full, 'utf8');
        for (const pattern of bannedPatterns) {
            check(`${rel}: does not contain "${pattern}"`, !content.includes(pattern));
        }
    }
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
