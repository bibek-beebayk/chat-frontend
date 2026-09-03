'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ImmersiveGameShell } from '@/components/games/shared/ImmersiveGameShell';
import { emitPointsUpdated, usePointsBalance } from '@/hooks/usePointsBalance';
import { ApiError } from '@/lib/api';
import { hiloApi } from '@/lib/hilo';
import {
    HiLoCard,
    HiLoConfig,
    HiLoDirection,
    HiLoHistoryItem,
    HiLoOutcome,
    HiLoRoundState,
} from '@/types';
import * as hiloAudio from './audio';
import { HiLoControls } from './HiLoControls';
import { HiLoHistoryStrip } from './HiLoHistoryStrip';
import { HiLoPhase, HiLoTable } from './HiLoTable';
import { HiLoRulesModal } from './HiLoRulesModal';
import styles from './HiLoGame.module.css';

// How long the card flip plays before the outcome is acted on, and how long
// a win/push result stays on screen before the next prediction opens. Short
// enough to keep the "one more card" rhythm the design brief asks for.
const FLIP_MS = 520;
const OUTCOME_HOLD_MS = 620;
// A finished round (bust or cash-out) stays up longer - it's the only
// chance to read what happened before the betting UI returns.
const RESULT_DISPLAY_MS = 2400;

