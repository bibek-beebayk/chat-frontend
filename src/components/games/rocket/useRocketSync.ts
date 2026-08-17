'use client';

import { useEffect, useRef, useState } from 'react';
import { rocketApi } from '@/lib/rocket';
import { RocketConfig, RocketRoundState } from '@/types';
import { FlightIntensity, computeMultiplier, flightIntensityForMultiplier } from './flightIntensity';

// Authoritative resync interval - the actual crash/cashout decision is
// always re-derived server-side at the moment of a real request (see
// rocket/services.py), so this only needs to be frequent enough that the
// UI catches a resolution (natural crash or auto-cashout) promptly, not
// frequent enough to drive the animation itself - that's what the
// requestAnimationFrame loop below is for. Cut from the previous ~150ms.
const SYNC_INTERVAL_MS = 500;
// The numeric text still updates via React state (not raw DOM writes), so
// it's throttled to a fraction of the RAF rate - a counting number reads
// just as smooth at ~20fps as at 60fps, and this keeps React's involvement
// cheap. The continuous CSS-driven motion (stars/particles/rocket
// vibration) is unaffected - those run as real GPU-accelerated @keyframes
// at full display refresh rate regardless of how often their "speed"
// custom property is nudged.
const STATE_UPDATE_EVERY_N_FRAMES = 3;

interface SyncSnapshot {
    elapsedSeconds: number;
    secondsRemaining: number | null;
    perfTimeAtSync: number;
}

export interface RocketSyncState {
    displayMultiplier: number;
    secondsRemaining: number | null;
    intensity: FlightIntensity;
}

const IDLE_STATE: RocketSyncState = {
    displayMultiplier: 1,
    secondsRemaining: null,
    intensity: flightIntensityForMultiplier(1),
};

/**
 * Drives the live visual state of an in-flight round: polls at a modest,
 * bandwidth-friendly interval for the authoritative snapshot, then
 * interpolates smoothly between polls using the exact same public
 * multiplier formula the server uses (rocket/services.py::
 * multiplier_at_elapsed / flightIntensity.ts::computeMultiplier),
 * anchored to `performance.now()` rather than comparing raw Date.now()
 * timestamps against the server's - this stays correct even if the
 * client's wall clock is skewed, since only the *rate* of a monotonic
 * clock matters for interpolation, not its absolute value.
 *
 * This hook only ever produces *display* values. It never decides a
 * crash or cashout outcome - `onResolved` fires purely off what the
 * server's own /current/ poll response reports.
 */
export function useRocketSync(
    round: RocketRoundState | null,
    config: RocketConfig | null,
    onResolved: (round: RocketRoundState) => void,
): RocketSyncState {
    const [state, setState] = useState<RocketSyncState>(IDLE_STATE);

    const snapshotRef = useRef<SyncSnapshot | null>(null);
    const roundIdRef = useRef<number | null>(null);
    const pollTimerRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const frameCounterRef = useRef(0);
    const onResolvedRef = useRef(onResolved);
    onResolvedRef.current = onResolved;

    useEffect(() => {
        const growthRate = config ? Number(config.growth_rate) : 0.15;
        const accelExponent = config ? Number(config.accel_exponent) : 1.25;

        const stopLoops = () => {
            if (pollTimerRef.current !== null) {
                window.clearTimeout(pollTimerRef.current);
                pollTimerRef.current = null;
            }
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };

        if (!round || round.status !== 'active') {
            stopLoops();
            snapshotRef.current = null;
            roundIdRef.current = null;
            setState(IDLE_STATE);
            return;
        }

        roundIdRef.current = round.round_id;
        snapshotRef.current = {
            elapsedSeconds: round.elapsed_seconds != null ? Number(round.elapsed_seconds) : 0,
            secondsRemaining: round.seconds_remaining != null ? Number(round.seconds_remaining) : null,
            perfTimeAtSync: performance.now(),
        };

        const tick = () => {
            const snapshot = snapshotRef.current;
            if (!snapshot) return;
            const perfDeltaSeconds = (performance.now() - snapshot.perfTimeAtSync) / 1000;

            let secondsRemaining: number | null = null;
            let elapsedSeconds = snapshot.elapsedSeconds + perfDeltaSeconds;
            if (snapshot.secondsRemaining != null) {
                secondsRemaining = Math.max(0, snapshot.secondsRemaining - perfDeltaSeconds);
                elapsedSeconds = secondsRemaining > 0 ? 0 : elapsedSeconds - snapshot.secondsRemaining;
            }

            frameCounterRef.current += 1;
            if (frameCounterRef.current % STATE_UPDATE_EVERY_N_FRAMES === 0) {
                const multiplier = computeMultiplier(elapsedSeconds, growthRate, accelExponent);
                setState({
                    displayMultiplier: multiplier,
                    secondsRemaining,
                    intensity: flightIntensityForMultiplier(multiplier),
                });
            }

            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        const poll = async () => {
            try {
                const latest = await rocketApi.getCurrent();
                if (!latest || latest.round_id !== roundIdRef.current) return;

                if (latest.status !== 'active') {
                    roundIdRef.current = null;
                    stopLoops();
                    onResolvedRef.current(latest);
                    return;
                }

                snapshotRef.current = {
                    elapsedSeconds: latest.elapsed_seconds != null ? Number(latest.elapsed_seconds) : 0,
                    secondsRemaining: latest.seconds_remaining != null ? Number(latest.seconds_remaining) : null,
                    perfTimeAtSync: performance.now(),
                };
                pollTimerRef.current = window.setTimeout(poll, SYNC_INTERVAL_MS);
            } catch {
                // Transient network hiccup - the RAF loop keeps the display
                // moving off the last good snapshot; try again shortly.
                pollTimerRef.current = window.setTimeout(poll, SYNC_INTERVAL_MS);
            }
        };
        pollTimerRef.current = window.setTimeout(poll, SYNC_INTERVAL_MS);

        return stopLoops;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round?.round_id, round?.status, config]);

    return state;
}
