'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { Toast } from '@/components/ui/Toast';
import { PlinkoBoard } from '@/components/games/plinko/PlinkoBoard';
import { PlinkoControls } from '@/components/games/plinko/PlinkoControls';
import { ResultPanel } from '@/components/games/plinko/ResultPanel';
import { useAuth } from '@/contexts/AuthContext';
import { emitPointsUpdated, usePointsBalance } from '@/hooks/usePointsBalance';
import { plinkoApi } from '@/lib/plinko';
import { PlinkoConfig, PlinkoRiskLevel, PlinkoRound, PlinkoRows } from '@/types';
import styles from './page.module.css';

type ToastState = { message: string; type: 'success' | 'error' } | null;

export default function PlinkoPage() {
    const { user } = useAuth();
    const balance = usePointsBalance();
    const [config, setConfig] = useState<PlinkoConfig | null>(null);
    const [rows, setRows] = useState<PlinkoRows>(8);
    const [riskLevel, setRiskLevel] = useState<PlinkoRiskLevel>('low');
    const [wagerAmount, setWagerAmount] = useState('10');
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeRound, setActiveRound] = useState<PlinkoRound | null>(null);
    const [lastRound, setLastRound] = useState<PlinkoRound | null>(null);
    const [error, setError] = useState('');
    const [toast, setToast] = useState<ToastState>(null);

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

    const handleRelease = async (dropOffset: number) => {
        const wager = Number(wagerAmount);
        if (!wager || wager < 1) {
            setError('Enter a valid wager.');
            return;
        }
        setError('');
        setIsPlaying(true);
        setLastRound(null);
        try {
            const round = await plinkoApi.play({ rows, risk_level: riskLevel, wager_amount: wager, drop_offset: dropOffset });
            setActiveRound(round);
        } catch (err: any) {
            setError(err?.message || 'Unable to play Plinko right now.');
            setIsPlaying(false);
        }
    };

    const handleLanded = () => {
        if (!activeRound) return;
        setLastRound(activeRound);
        setIsPlaying(false);
        emitPointsUpdated();
        const net = activeRound.payout_amount - activeRound.wager_amount;
        setToast({
            message: net >= 0
                ? `You won ${activeRound.payout_amount.toLocaleString()} points!`
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

    return (
        <DashboardLayout>
            <main className={styles.main}>
                <div className={styles.layout}>
                    <div className={styles.boardColumn}>
                        <PlinkoBoard
                            rows={rows}
                            multipliers={multipliers}
                            path={activeRound ? activeRound.path : null}
                            disabled={isPlaying}
                            onRelease={handleRelease}
                            onLanded={handleLanded}
                        />
                    </div>

                    <aside className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>
                            <p className={styles.eyebrow}>Games</p>
                            <h1>Plinko</h1>
                            <p className={styles.description}>Drop the ball, bet on the bounce.</p>
                        </div>

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
                            onRowsChange={setRows}
                            onRiskChange={setRiskLevel}
                            onWagerChange={setWagerAmount}
                        />

                        {error && <p className={styles.errorText}>{error}</p>}
                        {lastRound && <ResultPanel round={lastRound} />}
                    </aside>
                </div>
            </main>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </DashboardLayout>
    );
}
