/**
 * Deterministic seeded PRNG (mulberry32) - same output on every platform,
 * unlike Math.random(). Shared by Classic (physics.ts) and Free Drop
 * (freeDropPhysics.ts) so both offline seed generators and their runtime
 * canvases use byte-for-byte identical randomness.
 */
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
