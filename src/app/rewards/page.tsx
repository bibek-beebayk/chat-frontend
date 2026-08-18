'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComingSoonPanel, PageShell } from '@/components/layout/PageShell';
import { LoginStreakCard } from '@/components/home/LoginStreakCard';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { emitPointsUpdated } from '@/hooks/usePointsBalance';
import { formatPoints, pointsApi } from '@/lib/points';
import { rewardsApi } from '@/lib/rewards';
import { displayLabelForDailyProgressItem, xpApi } from '@/lib/xp';
import { DailyProgressItem, LoginStreakStatus, PointsBalance, PointsLedgerEntry, PointsRedemptionRequest } from '@/types';
import styles from './page.module.css';

type ToastState = { message: string; type: 'success' | 'error' } | null;
type ChallengeTab = 'daily' | 'weekly' | 'events';

const entryTypeCopy: Record<string, string> = {
    earn: 'Earned',
    redemption_hold: 'Redemption requested',
    redemption_refund: 'Redemption refunded',
    redemption_finalize: 'Redemption completed',
    adjustment: 'Staff adjustment',
};

// Purely decorative per-item icon - there's no icon concept on XPAction
// itself, so this is a small local slug map (same approach as
// DailyChallengesCard's TILE_STYLES) rather than fabricated backend data.
const CHALLENGE_ICONS: Record<string, string> = {
    daily_login: '📅',
    daily_challenge_rounds: '🎲',
};

