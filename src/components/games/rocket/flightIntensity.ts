/**
 * Pure, dependency-free math shared by the sync hook and the visual layer.
 * `computeMultiplier` mirrors rocket/services.py::multiplier_at_elapsed
 * exactly (same public formula - only the hidden crash_point is secret),
 * so client-side interpolation between polls always agrees with whatever
 * the server will report at the next sync. Intensity is a purely cosmetic
 * derived value - it never feeds back into anything that affects the
 * settlement result.
 */

export function computeMultiplier(elapsedSeconds: number, growthRate: number, accelExponent: number): number {
    if (elapsedSeconds <= 0) return 1;
    return Math.exp(growthRate * Math.pow(elapsedSeconds, accelExponent));
}

export type FlightStage = 'launch' | 'ascent' | 'space' | 'accelerating' | 'extreme';

export interface FlightIntensity {
    /** 0-1, log-scaled - drives most continuous visual parameters. */
    value: number;
    stage: FlightStage;
}

/**
 * Log-scaled so the (common) low-multiplier range still reads as visible
 * progression, while rare very-high multipliers saturate instead of
 * demanding effects that scale forever. Stage boundaries follow the design
 * brief's suggested progression (1-1.5x launch, 1.5-3x, 3-5x, 5-10x, 10x+).
 */
export function flightIntensityForMultiplier(multiplier: number): FlightIntensity {
    const value = Math.min(1, Math.log10(Math.max(1, multiplier)) / 2.2);
    let stage: FlightStage = 'launch';
    if (multiplier >= 10) stage = 'extreme';
    else if (multiplier >= 5) stage = 'accelerating';
    else if (multiplier >= 3) stage = 'space';
    else if (multiplier >= 1.5) stage = 'ascent';
    return { value, stage };
}

// Vertical flight progress (0-1) for slow, large-scale layout purposes only
// (e.g. how "far" the environment has scrolled) - the rocket sprite itself
// stays visually anchored near center, per the parallax design.
export function flightProgress(multiplier: number): number {
    return Math.min(1, Math.log10(Math.max(1, multiplier)) / 2.5);
}

export const MULTIPLIER_MILESTONES = [2, 5, 10, 25, 50];

/** Returns the milestone crossed between two multiplier readings, if any (for a one-shot pulse trigger). */
export function crossedMilestone(previous: number, current: number): number | null {
    for (const milestone of MULTIPLIER_MILESTONES) {
        if (previous < milestone && current >= milestone) return milestone;
    }
    return null;
}
