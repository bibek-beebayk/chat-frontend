'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { emitPointsUpdated, usePointsBalance } from '@/hooks/usePointsBalance';
import { slotsApi } from '@/lib/slots';
import { SlotConfig, SlotRound } from '@/types';
import { SlotGrid, SlotGridHandle } from './SlotGrid';
import { SlotControls } from './SlotControls';
import { SlotPaytableModal } from './SlotPaytableModal';
import { SlotHistoryPanel } from './SlotHistoryPanel';
import { playResultChime, playSpinStart, unlockAudio, winTierForMultiplier } from './audio';
import styles from './SlotMachine.module.css';

type GameState = 'idle' | 'requesting' | 'spinning' | 'revealing' | 'complete' | 'error';

// Pause between the end of one autoplay round and the start of the next, so
// the player can actually see the result before the reels reset - matches
// Plinko's own autoplay continuation delay.
const AUTOPLAY_CONTINUE_DELAY_MS = 1100;

function makeClientRequestId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `slot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface SlotMachineProps {
    paytableOpen: boolean;
    onOpenPaytable: () => void;
    onClosePaytable: () => void;
}

export function SlotMachine({ paytableOpen, onOpenPaytable, onClosePaytable }: SlotMachineProps) {
    const [config, setConfig] = useState<SlotConfig | null>(null);
    const [configError, setConfigError] = useState<string | null>(null);
    const polledBalance = usePointsBalance();
    const [balanceOverride, setBalanceOverride] = useState<number | null>(null);
    const [wager, setWager] = useState(10);
    const [gameState, setGameState] = useState<GameState>('idle');
    const [lastRound, setLastRound] = useState<SlotRound | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [history, setHistory] = useState<SlotRound[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);
    // null = autoplay off. A number is the rounds still left to run - the
    // picker (5/10/20) is shown separately via autoplayMenuOpen, before a
    // count is chosen and the session actually starts.
    const [autoplayRemaining, setAutoplayRemaining] = useState<number | null>(null);
    const [autoplayMenuOpen, setAutoplayMenuOpen] = useState(false);

    const gridRef = useRef<SlotGridHandle>(null);
    const autoplayTimeoutRef = useRef<number | null>(null);
    // handleSpin closes over wager/autoplayRemaining/effectiveBalance, which
    // change between renders; the autoplay continuation timer fires after a
    // delay, so it reads through this ref to always call the latest version
    // instead of a stale one captured when the timer was scheduled.
    const handleSpinRef = useRef<() => void>(() => {});
    // reveal() is defined inside handleSpin and runs inside its own
    // window.setTimeout - by the time it fires, React may not have
    // re-rendered since the count was chosen/decremented (setState is
    // batched/async), so reading the `autoplayRemaining` state variable
    // there can see a stale value (e.g. still null right after the picker
    // was chosen, causing autoplay to stop after exactly one spin). This
    // ref is updated synchronously wherever autoplayRemaining is set, so
    // reveal() always sees the true current value.
    const autoplayRemainingRef = useRef<number | null>(null);

    const loadHistory = useCallback(() => {
        setHistoryLoading(true);
        setHistoryError(null);
        slotsApi.getHistory()
            .then((rounds) => setHistory(rounds))
            .catch((err) => setHistoryError(err?.message || 'Unable to load spin history.'))
            .finally(() => setHistoryLoading(false));
    }, []);

    useEffect(() => {
        slotsApi.getConfig()
            .then((data) => {
                setConfig(data);
                if (!data.wager_presets.includes(wager)) setWager(data.wager_presets[0]);
            })
            .catch((err) => setConfigError(err?.message || 'Unable to load the Rollin 3x3 slot.'));
        loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadHistory]);

    // Cancel any pending auto-continue timer on unmount so it can't fire
    // (and call handleSpin) after the page is gone.
    useEffect(() => {
        return () => {
            if (autoplayTimeoutRef.current !== null) {
                window.clearTimeout(autoplayTimeoutRef.current);
            }
        };
    }, []);

    const busy = gameState === 'requesting' || gameState === 'spinning' || gameState === 'revealing';
    const effectiveBalance = balanceOverride ?? polledBalance;
    const isValidWager = wager <= effectiveBalance;
    // Preset selector and Autoplay/SPIN lock for the whole autoplay session,
    // not just while a single spin is physically resolving.
    const controlsDisabled = busy || autoplayRemaining !== null;

    const stopAutoplay = () => {
        if (autoplayTimeoutRef.current !== null) {
            window.clearTimeout(autoplayTimeoutRef.current);
            autoplayTimeoutRef.current = null;
        }
        autoplayRemainingRef.current = null;
        setAutoplayRemaining(null);
        setAutoplayMenuOpen(false);
    };

    const handleSpin = async () => {
        if (!config || busy) return;
        if (wager > effectiveBalance) {
            setErrorMessage('You do not have enough Reward Points for this wager.');
            setGameState('error');
            window.setTimeout(() => setGameState('idle'), 1600);
            stopAutoplay();
            return;
        }
        unlockAudio();
        playSpinStart();
        setErrorMessage(null);
        setGameState('requesting');

        let round: SlotRound;
        try {
            round = await slotsApi.play({ wager, client_request_id: makeClientRequestId() });
        } catch (err: any) {
            // Failed before/without a settled round - balance must not change, return to idle.
            setErrorMessage(err?.message || 'Unable to spin right now. Please try again.');
            setGameState('error');
            window.setTimeout(() => setGameState('idle'), 1600);
            stopAutoplay();
            return;
        }

        setGameState('spinning');

        const reveal = () => {
            setLastRound(round);
            setBalanceOverride(Number(round.balance));
            emitPointsUpdated();
            setGameState('revealing');
            window.setTimeout(() => {
                const tier = winTierForMultiplier(Number(round.total_multiplier));
                playResultChime(tier);
                setGameState('complete');
                loadHistory();

                if (autoplayRemainingRef.current !== null) {
                    const next = autoplayRemainingRef.current - 1;
                    if (next <= 0) {
                        stopAutoplay();
                    } else {
                        autoplayRemainingRef.current = next;
                        setAutoplayRemaining(next);
                        autoplayTimeoutRef.current = window.setTimeout(() => {
                            autoplayTimeoutRef.current = null;
                            handleSpinRef.current();
                        }, AUTOPLAY_CONTINUE_DELAY_MS);
                    }
                }
            }, 250);
        };

        // The spin was already charged/settled server-side - if the grid ref
        // is unexpectedly unavailable (animation can't run), the backend
        // result is still authoritative: fall back to revealing it directly
        // instead of leaving the UI stuck or pretending the spin didn't happen.
        if (!gridRef.current) {
            reveal();
            return;
        }

        try {
            gridRef.current.spinAll(round.reel_stops, reveal);
        } catch {
            reveal();
        }
    };
    handleSpinRef.current = handleSpin;

    const handleToggleAutoplay = () => {
        if (autoplayRemainingRef.current !== null) {
            stopAutoplay();
            return;
        }
        setAutoplayMenuOpen((open) => !open);
    };

    const handleSelectAutoplayCount = (count: number) => {
        setAutoplayMenuOpen(false);
        autoplayRemainingRef.current = count;
        setAutoplayRemaining(count);
        handleSpinRef.current();
    };

    if (configError) {
        return <div className={styles.errorPanel}>{configError}</div>;
    }

    return (
        <div className={styles.wrap}>
            {/* Left on desktop: the reels. On mobile .boardCard is a real card
                wrapping the header + reels + controls; on desktop it dissolves
                (display: contents) and its pieces are placed in the 2-column
                grid - reels left, everything else right (mirrors the Plinko
                page layout). */}
            <div className={styles.boardCard}>
                <div className={styles.boardHeader}>
                    <h1 className={styles.title}>Rollin 3x3</h1>
                    <div className={styles.balance}>
                        <span className={styles.balanceLabel}>Reward Points</span>
                        <span className={styles.balanceValue}>{effectiveBalance.toLocaleString()} RP</span>
                    </div>
                </div>

                <div className={styles.gridPanel}>
                    <div className={styles.gridWrap}>
                        {config && (
                            <SlotGrid
                                ref={gridRef}
                                reelStrips={config.reel_strips}
                                winningLines={lastRound?.winning_lines || []}
                                showResult={gameState === 'complete'}
                            />
                        )}
                    </div>

                    <div className={styles.resultArea} aria-live="polite">
                        {gameState === 'error' && errorMessage && (
                            <p className={styles.resultError}>{errorMessage}</p>
                        )}
                        {gameState === 'complete' && lastRound && (
                            <ResultBanner round={lastRound} />
                        )}
                    </div>
                </div>

                <div className={styles.controlsPanel}>
                    {config && (
                        <SlotControls
                            wager={wager}
                            onWagerChange={setWager}
                            presets={config.wager_presets}
                            disabled={controlsDisabled}
                            isValidWager={isValidWager}
                            autoplayRemaining={autoplayRemaining}
                            autoplayMenuOpen={autoplayMenuOpen}
                            onSpin={handleSpin}
                            onToggleAutoplay={handleToggleAutoplay}
                            onCloseAutoplayMenu={() => setAutoplayMenuOpen(false)}
                            onSelectAutoplayCount={handleSelectAutoplayCount}
                        />
                    )}

                    <div className={styles.footerLinks}>
                        <button type="button" className={styles.linkBtn} onClick={onOpenPaytable}>Paytable</button>
                    </div>
                </div>
            </div>

            <div className={styles.sideColumn}>
                <SlotHistoryPanel rounds={history} loading={historyLoading} error={historyError} onRetry={loadHistory} />
            </div>

            <SlotPaytableModal isOpen={paytableOpen} onClose={onClosePaytable} config={config} />
        </div>
    );
}

function ResultBanner({ round }: { round: SlotRound }) {
    const multiplier = Number(round.total_multiplier);
    const payout = Number(round.payout);
    const isWin = multiplier > 0;

    if (!isWin) {
        return (
            <div className={styles.lossBanner}>
                <span className={styles.lossLabel}>No Win</span>
                <span className={styles.lossAmount}>-{round.wager.toLocaleString()} RP</span>
            </div>
        );
    }

    const tier = winTierForMultiplier(multiplier);
    return (
        <div className={`${styles.winBanner} ${tier === 'big' ? styles.winBannerBig : tier === 'medium' ? styles.winBannerMedium : ''}`}>
            <span className={styles.winLabel}>{tier === 'big' ? 'BIG WIN' : 'WIN'}</span>
            <span className={styles.winPayout}>{payout.toLocaleString(undefined, { maximumFractionDigits: 2 })} RP</span>
            <span className={styles.winMultiplier}>{multiplier.toFixed(2)}x</span>
        </div>
    );
}
