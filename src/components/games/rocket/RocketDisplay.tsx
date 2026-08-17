'use client';

import { useEffect, useRef, useState } from 'react';
import { RocketConfig, RocketRoundState } from '@/types';
import styles from './RocketDisplay.module.css';

interface RocketDisplayProps {
    round: RocketRoundState | null;
    config: RocketConfig | null;
}

/**
 * The exact same formula as rocket/services.py::multiplier_at_elapsed - not
 * a decision-making function, purely a smooth visual interpolation between
 * ~150ms polls. Every poll response re-syncs the display to the
 * authoritative server multiplier, so this can never drift into showing a
 * value the server hasn't actually reached; it only fills the gaps between
 * polls with the identical public curve the server itself uses.
 */
function computeMultiplier(elapsedSeconds: number, growthRate: number, accelExponent: number): number {
    if (elapsedSeconds <= 0) return 1;
    return Math.exp(growthRate * Math.pow(elapsedSeconds, accelExponent));
}

// Maps a multiplier to a 0-1 vertical flight progress for the rocket icon -
// log-scaled so the (common) low-multiplier range still reads as visible
// motion, while very rare, very high multipliers saturate near the top of
// the travel range instead of flying off-screen.
function flightProgress(multiplier: number): number {
    return Math.min(1, Math.log10(Math.max(1, multiplier)) / 2.5);
}

export function RocketDisplay({ round, config }: RocketDisplayProps) {
    const [liveMultiplier, setLiveMultiplier] = useState(1);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        if (!round || round.phase !== 'running' || !config) {
            setLiveMultiplier(round ? Number(round.multiplier) : 1);
            return;
        }

        const startedAtMs = new Date(round.started_at).getTime();
        const growthRate = Number(config.growth_rate);
        const accelExponent = Number(config.accel_exponent);

        const tick = () => {
            const elapsed = (Date.now() - startedAtMs) / 1000;
            setLiveMultiplier(computeMultiplier(elapsed, growthRate, accelExponent));
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [round, config]);

    const phase = round?.phase;
    const progress = flightProgress(phase === 'running' ? liveMultiplier : Number(round?.multiplier ?? 1));
    const isCrashed = phase === 'crashed';
    const isCashedOut = phase === 'cashed_out';
    const isCountdown = phase === 'countdown';
    const isRunning = phase === 'running';

    return (
        <div className={styles.stage}>
            <div className={styles.stars} aria-hidden="true">
                {STAR_POSITIONS.map((s, i) => (
                    <span key={i} className={styles.star} style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s` }} />
                ))}
            </div>

            <div
                className={`${styles.rocketTrack} ${isCrashed ? styles.rocketTrackCrashed : ''}`}
                style={{ '--flight-progress': progress } as React.CSSProperties}
            >
                <div className={`${styles.exhaust} ${isRunning || isCountdown ? styles.exhaustActive : ''}`} aria-hidden="true" />
                <div className={`${styles.rocket} ${isCrashed ? styles.rocketCrashed : ''} ${isCashedOut ? styles.rocketCashedOut : ''}`} aria-hidden="true">
                    🚀
                </div>
            </div>

            <div className={styles.readout}>
                {isCountdown && round?.seconds_remaining != null ? (
                    <>
                        <span className={styles.countdownLabel}>Launching in</span>
                        <span className={styles.countdownValue}>{Math.max(0, Math.ceil(Number(round.seconds_remaining)))}</span>
                    </>
                ) : isCrashed ? (
                    <>
                        <span className={styles.crashedLabel}>ROCKET CRASHED</span>
                        <span className={styles.multiplierValueCrashed}>{Number(round?.multiplier).toFixed(2)}x</span>
                        <span className={styles.resultLine}>Result: -{Number(round?.wager_amount).toLocaleString()}</span>
                    </>
                ) : isCashedOut ? (
                    <>
                        <span className={styles.successLabel}>SUCCESS</span>
                        <span className={styles.multiplierValueSuccess}>{Number(round?.cashout_multiplier).toFixed(2)}x</span>
                        <span className={styles.resultLine}>
                            Return: {Number(round?.payout_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} &middot; Profit: +
                            {(Number(round?.payout_amount) - Number(round?.wager_amount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                    </>
                ) : (
                    <span className={styles.multiplierValue}>{liveMultiplier.toFixed(2)}x</span>
                )}
            </div>
        </div>
    );
}

const STAR_POSITIONS = Array.from({ length: 18 }, (_, i) => ({
    left: (i * 37) % 100,
    top: (i * 53) % 100,
    delay: (i % 6) * 0.4,
}));
