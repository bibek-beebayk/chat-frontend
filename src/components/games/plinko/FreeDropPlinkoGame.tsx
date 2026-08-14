'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FreeDropPlinkoCanvas, FreeDropPlinkoCanvasHandle } from '@/components/games/plinko/FreeDropPlinkoCanvas';
import { PlinkoControls } from '@/components/games/plinko/PlinkoControls';
import { PlinkoPopupState, PlinkoResultPopup } from '@/components/games/plinko/PlinkoResultPopup';
import { ResultPanel } from '@/components/games/plinko/ResultPanel';
import { PlinkoModeSelector } from '@/components/games/plinko/shared/PlinkoModeSelector';
import { playWinChime, unlockAudio, WinTier } from '@/components/games/plinko/audio';
import { emitPointsUpdated, usePointsBalance } from '@/hooks/usePointsBalance';
import { formatPoints } from '@/lib/points';
import { plinkoApi } from '@/lib/plinko';
import { FreeDropConfig, PlinkoMode, PlinkoRiskLevel, PlinkoRound, PlinkoRows, PlinkoWager } from '@/types';
import styles from '@/app/games/plinko/page.module.css';

// Same pacing as Classic - see ClassicPlinkoGame.tsx.
const AUTOPLAY_CONTINUE_DELAY_MS = 1100;

function winTierFor(multiplier: number): WinTier {
    if (multiplier < 1) return 'minimal';
    if (multiplier < 2) return 'subtle';
    if (multiplier < 5) return 'medium';
    if (multiplier < 20) return 'large';
    return 'extreme';
}

interface FreeDropPlinkoGameProps {
    mode: PlinkoMode;
    onModeChange: (mode: PlinkoMode) => void;
}

/**
 * Free Drop Plinko - player-positioned drop, equal-pegs-per-row board.
 * Mirrors ClassicPlinkoGame.tsx's structure closely (own independent state,
 * own autoplay orchestration) rather than sharing state with Classic, so
 * switching modes can't leak anything either way - see
 * app/games/plinko/page.tsx for the mode switch itself.
 */
