'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ImmersiveGameShell } from '@/components/games/shared/ImmersiveGameShell';
import { emitPointsUpdated, usePointsBalance } from '@/hooks/usePointsBalance';
import { ApiError } from '@/lib/api';
import { rocketApi } from '@/lib/rocket';
import { RocketConfig, RocketHistoryItem, RocketRoundState } from '@/types';
import * as rocketAudio from './audio';
import { RocketControls } from './RocketControls';
import { RocketDisplay } from './RocketDisplay';
import { RocketMobileControls } from './RocketMobileControls';
import { RocketRulesModal } from './RocketRulesModal';
import { useRocketSync } from './useRocketSync';
import styles from './RocketGame.module.css';

// How long the SUCCESS/CRASHED result stays on screen before the next
// round's betting UI reappears - kept short per the design brief ("keep
// result animation short so the next round begins quickly").
const RESULT_DISPLAY_MS = 2600;

function makeClientRequestId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `rocket-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(pattern); } catch {}
    }
}

export function RocketGame() {
    const [config, setConfig] = useState<RocketConfig | null>(null);
    const [configError, setConfigError] = useState<string | null>(null);
    const polledBalance = usePointsBalance();
    const [balanceOverride, setBalanceOverride] = useState<number | null>(null);

    const [currentRound, setCurrentRound] = useState<RocketRoundState | null>(null);
    const [resultRound, setResultRound] = useState<RocketRoundState | null>(null);

    const [wagerInput, setWagerInput] = useState('10');
    const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
    const [autoCashoutInput, setAutoCashoutInput] = useState('2.00');

    const [busy, setBusy] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [muted, setMuted] = useState(false);

    const [history, setHistory] = useState<RocketHistoryItem[]>([]);

    const resultTimerRef = useRef<number | null>(null);
    const soundStartedRef = useRef(false);
    const finalTickPlayedRef = useRef(false);
    const launchFxPlayedRef = useRef(false);

    useEffect(() => {
        setMuted(rocketAudio.isSoundMuted());
    }, []);

    const loadHistory = useCallback(() => {
        rocketApi.getHistory()
            .then(setHistory)
            .catch(() => {});
    }, []);

    const handleResolved = useCallback((round: RocketRoundState) => {
        setCurrentRound(null);
        setResultRound(round);
        setBalanceOverride(round.balance_after != null ? Number(round.balance_after) : null);
        emitPointsUpdated();
        loadHistory();

        rocketAudio.stopEngineLoop();
        soundStartedRef.current = false;
        if (round.status === 'cashed_out') {
            rocketAudio.playCashOutSuccess();
            vibrate([25, 40, 25]);
        } else if (round.status === 'crashed') {
            rocketAudio.playCrash();
            vibrate([60, 30, 90]);
        }

        if (resultTimerRef.current !== null) window.clearTimeout(resultTimerRef.current);
        resultTimerRef.current = window.setTimeout(() => {
            setResultRound(null);
            resultTimerRef.current = null;
        }, RESULT_DISPLAY_MS);
    }, [loadHistory]);

    const sync = useRocketSync(currentRound, config, handleResolved);

    // Visual-only phase derived from the sync engine's throttled countdown
    // state - currentRound.phase itself is only ever a snapshot from the
    // moment the round was placed/last polled, so this is what actually
    // drives the countdown -> launch -> flight transition on screen.
    const visualPhase: 'countdown' | 'running' | null = !currentRound
        ? null
        : sync.secondsRemaining !== null && sync.secondsRemaining > 0.05
            ? 'countdown'
            : 'running';

    // Countdown tick sounds + haptics, and the one-shot ignition/launch FX
    // at the moment flight actually begins.
    useEffect(() => {
        if (!currentRound || visualPhase !== 'countdown' || sync.secondsRemaining === null) return;
        const wholeSecond = Math.ceil(sync.secondsRemaining);
        if (wholeSecond <= 1 && !finalTickPlayedRef.current) {
            finalTickPlayedRef.current = true;
            rocketAudio.playFinalCountdownTick();
        }
    }, [currentRound, visualPhase, sync.secondsRemaining]);

    useEffect(() => {
        if (!currentRound) {
            launchFxPlayedRef.current = false;
            finalTickPlayedRef.current = false;
            return;
        }
        if (visualPhase === 'running' && !launchFxPlayedRef.current) {
            launchFxPlayedRef.current = true;
            rocketAudio.playIgnition();
            rocketAudio.startEngineLoop();
            soundStartedRef.current = true;
            vibrate([15, 20, 40]);
        }
    }, [currentRound, visualPhase]);

    // Engine pitch/volume reacts to intensity as it changes, not per-frame.
    useEffect(() => {
        if (visualPhase === 'running' && soundStartedRef.current) {
            rocketAudio.updateEngineIntensity(sync.intensity.value);
        }
    }, [visualPhase, sync.intensity.value]);

    const clearResultTimer = useCallback(() => {
        if (resultTimerRef.current !== null) {
            window.clearTimeout(resultTimerRef.current);
            resultTimerRef.current = null;
        }
    }, []);

    // Discrete countdown tick sounds (once per whole-second boundary crossed).
    const lastWholeSecondRef = useRef<number | null>(null);
    useEffect(() => {
        if (visualPhase !== 'countdown' || sync.secondsRemaining === null) {
            lastWholeSecondRef.current = null;
            return;
        }
        const wholeSecond = Math.ceil(sync.secondsRemaining);
        if (lastWholeSecondRef.current !== wholeSecond && wholeSecond >= 1) {
            lastWholeSecondRef.current = wholeSecond;
            if (wholeSecond > 1) rocketAudio.playCountdownTick();
        }
    }, [visualPhase, sync.secondsRemaining]);

    // Initial load: config, recent history, and - critically - whether the
    // player already has an active round (a refresh/reconnect mid-flight),
    // in which case we resume it directly instead of showing betting UI.
    useEffect(() => {
        rocketApi.getConfig()
            .then(setConfig)
            .catch((err) => setConfigError(err?.message || 'Unable to load Rollin Rocket.'));
        loadHistory();
        rocketApi.getCurrent()
            .then((round) => {
                if (!round) return;
                // The server resolves rounds lazily (see rocket/services.py's
                // module docstring) - this very request can be what
                // discovers a crash/auto-cashout that happened while the
                // player was away (tab closed, connection dropped). Treat
                // that exactly like a live resolution rather than silently
                // dropping it, so they still see what happened to their
                // wager instead of just landing back on a blank betting
                // screen.
                if (round.status === 'active') setCurrentRound(round);
                else handleResolved(round);
            })
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return () => {
            clearResultTimer();
            rocketAudio.stopEngineLoop();
        };
    }, [clearResultTimer]);

    const effectiveBalance = balanceOverride ?? polledBalance;
    const busyOrActive = busy || currentRound !== null;

    const handleToggleMute = () => {
        const next = !muted;
        setMuted(next);
        rocketAudio.setSoundMuted(next);
        if (!next) rocketAudio.unlockAudio();
    };

    const handlePlaceBet = async () => {
        if (!config || busyOrActive) return;
        const wagerAmount = Number(wagerInput);
        if (!Number.isFinite(wagerAmount) || wagerAmount <= 0) {
            setErrorMessage('Enter a valid play amount.');
            return;
        }
        if (wagerAmount > effectiveBalance) {
            setErrorMessage('You do not have enough Reward Points for this play.');
            return;
        }
        let autoCashoutMultiplier: number | undefined;
        if (autoCashoutEnabled) {
            const parsed = Number(autoCashoutInput);
            if (!Number.isFinite(parsed) || parsed <= 1) {
                setErrorMessage('Auto Cash Out must be greater than 1.00x.');
                return;
            }
            autoCashoutMultiplier = parsed;
        }

        rocketAudio.unlockAudio();
        rocketAudio.playButtonClick();
        setBusy(true);
        setErrorMessage(null);
        setResultRound(null);
        clearResultTimer();

        try {
            const round = await rocketApi.play({
                wager_amount: wagerAmount,
                auto_cashout_multiplier: autoCashoutMultiplier,
                client_request_id: makeClientRequestId(),
            });
            setCurrentRound(round);
        } catch (err: any) {
            // A 409 means we already had an active round in flight (e.g. a
            // second tab, or a retried request) - resume it instead of
            // just showing an error, matching the reconnection behavior.
            if (err instanceof ApiError && err.status === 409 && err.errors?.active_round) {
                setCurrentRound(err.errors.active_round as RocketRoundState);
            } else {
                setErrorMessage(err?.message || 'Unable to start the round. Please try again.');
            }
        } finally {
            setBusy(false);
        }
    };

    const handleCashOut = async () => {
        if (!currentRound || visualPhase !== 'running' || busy) return;
        rocketAudio.playCashOutPress();
        vibrate(20);
        setBusy(true);
        try {
            const round = await rocketApi.cashOut();
            handleResolved(round);
        } catch (err: any) {
            setErrorMessage(err?.message || 'Unable to cash out. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    if (configError) {
        return (
            <DashboardLayout>
                <ImmersiveGameShell gameName="Rollin Rocket" onInfoClick={() => setRulesOpen(true)}>
                    <div className={styles.errorPanel}>{configError}</div>
                </ImmersiveGameShell>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <ImmersiveGameShell gameName="Rollin Rocket" onInfoClick={() => setRulesOpen(true)}>
                <div className={styles.page}>
                    <div className={styles.stageWrap}>
                        <RocketDisplay
                            currentRound={currentRound}
                            resultRound={resultRound}
                            visualPhase={visualPhase}
                            sync={sync}
                            history={history}
                            soundMuted={muted}
                            onToggleMute={handleToggleMute}
                        />

                        {config && (
                            <RocketMobileControls
                                config={config}
                                wagerInput={wagerInput}
                                onWagerChange={setWagerInput}
                                autoCashoutEnabled={autoCashoutEnabled}
                                onAutoCashoutEnabledChange={setAutoCashoutEnabled}
                                autoCashoutInput={autoCashoutInput}
                                onAutoCashoutChange={setAutoCashoutInput}
                                balance={effectiveBalance}
                                currentRound={currentRound}
                                visualPhase={visualPhase}
                                liveMultiplier={sync.displayMultiplier}
                                busy={busy}
                                onPlaceBet={handlePlaceBet}
                                onCashOut={handleCashOut}
                            />
                        )}
                    </div>

                    {config && (
                        <RocketControls
                            config={config}
                            wagerInput={wagerInput}
                            onWagerChange={setWagerInput}
                            autoCashoutEnabled={autoCashoutEnabled}
                            onAutoCashoutEnabledChange={setAutoCashoutEnabled}
                            autoCashoutInput={autoCashoutInput}
                            onAutoCashoutChange={setAutoCashoutInput}
                            balance={effectiveBalance}
                            currentRound={currentRound}
                            visualPhase={visualPhase}
                            liveMultiplier={sync.displayMultiplier}
                            busy={busy}
                            onPlaceBet={handlePlaceBet}
                            onCashOut={handleCashOut}
                        />
                    )}

                    {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
                </div>
            </ImmersiveGameShell>
            <RocketRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
        </DashboardLayout>
    );
}