function makeClientRequestId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `hilo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(pattern); } catch {}
    }
}

export function HiLoGame() {
    const [config, setConfig] = useState<HiLoConfig | null>(null);
    const [configError, setConfigError] = useState<string | null>(null);
    const polledBalance = usePointsBalance();
    const [balanceOverride, setBalanceOverride] = useState<number | null>(null);

    const [round, setRound] = useState<HiLoRoundState | null>(null);
    const [resultRound, setResultRound] = useState<HiLoRoundState | null>(null);

    // The visual state machine (design spec s23). Every control's disabled
    // state derives from this - during `revealing` nothing is actionable,
    // which together with the step_index echo below makes a double-tap
    // unable to draw a second card.
    const [phase, setPhase] = useState<HiLoPhase>('idle');
    const [previousCard, setPreviousCard] = useState<HiLoCard | null>(null);
    const [revealCard, setRevealCard] = useState<HiLoCard | null>(null);
    const [lastOutcome, setLastOutcome] = useState<HiLoOutcome | null>(null);

    const [wagerInput, setWagerInput] = useState('10');
    const [busy, setBusy] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [muted, setMuted] = useState(false);
    const [history, setHistory] = useState<HiLoHistoryItem[]>([]);

    const timersRef = useRef<number[]>([]);

    const schedule = useCallback((fn: () => void, delay: number) => {
        const id = window.setTimeout(fn, delay);
        timersRef.current.push(id);
        return id;
    }, []);

    const clearTimers = useCallback(() => {
        timersRef.current.forEach((id) => window.clearTimeout(id));
        timersRef.current = [];
    }, []);

    useEffect(() => {
        setMuted(hiloAudio.isSoundMuted());
    }, []);

    const loadHistory = useCallback(() => {
        hiloApi.getHistory().then(setHistory).catch(() => {});
    }, []);

    useEffect(() => {
        hiloApi.getConfig()
            .then(setConfig)
            .catch((err) => setConfigError(err?.message || 'Unable to load Rollin Hi-Lo.'));
        loadHistory();
        // Restore an in-flight round after a refresh. Unlike Rocket there is
        // nothing to resolve on the server's side when we ask - a Hi-Lo
        // round only ever changes when the player acts - so anything that
        // comes back here is simply still waiting on a prediction.
        hiloApi.getCurrent()
            .then((active) => {
                if (!active) return;
                setRound(active);
                setPhase('awaiting_prediction');
            })
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => clearTimers, [clearTimers]);

    const effectiveBalance = balanceOverride ?? polledBalance;

    const handleToggleMute = () => {
        const next = !muted;
        setMuted(next);
        hiloAudio.setSoundMuted(next);
        if (!next) hiloAudio.unlockAudio();
    };

    /** A round has ended (bust, cash-out, or the server's forced cap payout). */
    const finishRound = useCallback((finished: HiLoRoundState) => {
        setRound(null);
        setResultRound(finished);
        setPhase('round_complete');
        if (finished.balance_after != null) setBalanceOverride(Number(finished.balance_after));
        emitPointsUpdated();
        loadHistory();

        schedule(() => {
            setResultRound(null);
            setPreviousCard(null);
            setRevealCard(null);
            setLastOutcome(null);
            setPhase('idle');
        }, RESULT_DISPLAY_MS);
    }, [loadHistory, schedule]);

    const handleDeal = async () => {
        if (!config || busy || round) return;
        const wagerAmount = Number(wagerInput);
        if (!Number.isFinite(wagerAmount) || wagerAmount <= 0) {
            setErrorMessage('Enter a valid play amount.');
            return;
        }
        if (wagerAmount > effectiveBalance) {
            setErrorMessage('You do not have enough Reward Points for this play.');
            return;
        }

        hiloAudio.unlockAudio();
        hiloAudio.playButtonClick();
        clearTimers();
        setBusy(true);
        setErrorMessage(null);
        setResultRound(null);
        setPreviousCard(null);
        setRevealCard(null);
        setLastOutcome(null);
        setPhase('dealing');

        try {
            const started = await hiloApi.play({
                wager_amount: wagerAmount,
                client_request_id: makeClientRequestId(),
            });
            hiloAudio.playCardDeal();
            setRound(started);
            // Let the deal animation play before the card turns face-up.
            schedule(() => {
                hiloAudio.playCardFlip();
                setPhase('awaiting_prediction');
            }, 220);
        } catch (err: any) {
            // A 409 means a round was already in flight (a second tab, or a
            // retried request) - resume it rather than showing an error.
            if (err instanceof ApiError && err.status === 409 && err.errors?.active_round) {
                setRound(err.errors.active_round as HiLoRoundState);
                setPhase('awaiting_prediction');
            } else {
                setErrorMessage(err?.message || 'Unable to start the round. Please try again.');
                setPhase('idle');
            }
        } finally {
            setBusy(false);
        }
    };

    const handlePredict = async (direction: HiLoDirection) => {
        if (!round || busy || phase !== 'awaiting_prediction') return;

        hiloAudio.unlockAudio();
        hiloAudio.playButtonClick();
        vibrate(12);
        setBusy(true);
        setErrorMessage(null);
        setPreviousCard(round.current_card);
        setRevealCard(null);
        setLastOutcome(null);
        setPhase('revealing');

        try {
            // steps_taken is the index of the prediction being made - the
            // server rejects a stale one instead of drawing a second card
            // for the same face-up card.
            const { step, round: updated } = await hiloApi.predict({
                prediction: direction,
                step_index: round.steps_taken,
            });

            setRevealCard(step.to_card);
            hiloAudio.playCardFlip();

            // Hold the flip before reacting, so the result lands with the
            // card rather than ahead of it.
            schedule(() => {
                setLastOutcome(step.outcome);
                if (step.outcome === 'win') {
                    hiloAudio.playCorrect(updated.streak);
                    vibrate([12, 30, 12]);
                    setPhase('win');
                } else if (step.outcome === 'push') {
                    hiloAudio.playPush();
                    setPhase('push');
                } else {
                    hiloAudio.playWrong();
                    vibrate([60, 30, 90]);
                    setPhase('loss');
                }

                schedule(() => {
                    if (updated.status !== 'active') {
                        // Busted, or the server force-settled at the cap.
                        if (updated.status === 'cashed_out') {
                            if (updated.capped) hiloAudio.playJackpot();
                            else hiloAudio.playCashOut(Number(updated.multiplier));
                        }
                        finishRound(updated);
                        return;
                    }
                    setRound(updated);
                    setPreviousCard(step.from_card);
                    setPhase('awaiting_prediction');
                }, OUTCOME_HOLD_MS);
            }, FLIP_MS);
        } catch (err: any) {
            // 409 = the prediction was already resolved (duplicate click or
            // a retry). The server hands back the authoritative round, so
            // re-sync to it instead of surfacing a failure.
            if (err instanceof ApiError && err.status === 409 && err.errors?.round) {
                const authoritative = err.errors.round as HiLoRoundState;
                if (authoritative.status === 'active') {
                    setRound(authoritative);
                    setPhase('awaiting_prediction');
                } else {
                    finishRound(authoritative);
                }
            } else {
                setErrorMessage(err?.message || 'Unable to make that prediction. Please try again.');
                setPhase('awaiting_prediction');
            }
        } finally {
            setBusy(false);
        }
    };

    const handleCashOut = async () => {
        if (!round || busy || phase !== 'awaiting_prediction' || !round.can_cash_out) return;
        hiloAudio.playButtonClick();
        vibrate(20);
        setBusy(true);
        try {
            const finished = await hiloApi.cashOut();
            if (finished.capped) hiloAudio.playJackpot();
            else hiloAudio.playCashOut(Number(finished.multiplier));
            finishRound(finished);
        } catch (err: any) {
            setErrorMessage(err?.message || 'Unable to cash out. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    if (configError) {
        return (
            <DashboardLayout>
                <ImmersiveGameShell gameName="Rollin Hi-Lo" onInfoClick={() => setRulesOpen(true)}>
                    <div className={styles.errorPanel}>{configError}</div>
                </ImmersiveGameShell>
            </DashboardLayout>
        );
    }

    const table = (
        <HiLoTable
            phase={phase}
            round={round}
            resultRound={resultRound}
            previousCard={previousCard}
            revealCard={revealCard}
            lastOutcome={lastOutcome}
            history={history}
            soundMuted={muted}
            onToggleMute={handleToggleMute}
        />
    );

    return (
        <DashboardLayout>
            <ImmersiveGameShell gameName="Rollin Hi-Lo" onInfoClick={() => setRulesOpen(true)}>
                <div className={styles.page}>
                    <div className={styles.stageWrap}>
                        {table}
                        {config && (
                            <div className={styles.mobileControls}>
                                <HiLoControls
                                    config={config}
                                    wagerInput={wagerInput}
                                    onWagerChange={setWagerInput}
                                    balance={effectiveBalance}
                                    round={round}
                                    phase={phase}
                                    busy={busy}
                                    onDeal={handleDeal}
                                    onPredict={handlePredict}
                                    onCashOut={handleCashOut}
                                    variant="mobile"
                                />
                            </div>
                        )}
                    </div>

                    {/* Desktop: the right-hand controls column (stage on the
                        left), mirroring Plinko / Rocket. On mobile this is
                        `display: contents` and the panel variant is hidden,
                        leaving the docked mobile controls above. */}
                    <div className={styles.controlsCol}>
                        <div className={styles.controlsHeader}>
                            <p className={styles.eyebrow}>Games</p>
                            {/* ImmersiveGameShell's header - and the info
                                button in it - is mobile-only, so on desktop
                                this is the only way into the rules. */}
                            <div className={styles.titleRow}>
                                <h1 className={styles.gameTitle}>Rollin Hi-Lo</h1>
                                <button
                                    type="button"
                                    className={styles.howToPlayButton}
                                    onClick={() => setRulesOpen(true)}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4" />
                                        <path d="M12 8h.01" />
                                    </svg>
                                    How to Play
                                </button>
                            </div>
                            <div className={styles.balanceRow}>
                                <span>Reward Points</span>
                                <strong>{effectiveBalance.toLocaleString()} RP</strong>
                            </div>
                        </div>

                        {config && (
                            <div className={styles.panelControls}>
                                <HiLoControls
                                    config={config}
                                    wagerInput={wagerInput}
                                    onWagerChange={setWagerInput}
                                    balance={effectiveBalance}
                                    round={round}
                                    phase={phase}
                                    busy={busy}
                                    onDeal={handleDeal}
                                    onPredict={handlePredict}
                                    onCashOut={handleCashOut}
                                />
                            </div>
                        )}

                        {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

                        <div className={styles.historyPanel}>
                            <HiLoHistoryStrip items={history} />
                        </div>
                    </div>
                </div>
            </ImmersiveGameShell>
            <HiLoRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
        </DashboardLayout>
    );
}