export function FreeDropPlinkoGame({ mode, onModeChange }: FreeDropPlinkoGameProps) {
    const balance = usePointsBalance();
    const [config, setConfig] = useState<FreeDropConfig | null>(null);
    const [rows, setRows] = useState<PlinkoRows>(8);
    const [riskLevel, setRiskLevel] = useState<PlinkoRiskLevel>('low');
    const [wagerAmount, setWagerAmount] = useState<PlinkoWager>(10);
    // Normalized [-1, 1] - center by default. Persists across rounds and
    // across an entire autoplay session (never randomized), only changing
    // when the player actually drags the ball.
    const [dropPosition, setDropPosition] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [pendingRound, setPendingRound] = useState<PlinkoRound | null>(null);
    const [lastRound, setLastRound] = useState<PlinkoRound | null>(null);
    const [error, setError] = useState('');
    const [popup, setPopup] = useState<PlinkoPopupState>(null);
    const closePopup = useCallback(() => setPopup(null), []);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [autoplayRemaining, setAutoplayRemaining] = useState<number | null>(null);
    const [autoplayMenuOpen, setAutoplayMenuOpen] = useState(false);
    const canvasRef = useRef<FreeDropPlinkoCanvasHandle>(null);
    const autoplayTimeoutRef = useRef<number | null>(null);
    const autoplayStatsRef = useRef({ rounds: 0, totalWager: 0, totalPayout: 0 });
    const popupKeyRef = useRef(0);
    // handleDrop closes over rows/riskLevel/wagerAmount/dropPosition/balance,
    // which can change between renders; the autoplay continuation timer
    // fires after a delay, so it reads through this ref to always call the
    // latest version instead of a stale one captured when the timer was
    // scheduled.
    const handleDropRef = useRef<() => void>(() => {});

    useEffect(() => {
        setLastRound(null);
    }, [rows, riskLevel]);

    useEffect(() => {
        plinkoApi.getFreeDropConfig()
            .then((data) => {
                setConfig(data);
                if (!data.rows_options.includes(rows)) setRows(data.rows_options[0]);
                if (!data.risk_options.includes(riskLevel)) setRiskLevel(data.risk_options[0]);
                if (!data.wager_options.includes(wagerAmount)) setWagerAmount(data.wager_options[0]);
            })
            .catch(() => setError('Unable to load Plinko configuration.'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return () => {
            if (autoplayTimeoutRef.current !== null) {
                window.clearTimeout(autoplayTimeoutRef.current);
            }
        };
    }, []);

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
        unlockAudio();
        if (wagerAmount > balance) {
            setError('You do not have enough points for this wager.');
            stopAutoplay();
            return;
        }
        setError('');
        setIsPlaying(true);
        setIsSettingsOpen(false);
        setLastRound(null);
        try {
            const round = await plinkoApi.playFreeDrop({
                rows,
                risk_level: riskLevel,
                wager_amount: wagerAmount,
                drop_position: dropPosition,
            });
            setPendingRound(round);
            // Replay at the server's own (clamped) echoed drop_position, not
            // the raw client state - keeps the visual spawn consistent with
            // what was actually authoritative for this round.
            canvasRef.current?.play(round.rows, round.slot_index, round.drop_position ?? dropPosition);
        } catch (err: any) {
            setError(err?.message || 'Unable to play Plinko right now.');
            setIsPlaying(false);
            stopAutoplay();
        }
    };
    handleDropRef.current = handleDrop;

    const handleLanded = () => {
        if (!pendingRound) return;
        setLastRound(pendingRound);
        setIsPlaying(false);
        emitPointsUpdated();
        const payout = Number(pendingRound.payout_amount);
        const multiplier = Number(pendingRound.multiplier);
        playWinChime(winTierFor(multiplier));

        if (autoplayRemaining !== null) {
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
        autoplayStatsRef.current = { rounds: 0, totalWager: 0, totalPayout: 0 };
        handleDropRef.current();
    };

    if (!config) {
        return (
            <DashboardLayout>
                <div className={styles.loadingArea}><div className="spinner"></div></div>
            </DashboardLayout>
        );
    }

    const multipliers = config.multipliers[String(rows)]?.[riskLevel] || [];
    const isValidWager = wagerAmount <= balance;
    const controlsDisabled = isPlaying || autoplayRemaining !== null;

    return (
        <DashboardLayout>
            <main className={styles.main}>
                <button
                    type="button"
                    className={styles.settingsToggle}
                    onClick={() => setIsSettingsOpen((open) => !open)}
                    aria-label={isSettingsOpen ? 'Close game settings' : 'Open game settings'}
                    aria-expanded={isSettingsOpen}
                >
                    <SettingsIcon />
                </button>
                {isSettingsOpen && (
                    <div className={styles.settingsBackdrop} onClick={() => setIsSettingsOpen(false)} />
                )}

                <div className={styles.layout}>
                    <div className={styles.boardColumn}>
                        <FreeDropPlinkoCanvas
                            ref={canvasRef}
                            rows={rows}
                            multipliers={multipliers}
                            dropPosition={dropPosition}
                            dragDisabled={controlsDisabled}
                            onDropPositionChange={setDropPosition}
                            onLanded={handleLanded}
                        />
                        <PlinkoResultPopup key={popupKeyRef.current} state={popup} onClose={closePopup} />
                    </div>

                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <p className={styles.eyebrow}>Games</p>
                            <h1>Plinko</h1>
                            <p className={styles.description}>Drag the ball, choose your drop, bet on the bounce.</p>
                        </div>

                        <div className={`${styles.settingsPanel} ${isSettingsOpen ? styles.settingsPanelOpen : ''}`}>
                            <PlinkoModeSelector mode={mode} disabled={controlsDisabled} onChange={onModeChange} />

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
                                onSelectAutoplayCount={handleSelectAutoplayCount}
                            />

                            {error && <p className={styles.errorText}>{error}</p>}
                            {lastRound && <ResultPanel round={lastRound} />}
                        </div>
                    </aside>
                </div>
            </main>
        </DashboardLayout>
    );
}

function SettingsIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
            <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
            <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
            <circle cx="9" cy="18" r="2" fill="currentColor" stroke="none" />
        </svg>
    );
}
