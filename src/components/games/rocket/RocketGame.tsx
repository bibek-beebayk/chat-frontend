'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ImmersiveGameShell } from '@/components/games/shared/ImmersiveGameShell';
import { emitPointsUpdated, usePointsBalance } from '@/hooks/usePointsBalance';
import { ApiError } from '@/lib/api';
import { rocketApi } from '@/lib/rocket';
import { RocketConfig, RocketHistoryItem, RocketRoundState } from '@/types';
import { RocketDisplay } from './RocketDisplay';
import { RocketControls } from './RocketControls';
import { RocketHistoryStrip } from './RocketHistoryStrip';
import { RocketRulesModal } from './RocketRulesModal';
import styles from './RocketGame.module.css';

const POLL_INTERVAL_MS = 150;
// How long the SUCCESS/CRASHED result stays on screen before the next
// round's betting UI reappears - kept short per the design brief ("keep
// result animation short so the next round begins quickly").
const RESULT_DISPLAY_MS = 2600;

function makeClientRequestId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `rocket-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function RocketGame() {
    const [config, setConfig] = useState<RocketConfig | null>(null);
    const [configError, setConfigError] = useState<string | null>(null);
    const polledBalance = usePointsBalance();
    const [balanceOverride, setBalanceOverride] = useState<number | null>(null);

    const [currentRound, setCurrentRound] = useState<RocketRoundState | null>(null);
    // A snapshot of the last terminal round, shown as the result banner for
    // RESULT_DISPLAY_MS after currentRound resolves - kept separate from
    // currentRound so the betting controls can re-enable immediately while
    // the result is still visible.
    const [resultRound, setResultRound] = useState<RocketRoundState | null>(null);

    const [wagerInput, setWagerInput] = useState('10');
    const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
    const [autoCashoutInput, setAutoCashoutInput] = useState('2.00');

    const [busy, setBusy] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [rulesOpen, setRulesOpen] = useState(false);

    const [history, setHistory] = useState<RocketHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    const pollTimerRef = useRef<number | null>(null);
    const resultTimerRef = useRef<number | null>(null);
    // Guards against a slow in-flight poll response landing after a newer
    // one (or after cash-out already moved the round to a terminal state)
    // and clobbering it with stale data.
    const roundIdRef = useRef<number | null>(null);

    const loadHistory = useCallback(() => {
        setHistoryLoading(true);
        rocketApi.getHistory()
            .then(setHistory)
            .catch(() => {})
            .finally(() => setHistoryLoading(false));
    }, []);

    const clearPollTimer = useCallback(() => {
        if (pollTimerRef.current !== null) {
            window.clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    }, []);

    const finishRound = useCallback((round: RocketRoundState) => {
        clearPollTimer();
        setCurrentRound(null);
        setResultRound(round);
        setBalanceOverride(round.balance_after != null ? Number(round.balance_after) : null);
        emitPointsUpdated();
        loadHistory();

        if (resultTimerRef.current !== null) window.clearTimeout(resultTimerRef.current);
        resultTimerRef.current = window.setTimeout(() => {
            setResultRound(null);
            resultTimerRef.current = null;
        }, RESULT_DISPLAY_MS);
    }, [clearPollTimer, loadHistory]);

    const pollOnce = useCallback(async () => {
        try {
            const round = await rocketApi.getCurrent();
            if (!round || round.round_id !== roundIdRef.current) return;

            if (round.status === 'active') {
                setCurrentRound(round);
                pollTimerRef.current = window.setTimeout(pollOnce, POLL_INTERVAL_MS);
            } else {
                roundIdRef.current = null;
                finishRound(round);
            }
        } catch {
            // Transient network hiccup - keep polling, the next tick will
            // either recover or the round will still be there to resume.
            pollTimerRef.current = window.setTimeout(pollOnce, POLL_INTERVAL_MS);
        }
    }, [finishRound]);

    const startPolling = useCallback((round: RocketRoundState) => {
        roundIdRef.current = round.round_id;
        setCurrentRound(round);
        clearPollTimer();
        pollTimerRef.current = window.setTimeout(pollOnce, POLL_INTERVAL_MS);
    }, [clearPollTimer, pollOnce]);

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
                if (round && round.status === 'active') startPolling(round);
            })
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return () => {
            clearPollTimer();
            if (resultTimerRef.current !== null) window.clearTimeout(resultTimerRef.current);
        };
    }, [clearPollTimer]);

    const effectiveBalance = balanceOverride ?? polledBalance;
    const busyOrActive = busy || currentRound !== null;

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

        setBusy(true);
        setErrorMessage(null);
        setResultRound(null);
        if (resultTimerRef.current !== null) {
            window.clearTimeout(resultTimerRef.current);
            resultTimerRef.current = null;
        }

        try {
            const round = await rocketApi.play({
                wager_amount: wagerAmount,
                auto_cashout_multiplier: autoCashoutMultiplier,
                client_request_id: makeClientRequestId(),
            });
            startPolling(round);
        } catch (err: any) {
            // A 409 means we already had an active round in flight (e.g. a
            // second tab, or a retried request) - resume it instead of
            // just showing an error, matching the reconnection behavior.
            if (err instanceof ApiError && err.status === 409 && err.errors?.active_round) {
                startPolling(err.errors.active_round as RocketRoundState);
            } else {
                setErrorMessage(err?.message || 'Unable to start the round. Please try again.');
            }
        } finally {
            setBusy(false);
        }
    };

    const handleCashOut = async () => {
        if (!currentRound || currentRound.phase !== 'running' || busy) return;
        setBusy(true);
        try {
            const round = await rocketApi.cashOut();
            roundIdRef.current = null;
            finishRound(round);
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

    const displayRound = currentRound || resultRound;

    return (
        <DashboardLayout>
            <ImmersiveGameShell gameName="Rollin Rocket" onInfoClick={() => setRulesOpen(true)}>
                <div className={styles.page}>
                    <div className={styles.boardCard}>
                        <RocketDisplay round={displayRound} config={config} />

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
                                round={currentRound}
                                busy={busy}
                                onPlaceBet={handlePlaceBet}
                                onCashOut={handleCashOut}
                            />
                        )}

                        {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}
                    </div>

                    <RocketHistoryStrip items={history} loading={historyLoading} />
                </div>
            </ImmersiveGameShell>
            <RocketRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
        </DashboardLayout>
    );
}
