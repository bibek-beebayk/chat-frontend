'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { RocketHistoryItem, RocketRoundState } from '@/types';
import { crossedMilestone, FlightStage } from './flightIntensity';
import { RocketAsset } from './RocketAsset';
import { RocketHistoryStrip } from './RocketHistoryStrip';
import { RocketSyncState } from './useRocketSync';
import styles from './RocketDisplay.module.css';

interface RocketDisplayProps {
    currentRound: RocketRoundState | null;
    resultRound: RocketRoundState | null;
    visualPhase: 'countdown' | 'running' | null;
    sync: RocketSyncState;
    history: RocketHistoryItem[];
    soundMuted: boolean;
    onToggleMute: () => void;
}

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(mql.matches);
        const onChange = () => setReduced(mql.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);
    return reduced;
}

// Fixed, precomputed positions (not re-randomized per render) for the
// bounded set of decorative star/particle elements - kept small so this
// stays cheap on mobile regardless of flight intensity.
const FAR_STARS = Array.from({ length: 14 }, (_, i) => ({ left: (i * 29) % 100, top: (i * 41 + 5) % 100, delay: (i % 5) * 0.5 }));
const NEAR_STARS = Array.from({ length: 10 }, (_, i) => ({ left: (i * 37 + 12) % 100, top: (i * 53 + 8) % 100, delay: (i % 4) * 0.35 }));
const DOWNWARD_PARTICLES = Array.from({ length: 8 }, (_, i) => ({ left: 20 + (i * 8) % 60, delay: (i % 6) * 0.28 }));
const SPEED_LINES = Array.from({ length: 6 }, (_, i) => ({ left: 10 + i * 15, delay: (i % 3) * 0.15 }));
const CRASH_PARTICLES = Array.from({ length: 12 }, (_, i) => ({ angle: (360 / 12) * i, delay: (i % 4) * 0.02 }));

