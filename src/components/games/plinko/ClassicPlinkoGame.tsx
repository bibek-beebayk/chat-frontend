'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PlinkoCanvas, PlinkoCanvasHandle } from '@/components/games/plinko/PlinkoCanvas';
import { PlinkoControls } from '@/components/games/plinko/PlinkoControls';
import { PlinkoPopupState, PlinkoResultPopup } from '@/components/games/plinko/PlinkoResultPopup';
import { ResultPanel } from '@/components/games/plinko/ResultPanel';
import { PlinkoModeSelector } from '@/components/games/plinko/shared/PlinkoModeSelector';
import { PlinkoRulesModal } from '@/components/games/plinko/shared/PlinkoRulesModal';
import { ImmersiveGameShell } from '@/components/games/shared/ImmersiveGameShell';
import { playWinChime, unlockAudio, WinTier } from '@/components/games/plinko/audio';
import { emitPointsUpdated, usePointsBalance } from '@/hooks/usePointsBalance';
import { formatPoints } from '@/lib/points';
import { plinkoApi } from '@/lib/plinko';
import { PlinkoConfig, PlinkoMode, PlinkoRiskLevel, PlinkoRound, PlinkoRows, PlinkoWager } from '@/types';
import styles from '@/app/games/plinko/page.module.css';

// Pause between the end of one autoplay round and the start of the next, so
// the player can actually see the landing result before the ball resets.
const AUTOPLAY_CONTINUE_DELAY_MS = 1100;

function winTierFor(multiplier: number): WinTier {
    if (multiplier < 1) return 'minimal';
    if (multiplier < 2) return 'subtle';
    if (multiplier < 5) return 'medium';
    if (multiplier < 20) return 'large';
    return 'extreme';
}

interface ClassicPlinkoGameProps {
    mode: PlinkoMode;
    onModeChange: (mode: PlinkoMode) => void;
}

/**
 * Classic Plinko - fixed center drop, triangular peg board. This component
 * is a near-verbatim extraction of what used to be the entire page.tsx body
 * (see app/games/plinko/page.tsx, now a thin mode-selecting shell), plus the
 * mode selector. Kept deliberately independent from FreeDropPlinkoGame (own
 * state, own effects) rather than a single component branching on mode, so
 * changes to Free Drop can't regress this mode and vice versa.
 */
