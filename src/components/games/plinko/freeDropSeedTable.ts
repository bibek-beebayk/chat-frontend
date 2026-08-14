// TEMPORARY placeholder - will be overwritten by
// scripts/generate-free-drop-plinko-seeds.ts once the offline seed search
// completes. Do not ship with this content.
export interface FreeDropSeedEntry {
    seed: number;
    bucket: number;
}

export const FREE_DROP_SEED_TABLE: Record<number, Record<number, Record<number, FreeDropSeedEntry[]>>> = {};
