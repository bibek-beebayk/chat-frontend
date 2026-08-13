'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { Toast } from '@/components/ui/Toast';
import { PlinkoCanvas, PlinkoCanvasHandle } from '@/components/games/plinko/PlinkoCanvas';
import { PlinkoControls } from '@/components/games/plinko/PlinkoControls';
import { ResultPanel } from '@/components/games/plinko/ResultPanel';
import { playWinChime, unlockAudio, WinTier } from '@/components/games/plinko/audio';
import { useAuth } from '@/contexts/AuthContext';
import { emitPointsUpdated, usePointsBalance } from '@/hooks/usePointsBalance';
import { plinkoApi } from '@/lib/plinko';
import { PlinkoConfig, PlinkoRiskLevel, PlinkoRound, PlinkoRows } from '@/types';
import styles from './page.module.css';

type ToastState = { message: string; type: 'success' | 'error' } | null;

function winTierFor(multiplier: number): WinTier {
    if (multiplier < 1) return 'minimal';
    if (multiplier < 2) return 'subtle';
    if (multiplier < 5) return 'medium';
    if (multiplier < 20) return 'large';
    return 'extreme';
}

export default function PlinkoPage() {
    const { user } = useAuth();
    const balance = usePointsBalance();
    const [config, setConfig] = useState<PlinkoConfig | null>(null);
    const [rows, setRows] = useState<PlinkoRows>(8);
    const [riskLevel, setRiskLevel] = useState<PlinkoRiskLevel>('low');
    const [wagerAmount, setWagerAmount] = useState('10');
    const [isPlaying, setIsPlaying] = useState(false);
    const [pendingRound, setPendingRound] = useState<PlinkoRound | null>(null);
    const [lastRound, setLastRound] = useState<PlinkoRound | null>(null);
    const [error, setError] = useState('');
    const [toast, setToast] = useState<ToastState>(null);
    // Small-screen only: balance/rows/risk/wager/result live behind this
    // toggle so the board can stay front and center; irrelevant on desktop,
    // where that panel is always visible regardless of this flag.
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const canvasRef = useRef<PlinkoCanvasHandle>(null);

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
            })
            .catch(() => setError('Unable to load Plinko configuration.'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDrop = async () => {
        // Drop is the actual gesture that starts a round - unlock audio here
        // too, not just on a board tap, so peg-hit/landing sounds work even
        // if the player never touched the board directly before dropping.
        unlockAudio();
        const wager = Number(wagerAmount);
        if (!wager || wager < 1) {
            setError('Enter a valid wager.');
            return;
        }
        setError('');
        setIsPlaying(true);
        setIsSettingsOpen(false);
        setLastRound(null);
        try {
            // No drop_offset sent - the ball always launches from top-center now;
            // the backend field/param stays wired for backwards compatibility
            // and simply defaults to 0 (unbiased) when omitted.
            const round = await plinkoApi.play({ rows, risk_level: riskLevel, wager_amount: wager });
            setPendingRound(round);
            canvasRef.current?.play(round.rows, round.slot_index);
        } catch (err: any) {
            setError(err?.message || 'Unable to play Plinko right now.');
            setIsPlaying(false);
        }
    };

    const handleLanded = () => {
        if (!pendingRound) return;
        setLastRound(pendingRound);
        setIsPlaying(false);
        emitPointsUpdated();
        const net = pendingRound.payout_amount - pendingRound.wager_amount;
        const multiplier = Number(pendingRound.multiplier);
        playWinChime(winTierFor(multiplier));
        setToast({
            message: net >= 0
                ? `You won ${pendingRound.payout_amount.toLocaleString()} points!`
                : `You lost ${Math.abs(net).toLocaleString()} points.`,
            type: net >= 0 ? 'success' : 'error',
        });
    };

    if (!user || user.user_type !== 'player') {
        return (
            <DashboardLayout>
                <PageShell title="Plinko" eyebrow="Games" description="Drop the ball, bet on the bounce." centered>
                    <section className={styles.emptyState}>
                        <p>Plinko is available for player accounts.</p>
                    </section>
                </PageShell>
            </DashboardLayout>
        );
    }

    if (!config) {
        return (
            <DashboardLayout>
                <PageShell title="Plinko" eyebrow="Games" description="Drop the ball, bet on the bounce." centered>
                    <div className={styles.loadingArea}><div className="spinner"></div></div>
                </PageShell>
            </DashboardLayout>
        );
    }

    const multipliers = config.multipliers[String(rows)]?.[riskLevel] || [];
    const wagerNumber = Number(wagerAmount);
    const maxWager = Math.min(config.max_wager, balance);
    const isValidWager = wagerNumber >= config.min_wager && wagerNumber <= maxWager;

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
                        <PlinkoCanvas
                            ref={canvasRef}
                            rows={rows}
                            multipliers={multipliers}
                            onLanded={handleLanded}
                        />
                    </div>

                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <p className={styles.eyebrow}>Games</p>
                            <h1>Plinko</h1>
                            <p className={styles.description}>Drop the ball, bet on the bounce.</p>
                        </div>

                        <div className={`${styles.settingsPanel} ${isSettingsOpen ? styles.settingsPanelOpen : ''}`}>
                            <div className={styles.balanceRow}>
                                <span>Your balance</span>
                                <strong>{balance.toLocaleString()} pts</strong>
                            </div>

                            <PlinkoControls
                                config={config}
                                rows={rows}
                                riskLevel={riskLevel}
                                wagerAmount={wagerAmount}
                                balance={balance}
                                disabled={isPlaying}
                                isValidWager={isValidWager}
                                onRowsChange={setRows}
                                onRiskChange={setRiskLevel}
                                onWagerChange={setWagerAmount}
                                onDrop={handleDrop}
                            />

                            {error && <p className={styles.errorText}>{error}</p>}
                            {lastRound && <ResultPanel round={lastRound} />}
                        </div>
                    </aside>
                </div>
            </main>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