export function ClassicPlinkoGame({ mode, onModeChange }: ClassicPlinkoGameProps) {
    const balance = usePointsBalance();
    const [config, setConfig] = useState<PlinkoConfig | null>(null);
    const [rows, setRows] = useState<PlinkoRows>(8);
    const [riskLevel, setRiskLevel] = useState<PlinkoRiskLevel>('low');
    const [wagerAmount, setWagerAmount] = useState<PlinkoWager>(10);
    const [isPlaying, setIsPlaying] = useState(false);
    const [pendingRound, setPendingRound] = useState<PlinkoRound | null>(null);
    const [lastRound, setLastRound] = useState<PlinkoRound | null>(null);
    const [error, setError] = useState('');
    const [popup, setPopup] = useState<PlinkoPopupState>(null);
    const [rulesOpen, setRulesOpen] = useState(false);
    // Stable identity so the popup's auto-dismiss timer (keyed on this prop)
    // doesn't get reset by unrelated page re-renders - autoplay re-renders
    // this page every ~1.1s, and an inline arrow here would recreate on
    // every one of those.
    const closePopup = useCallback(() => setPopup(null), []);
    // null = autoplay off. A number is the rounds still left to run - the
    // picker (5/10/20) is shown separately via autoplayMenuOpen, before a
    // count is chosen and the session actually starts.
    const [autoplayRemaining, setAutoplayRemaining] = useState<number | null>(null);
    const [autoplayMenuOpen, setAutoplayMenuOpen] = useState(false);
    const canvasRef = useRef<PlinkoCanvasHandle>(null);
    const autoplayTimeoutRef = useRef<number | null>(null);
    // Running totals for the active autoplay session, so a single cumulative
    // popup can be shown when it ends instead of one popup per round (which
    // would be far too disruptive at ~1.1s/round). Reset when a new session
    // starts; read and reset again whenever a session ends.
    const autoplayStatsRef = useRef({ rounds: 0, totalWager: 0, totalPayout: 0 });
    // Bumped every time a popup is shown so it always remounts (key change)
    // instead of just re-rendering with new props - guarantees the entrance
    // animation replays even if a new result arrives while the previous
    // popup is still visible/animating (e.g. dropping again immediately
    // after a manual round, before its popup has auto-dismissed).
    const popupKeyRef = useRef(0);
    // handleDrop closes over rows/riskLevel/wagerAmount/balance, which can
    // change between renders; the autoplay continuation timer fires after a
    // delay, so it reads through this ref to always call the latest version
    // instead of a stale one captured when the timer was scheduled.
    const handleDropRef = useRef<() => void>(() => {});

    // Changing the board configuration makes the previously displayed result
    // belong to a different setup - clear it so the result panel always
    // represents the current rows/risk selection, not a stale prior round.
    useEffect(() => {
        setLastRound(null);
    }, [rows, riskLevel]);

    useEffect(() => {
        plinkoApi.getConfig()
            .then((data) => {
                setConfig(data);
                if (!data.rows_options.includes(rows)) setRows(data.rows_options[0]);
                if (!data.risk_options.includes(riskLevel)) setRiskLevel(data.risk_options[0]);
                if (!data.wager_options.includes(wagerAmount)) setWagerAmount(data.wager_options[0]);
            })
            .catch(() => setError('Unable to load Plinko configuration.'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cancel any pending auto-continue timer on unmount so it can't fire
    // (and call handleDrop) after the page is gone.
    useEffect(() => {
        return () => {
            if (autoplayTimeoutRef.current !== null) {
                window.clearTimeout(autoplayTimeoutRef.current);
            }
        };
    }, []);

    // Ends the current autoplay session (natural completion, a manual
    // toggle-off, or a failed/insufficient-balance round) and - if at least
    // one round actually ran - shows a single cumulative result popup
    // instead of the per-round one, then resets the running totals.
    const stopAutoplay = () => {
        if (autoplayTimeoutRef.current !== null) {
            window.clearTimeout(autoplayTimeoutRef.current);
            autoplayTimeoutRef.current = null;
        }
        setAutoplayRemaining(null);
        setAutoplayMenuOpen(false);

        const stats = autoplayStatsRef.current;
        if (stats.rounds > 0) {
            popupKeyRef.current += 1;
            setPopup({ kind: 'autoplay', rounds: stats.rounds, totalWager: stats.totalWager, totalPayout: stats.totalPayout });
            const returnRatio = stats.totalWager > 0 ? stats.totalPayout / stats.totalWager : 1;
            playWinChime(winTierFor(returnRatio));
            autoplayStatsRef.current = { rounds: 0, totalWager: 0, totalPayout: 0 };
        }
    };

    const handleDrop = async () => {
        // Drop is the actual gesture that starts a round - unlock audio here
        // too, not just on a board tap, so peg-hit/landing sounds work even
        // if the player never touched the board directly before dropping.
        unlockAudio();
        if (wagerAmount > balance) {
            setError('You do not have enough points for this wager.');
            stopAutoplay();
            return;
        }
        setError('');
        setIsPlaying(true);
        setLastRound(null);
        try {
            // No drop_offset sent - the ball always launches from top-center now;
            // the backend field/param stays wired for backwards compatibility
            // and simply defaults to 0 (unbiased) when omitted.
            const round = await plinkoApi.play({ rows, risk_level: riskLevel, wager_amount: wagerAmount });
            setPendingRound(round);
            canvasRef.current?.play(round.rows, round.slot_index);
        } catch (err: any) {
            setError(err?.message || 'Unable to play Plinko right now.');
            setIsPlaying(false);
            // A failed round (network error, server-side rejection, etc.)
            // must not silently keep retrying every ~1s - stop the session
            // and surface the error like a normal failed drop.
            stopAutoplay();
        }
    };
    handleDropRef.current = handleDrop;

    const handleLanded = () => {
        if (!pendingRound) return;
        setLastRound(pendingRound);
        setIsPlaying(false);
        emitPointsUpdated();
        // payout_amount/wager_amount are Decimal - payout_amount serializes as
        // a string, so parse before doing arithmetic or formatting.
        const payout = Number(pendingRound.payout_amount);
        const multiplier = Number(pendingRound.multiplier);
        playWinChime(winTierFor(multiplier));

        // Read autoplayRemaining directly from this render's closure (fresh,
        // same as pendingRound above) rather than via a setState updater
        // function - React is allowed to invoke updater functions more than
        // once (Next.js dev mode double-invokes them deliberately via
        // StrictMode), and a setTimeout side effect inside one used to fire
        // twice, silently starting an extra autoplay round.
        if (autoplayRemaining !== null) {
            // Part of an autoplay session - accumulate into the running
            // total instead of popping up a result every ~1.1s; the summary
            // shows once, when the session actually ends (see stopAutoplay).
            const stats = autoplayStatsRef.current;
            stats.rounds += 1;
            stats.totalWager += pendingRound.wager_amount;
            stats.totalPayout += payout;

            const next = autoplayRemaining - 1;
            if (next <= 0) {
                stopAutoplay();
            } else {
                setAutoplayRemaining(next);
                autoplayTimeoutRef.current = window.setTimeout(() => {
                    autoplayTimeoutRef.current = null;
                    handleDropRef.current();
                }, AUTOPLAY_CONTINUE_DELAY_MS);
            }
        } else {
            popupKeyRef.current += 1;
            setPopup({ kind: 'round', round: pendingRound });
        }
    };

    const handleToggleAutoplay = () => {
        if (autoplayRemaining !== null) {
            stopAutoplay();
            return;
        }
        setAutoplayMenuOpen((open) => !open);
    };

    const handleSelectAutoplayCount = (count: number) => {
        setAutoplayMenuOpen(false);
        setAutoplayRemaining(count);
        // Defensive: stopAutoplay() already leaves this zeroed by the time a
        // new session can start, but zeroing again here makes "every
        // session starts from zero" true independent of that ordering.
        autoplayStatsRef.current = { rounds: 0, totalWager: 0, totalPayout: 0 };
        handleDropRef.current();
    };

    if (!config) {
        return (
            <DashboardLayout>
                <ImmersiveGameShell gameName="Plinko" onInfoClick={() => setRulesOpen(true)}>
                    <div className={styles.loadingArea}><div className="spinner"></div></div>
                </ImmersiveGameShell>
            </DashboardLayout>
        );
    }

    const multipliers = config.multipliers[String(rows)]?.[riskLevel] || [];
    const isValidWager = wagerAmount <= balance;
    // Rows/Risk/Wager and Drop all lock for the whole autoplay session, not
    // just while a single round is physically resolving.
    const controlsDisabled = isPlaying || autoplayRemaining !== null;

    return (
        <DashboardLayout>
            <ImmersiveGameShell gameName="Plinko" onInfoClick={() => setRulesOpen(true)}>
            <main className={styles.main}>
                <div className={styles.layout}>
                    <div className={styles.boardColumn}>
                        <PlinkoCanvas
                            ref={canvasRef}
                            rows={rows}
                            multipliers={multipliers}
                            onLanded={handleLanded}
                        />
                        <PlinkoResultPopup key={popupKeyRef.current} state={popup} onClose={closePopup} />
                    </div>

                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <p className={styles.eyebrow}>Games</p>
                            <h1>Plinko</h1>
                            <p className={styles.description}>Drop the ball, bet on the bounce.</p>
                        </div>

                        <div className={styles.modeSelectorWrap}>
                            <PlinkoModeSelector mode={mode} disabled={controlsDisabled} onChange={onModeChange} />
                        </div>

                        <div className={styles.compactResultWrap}>
                            {lastRound && <ResultPanel round={lastRound} compact />}
                        </div>

                        <div className={styles.settingsPanel}>
                            <div className={styles.balanceRow}>
                                <span>Your balance</span>
                                <strong>{formatPoints(balance)} pts</strong>
                            </div>

                            <PlinkoControls
                                config={config}
                                rows={rows}
                                riskLevel={riskLevel}
                                wagerAmount={wagerAmount}
                                disabled={controlsDisabled}
                                isValidWager={isValidWager}
                                autoplayRemaining={autoplayRemaining}
                                autoplayMenuOpen={autoplayMenuOpen}
                                onRowsChange={setRows}
                                onRiskChange={setRiskLevel}
                                onWagerChange={setWagerAmount}
                                onDrop={handleDrop}
                                onToggleAutoplay={handleToggleAutoplay}
                                onCloseAutoplayMenu={() => setAutoplayMenuOpen(false)}
                                onSelectAutoplayCount={handleSelectAutoplayCount}
                            />

                            {error && <p className={styles.errorText}>{error}</p>}
                            {lastRound && (
                                <div className={styles.fullResultWrap}>
                                    <ResultPanel round={lastRound} />
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </main>
            <PlinkoRulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} mode={mode} multipliers={multipliers} />
            </ImmersiveGameShell>
        </DashboardLayout>
    );
}