function formatResetCountdown(msRemaining: number): string {
    const totalMinutes = Math.max(0, Math.floor(msRemaining / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
}

function msUntilNextLocalMidnight(): number {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return nextMidnight.getTime() - now.getTime();
}

export default function RewardsPage() {
    const { user } = useAuth();
    const [balance, setBalance] = useState<PointsBalance | null>(null);
    const [ledger, setLedger] = useState<PointsLedgerEntry[]>([]);
    const [activeRequest, setActiveRequest] = useState<PointsRedemptionRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [pointsAmount, setPointsAmount] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [toast, setToast] = useState<ToastState>(null);

    const [redeemModalOpen, setRedeemModalOpen] = useState(false);

    const [activeTab, setActiveTab] = useState<ChallengeTab>('daily');
    const [dailyProgress, setDailyProgress] = useState<DailyProgressItem[] | null>(null);
    const [dailyLoading, setDailyLoading] = useState(true);
    const [dailyError, setDailyError] = useState<string | null>(null);

    const [streak, setStreak] = useState<LoginStreakStatus | null>(null);
    const [streakLoading, setStreakLoading] = useState(true);
    const [streakError, setStreakError] = useState<string | null>(null);

    const [resetIn, setResetIn] = useState(() => msUntilNextLocalMidnight());

    const loadData = useCallback(async () => {
        if (!user || user.user_type !== 'player') {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // listRedemptions() hits the staff-only redemption_list_view (it
            // returns every player's requests) - a player would always get a
            // 403 there. balance.active_redemption_request is the player's
            // own pending/approved request, scoped server-side.
            const [balanceData, ledgerData] = await Promise.all([
                pointsApi.getBalance(),
                pointsApi.getLedger(),
            ]);
            setBalance(balanceData);
            setLedger(ledgerData);
            setActiveRequest(balanceData.active_redemption_request || null);
        } catch {
            // leave existing state on transient errors
        } finally {
            setLoading(false);
        }
    }, [user]);

    const loadDailyProgress = useCallback(async () => {
        if (!user || user.user_type !== 'player') return;
        setDailyLoading(true);
        setDailyError(null);
        try {
            const items = await xpApi.getDailyProgress();
            setDailyProgress(items);
        } catch (err: any) {
            setDailyError(err?.message || 'Unable to load challenges.');
        } finally {
            setDailyLoading(false);
        }
    }, [user]);

    const loadStreak = useCallback(async () => {
        if (!user || user.user_type !== 'player') return;
        setStreakLoading(true);
        setStreakError(null);
        try {
            const data = await rewardsApi.getStreak();
            setStreak(data);
        } catch (err: any) {
            setStreakError(err?.message || 'Unable to load your streak.');
        } finally {
            setStreakLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
        loadDailyProgress();
        loadStreak();
    }, [loadData, loadDailyProgress, loadStreak]);

    useEffect(() => {
        const timer = window.setInterval(() => setResetIn(msUntilNextLocalMidnight()), 60000);
        return () => window.clearInterval(timer);
    }, []);

    const resetLabel = useMemo(() => formatResetCountdown(resetIn), [resetIn]);

    const submitRedemption = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const amount = Number(pointsAmount);
        if (!amount || amount < 1) {
            setFormError('Enter a valid number of points to redeem.');
            return;
        }
        if (balance && amount > Number(balance.balance)) {
            setFormError('You do not have enough points for this redemption.');
            return;
        }

        setSubmitting(true);
        setFormError('');
        try {
            await pointsApi.requestRedemption({
                points_amount: amount,
                note: note.trim() || undefined,
            });
            setPointsAmount('');
            setNote('');
            emitPointsUpdated();
            await loadData();
            setRedeemModalOpen(false);
            setToast({ message: 'Redemption request submitted.', type: 'success' });
        } catch (error: any) {
            setFormError(error?.message || 'Unable to submit redemption request.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!user || user.user_type !== 'player') {
        return (
            <DashboardLayout>
                <PageShell title="Rewards" eyebrow="Features" description="Bonus progress and reward points." centered>
                    <section className={styles.emptyState}>
                        <p>Reward points are available for player accounts.</p>
                    </section>
                </PageShell>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <PageShell title="" eyebrow="" description="">
                {loading ? (
                    <div className={styles.loadingArea}><div className="spinner"></div></div>
                ) : (
                    <>
                        <section className={styles.balanceHero}>
                            <svg className={styles.balanceIcon} aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            <div className={styles.balanceMain}>
                                <span>Current Reward Points</span>
                                <strong>{formatPoints(balance?.balance ?? 0)}</strong>
                            </div>
                            <button type="button" className={styles.redeemBtn} onClick={() => setRedeemModalOpen(true)}>Redeem</button>
                        </section>

                        <div className={styles.tabRow} role="tablist">
                            {(['daily', 'weekly', 'events'] as ChallengeTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === tab}
                                    className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab === 'daily' ? 'Daily' : tab === 'weekly' ? 'Weekly' : 'Events'}
                                </button>
                            ))}
                        </div>

                        {activeTab === 'daily' ? (
                            <section className={styles.challengesSection}>
                                <div className={styles.sectionHeader}>
                                    <h2>Daily Challenges</h2>
                                    <span className={styles.resetTimer}>Resets in {resetLabel}</span>
                                </div>

                                {dailyLoading && !dailyProgress ? (
                                    <div className={styles.loadingArea}><div className="spinner"></div></div>
                                ) : dailyError && !dailyProgress ? (
                                    <div className={styles.challengesEmpty}>
                                        <p>Unable to load challenges.</p>
                                        <button type="button" className={styles.retryBtn} onClick={loadDailyProgress}>Retry</button>
                                    </div>
                                ) : !dailyProgress || dailyProgress.length === 0 ? (
                                    <div className={styles.challengesEmpty}>No challenges configured right now.</div>
                                ) : (
                                    <div className={styles.challengeList}>
                                        {dailyProgress.map((item) => {
                                            const percent = item.target_count > 0
                                                ? Math.min(100, Math.round((item.current_count / item.target_count) * 100))
                                                : (item.completed ? 100 : 0);
                                            return (
                                                <div key={item.slug} className={styles.challengeRow}>
                                                    <span className={styles.challengeIcon} aria-hidden="true">{CHALLENGE_ICONS[item.slug] || '🎯'}</span>
                                                    <div className={styles.challengeBody}>
                                                        <span className={styles.challengeLabel}>{displayLabelForDailyProgressItem(item)}</span>
                                                        {item.target_count > 1 && (
                                                            <>
                                                                <span className={styles.challengeProgressLabel}>{item.current_count} / {item.target_count}</span>
                                                                <div className={styles.progressTrack}>
                                                                    <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    {item.completed ? (
                                                        <span className={styles.doneBadge} aria-label="Completed">✓</span>
                                                    ) : (
                                                        <span className={styles.xpBadge}>+{item.xp_value} XP</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        ) : activeTab === 'weekly' ? (
                            <ComingSoonPanel title="Weekly Challenges" />
                        ) : (
                            <ComingSoonPanel title="Event Challenges" />
                        )}

                        <section className={styles.rewardsSection}>
                            <h2>Rewards</h2>
                            <div className={styles.rewardTiles}>
                                <LoginStreakCard
                                    streak={streak}
                                    loading={streakLoading}
                                    error={streakError}
                                    onRetry={loadStreak}
                                    onRedeemed={loadStreak}
                                />
                            </div>
                        </section>

                        <section className={styles.ledgerSection}>
                            <h2>Recent Activity</h2>
                            {ledger.length === 0 ? (
                                <p className={styles.emptyLedger}>No points activity yet.</p>
                            ) : (
                                <div className={styles.ledgerList}>
                                    {ledger.map((entry) => (
                                        <div key={entry.id} className={styles.ledgerItem}>
                                            <span>{entry.action?.label || entryTypeCopy[entry.entry_type] || entry.entry_type}</span>
                                            <strong className={Number(entry.delta) >= 0 ? styles.positive : styles.negative}>
                                                {Number(entry.delta) >= 0 ? '+' : ''}{formatPoints(entry.delta)}
                                            </strong>
                                            <time>{formatDate(entry.created_at)}</time>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </PageShell>

            {redeemModalOpen && (
                <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => !submitting && setRedeemModalOpen(false)}>
                    <div className={styles.modal} onMouseDown={(event) => event.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h4>Redeem Reward Points</h4>
                            <button type="button" onClick={() => setRedeemModalOpen(false)} disabled={submitting} aria-label="Close">×</button>
                        </div>
                        {activeRequest ? (
                            <div className={`${styles.requestStatus} ${styles[`status_${activeRequest.status}`] || ''}`}>
                                <span>Redemption request for {activeRequest.points_amount.toLocaleString()} points</span>
                                <strong>{activeRequest.status_label || activeRequest.status}</strong>
                            </div>
                        ) : (
                            <form className={styles.redeemForm} onSubmit={submitRedemption}>
                                <label>
                                    <span>Points to redeem</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={balance?.balance ?? undefined}
                                        value={pointsAmount}
                                        onChange={(event) => setPointsAmount(event.target.value)}
                                        placeholder="e.g. 100"
                                        disabled={submitting}
                                        autoFocus
                                    />
                                </label>
                                <label>
                                    <span>Note (optional)</span>
                                    <textarea
                                        value={note}
                                        onChange={(event) => setNote(event.target.value)}
                                        rows={3}
                                        disabled={submitting}
                                    />
                                </label>
                                {formError && <p className={styles.formError}>{formError}</p>}
                                <button type="submit" disabled={submitting || !Number(balance?.balance ?? 0)}>
                                    {submitting ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </DashboardLayout>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