export function RocketDisplay({ currentRound, resultRound, visualPhase, sync, history, soundMuted, onToggleMute }: RocketDisplayProps) {
    const reducedMotion = usePrefersReducedMotion();
    const previousMultiplierRef = useRef(1);
    const [milestone, setMilestone] = useState<number | null>(null);
    const milestoneTimerRef = useRef<number | null>(null);

    const isRunning = visualPhase === 'running' && !resultRound;
    const isCountdown = visualPhase === 'countdown' && !resultRound;
    const isCrashed = resultRound?.status === 'crashed';
    const isCashedOut = resultRound?.status === 'cashed_out';
    const isIdle = !currentRound && !resultRound;

    const liveMultiplier = isRunning ? sync.displayMultiplier : 1;

    useEffect(() => {
        if (!isRunning) {
            previousMultiplierRef.current = 1;
            return;
        }
        const crossed = crossedMilestone(previousMultiplierRef.current, liveMultiplier);
        previousMultiplierRef.current = liveMultiplier;
        if (crossed !== null) {
            setMilestone(crossed);
            if (milestoneTimerRef.current !== null) window.clearTimeout(milestoneTimerRef.current);
            milestoneTimerRef.current = window.setTimeout(() => setMilestone(null), 700);
        }
    }, [isRunning, liveMultiplier]);

    useEffect(() => () => {
        if (milestoneTimerRef.current !== null) window.clearTimeout(milestoneTimerRef.current);
    }, []);

    const stage: FlightStage = isRunning ? sync.intensity.stage : 'launch';
    const intensity = isRunning ? sync.intensity.value : 0;

    // Intensity is log-scaled against the multiplier, so it stays near 0 for
    // most of a round's actual duration (most rounds crash below 2x). Tying
    // background scroll speed to intensity alone made flight look static
    // for the common case. Running flight gets its own speed floor instead,
    // set the moment launch happens, then ramps further with intensity.
    const speedMult = isRunning ? 1.6 + intensity * 3.4 : 0.5;

    const stageStyle = useMemo(() => ({
        '--intensity': intensity,
        '--speed-mult': speedMult.toFixed(2),
    } as React.CSSProperties), [intensity, speedMult]);

    return (
        <div
            className={`${styles.stage} ${reducedMotion ? styles.reducedMotion : ''} ${milestone ? styles.milestonePulse : ''}`}
            data-stage={stage}
            data-phase={isCrashed ? 'crashed' : isCashedOut ? 'cashed_out' : isRunning ? 'running' : isCountdown ? 'countdown' : 'idle'}
            style={stageStyle}
        >
            <div className={styles.starsFar} aria-hidden="true">
                {FAR_STARS.map((s, i) => (
                    <span key={i} className={styles.starFar} style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s` }} />
                ))}
            </div>
            <div className={styles.starsNear} aria-hidden="true">
                {NEAR_STARS.map((s, i) => (
                    <span key={i} className={styles.starNear} style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s` }} />
                ))}
            </div>

            <div className={styles.clouds} aria-hidden="true">
                <span className={styles.cloud} />
                <span className={styles.cloud} />
            </div>

            <div className={styles.speedLines} aria-hidden="true">
                {SPEED_LINES.map((s, i) => (
                    <span key={i} className={styles.speedLine} style={{ left: `${s.left}%`, animationDelay: `${s.delay}s` }} />
                ))}
            </div>

            {history.length > 0 && (
                <div className={styles.historyOverlay}>
                    <RocketHistoryStrip items={history} loading={false} compact />
                </div>
            )}

            <div className={`${styles.rocketWrap} ${isCrashed ? styles.rocketWrapCrashed : ''} ${isCashedOut ? styles.rocketWrapCashedOut : ''}`}>
                <div className={styles.particlesDown} aria-hidden="true">
                    {DOWNWARD_PARTICLES.map((p, i) => (
                        <span key={i} className={styles.particleDown} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s` }} />
                    ))}
                </div>

                <div className={styles.rocketInner}>
                    <RocketAsset intensity={intensity} />
                </div>

                {isCrashed && (
                    <div className={styles.crashBurst} key={resultRound?.round_id} aria-hidden="true">
                        {CRASH_PARTICLES.map((p, i) => (
                            <span
                                key={i}
                                className={styles.crashParticle}
                                style={{ '--angle': `${p.angle}deg`, animationDelay: `${p.delay}s` } as React.CSSProperties}
                            />
                        ))}
                        <span className={styles.crashFlash} />
                    </div>
                )}
            </div>

            <button type="button" className={styles.muteBtn} onClick={onToggleMute} aria-label={soundMuted ? 'Unmute sound' : 'Mute sound'}>
                {soundMuted ? '🔇' : '🔊'}
            </button>

            <div className={styles.readout}>
                {isCountdown && sync.secondsRemaining != null ? (
                    <>
                        <span className={styles.countdownLabel}>Launching in</span>
                        <span className={styles.countdownValue}>{Math.max(1, Math.ceil(sync.secondsRemaining))}</span>
                    </>
                ) : isCrashed ? (
                    <>
                        <span className={styles.crashedLabel}>ROCKET CRASHED</span>
                        <span className={styles.multiplierValueCrashed}>{Number(resultRound?.multiplier).toFixed(2)}x</span>
                        <span className={styles.resultLine}>Result: -{Number(resultRound?.wager_amount).toLocaleString()}</span>
                    </>
                ) : isCashedOut ? (
                    <>
                        <span className={styles.successLabel}>SUCCESS</span>
                        <span className={styles.multiplierValueSuccess}>{Number(resultRound?.cashout_multiplier).toFixed(2)}x</span>
                        <span className={styles.resultLine}>
                            Return: {Number(resultRound?.payout_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} &middot; Profit: +
                            {(Number(resultRound?.payout_amount) - Number(resultRound?.wager_amount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                    </>
                ) : (
                    <span className={`${styles.multiplierValue} ${isRunning ? styles.multiplierValueLive : ''}`}>
                        {liveMultiplier.toFixed(2)}x
                    </span>
                )}
                {isIdle && <span className={styles.idleHint}>Ready to launch</span>}
            </div>
        </div>
    );
}
