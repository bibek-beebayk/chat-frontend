import { HiLoConfig, HiLoDirection, HiLoRank } from '@/types';

/**
 * Client-side mirror of hilo/services.py's pricing, so both prediction
 * buttons can show a live percentage and multiplier without a round-trip.
 *
 * Display only. The server recomputes the step multiplier from the same
 * formula inside the locked predict transaction and never accepts a
 * client-sent value - if these ever disagree, the server is right.
 */

const RANK_ORDER: HiLoRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_COUNT = RANK_ORDER.length;

export function rankValue(rank: HiLoRank): number {
    return RANK_ORDER.indexOf(rank) + 2;
}

/** How many of the 13 ranks beat / lose to / tie this one. */
export function outcomeCounts(rank: HiLoRank) {
    const value = rankValue(rank);
    return { higher: 14 - value, lower: value - 2, push: 1 };
}

export function winProbability(rank: HiLoRank, direction: HiLoDirection): number {
    return outcomeCounts(rank)[direction] / RANK_COUNT;
}

export function pushProbability(): number {
    return 1 / RANK_COUNT;
}

/**
 * A push returns the round to an equivalent state, so a prediction is
 * settled entirely by the non-push branch - which is what this conditions
 * on. Rounded down to 2dp, then floored, matching the server exactly.
 * Returns null where the direction can never win (lower on a 2, higher on
 * an ace), which is how the UI knows to render that button disabled.
 */
export function stepMultiplier(rank: HiLoRank, direction: HiLoDirection, config: HiLoConfig): number | null {
    const counts = outcomeCounts(rank);
    const count = counts[direction];
    if (count === 0) return null;

    const nonPush = counts.higher + counts.lower;
    const raw = (nonPush / count) * (1 - Number(config.house_edge));
    const floored = Math.floor(raw * 100) / 100;
    return Math.max(floored, Number(config.min_step_multiplier));
}

export function isDirectionAvailable(rank: HiLoRank, direction: HiLoDirection): boolean {
    return outcomeCounts(rank)[direction] > 0;
}

/** What the accumulated multiplier becomes if this prediction wins. */
export function projectedMultiplier(
    currentMultiplier: number,
    rank: HiLoRank,
    direction: HiLoDirection,
    config: HiLoConfig,
): number | null {
    const step = stepMultiplier(rank, direction, config);
    if (step === null) return null;
    const combined = Math.floor(currentMultiplier * step * 100) / 100;
    return Math.min(combined, Number(config.max_multiplier));
}

export function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}
