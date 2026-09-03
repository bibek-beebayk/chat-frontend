'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { LoginStreakCard } from '@/components/home/LoginStreakCard';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { emitPointsUpdated } from '@/hooks/usePointsBalance';
import { formatPoints, pointsApi } from '@/lib/points';
import { rewardsApi } from '@/lib/rewards';
import { describeChallengeTiming, xpApi } from '@/lib/xp';
import { DailyProgressItem, LoginStreakStatus, PointsBalance, PointsInfo, PointsLedgerEntry, PointsRedemptionRequest } from '@/types';
import styles from './page.module.css';

const LEDGER_PAGE_SIZE = 10;

type ToastState = { message: string; type: 'success' | 'error' } | null;
type ChallengeTab = 'daily' | 'weekly' | 'events';

const entryTypeCopy: Record<string, string> = {
    earn: 'Earned',
    redemption_hold: 'Redemption requested',
    redemption_refund: 'Redemption refunded',
    redemption_finalize: 'Redemption completed',
    adjustment: 'Staff adjustment',
};

// game_round ledger entries carry which game via metadata.game (set by
// each game's points.services call) - same slug->name mapping used
// elsewhere for real game data (e.g. ContinuePlayingCard).
const GAME_LABELS: Record<string, string> = {
    plinko: 'Plinko',
    slots: 'Rollin 3x3',
    rocket: 'Rollin Rocket',
};

function ledgerEntryLabel(entry: PointsLedgerEntry): string {
    if (entry.action?.label) return entry.action.label;
    if (entry.entry_type === 'game_round') {
        const gameSlug = entry.metadata?.game;
        if (typeof gameSlug === 'string' && GAME_LABELS[gameSlug]) return GAME_LABELS[gameSlug];
        return 'Game Round';
    }
    return entryTypeCopy[entry.entry_type] || entry.entry_type;
}

/**
 * One challenge row - shared by all three tabs (Daily/Weekly/Events) so a
 * new weekly or event challenge created in admin renders identically to an
 * existing daily one, with no per-tab markup of its own. `showTiming` is on
 * for the Weekly/Events tabs, where each row can be on its own reset
 * schedule (the section header can't summarize it the way Daily's can);
 * Daily leaves it off since the section header already covers it once.
 */
function ChallengeRow({ item, now, showTiming }: { item: DailyProgressItem; now: Date; showTiming?: boolean }) {
    const percent = item.target_count > 0
        ? Math.min(100, Math.round((item.current_count / item.target_count) * 100))
        : (item.completed ? 100 : 0);

    return (
        <div className={styles.challengeRow}>
            <span className={styles.challengeIcon} aria-hidden="true">{item.icon || '🎯'}</span>
            <div className={styles.challengeBody}>
                <span className={styles.challengeLabel}>{item.label}</span>
                {item.target_count > 1 && (
                    <>
                        <span className={styles.challengeProgressLabel}>{item.current_count} / {item.target_count}</span>
                        <div className={styles.progressTrack}>
                            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                        </div>
                    </>
                )}
                {showTiming && !item.completed && (
                    <span className={styles.challengeTiming}>{describeChallengeTiming(item.challenge_period, item.resets_at, now)}</span>
                )}
            </div>
            {item.completed ? (
                <span className={styles.doneBadge} aria-label="Completed">✓</span>
            ) : (
                <span className={styles.xpBadge}>+{item.xp_value} XP</span>
            )}
        </div>
    );
}

interface ChallengeSectionProps {
    title: string;
    resetLabel?: string | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    items: DailyProgressItem[] | null;
    now: Date;
    showRowTiming?: boolean;
    emptyMessage: string;
}

function ChallengeSection({ title, resetLabel, loading, error, onRetry, items, now, showRowTiming, emptyMessage }: ChallengeSectionProps) {
    return (
        <section className={styles.challengesSection}>
            <div className={styles.sectionHeader}>
                <h2>{title}</h2>
                {resetLabel && <span className={styles.resetTimer}>{resetLabel}</span>}
            </div>

            {loading && !items ? (
                <div className={styles.loadingArea}><div className="spinner"></div></div>
            ) : error && !items ? (
                <div className={styles.challengesEmpty}>
                    <p>Unable to load challenges.</p>
                    <button type="button" className={styles.retryBtn} onClick={onRetry}>Retry</button>
                </div>
            ) : !items || items.length === 0 ? (
                <div className={styles.challengesEmpty}>{emptyMessage}</div>
            ) : (
                <div className={styles.challengeList}>
                    {items.map((item) => (
                        <ChallengeRow key={item.slug} item={item} now={now} showTiming={showRowTiming} />
                    ))}
                </div>
            )}
        </section>
    );
}


export default function RewardsPage() {
    const { user } = useAuth();
    const [balance, setBalance] = useState<PointsBalance | null>(null);
    const [pointsInfo, setPointsInfo] = useState<PointsInfo | null>(null);
    const [ledger, setLedger] = useState<PointsLedgerEntry[]>([]);
    const [ledgerHasMore, setLedgerHasMore] = useState(false);
    const [ledgerLoadingMore, setLedgerLoadingMore] = useState(false);
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

    // Drives every challenge's "resets in Xh" / "ends in Xd" text - one
    // ticking clock shared by all three tabs rather than each tab computing
    // its own countdown, since describeChallengeTiming already reads the
    // period-appropriate field (resets_at) off each item.
    const [now, setNow] = useState(() => new Date());

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
            const [balanceData, ledgerPage, info] = await Promise.all([
                pointsApi.getBalance(),
                pointsApi.getLedger({ limit: LEDGER_PAGE_SIZE }),
                pointsApi.getInfo(),
            ]);
            setBalance(balanceData);
            setLedger(ledgerPage.results);
            setLedgerHasMore(ledgerPage.meta.has_more);
            setActiveRequest(balanceData.active_redemption_request || null);
            setPointsInfo(info);
        } catch {
            // leave existing state on transient errors
        } finally {
            setLoading(false);
        }
    }, [user]);

    const loadMoreLedger = useCallback(async () => {
        setLedgerLoadingMore(true);
        try {
            const nextPage = await pointsApi.getLedger({ limit: LEDGER_PAGE_SIZE, offset: ledger.length });
            setLedger((prev) => [...prev, ...nextPage.results]);
            setLedgerHasMore(nextPage.meta.has_more);
        } catch {
            // leave existing list on transient errors - user can retry via the button
        } finally {
            setLedgerLoadingMore(false);
        }
    }, [ledger.length]);

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
        const timer = window.setInterval(() => setNow(new Date()), 60000);
        return () => window.clearInterval(timer);
    }, []);

    // Split once by period rather than each tab re-filtering the same list -
    // this is the one place a new weekly/event challenge (created purely in
    // admin) is routed to the right tab; nothing else here is slug-specific.
    const dailyItems = useMemo(() => dailyProgress?.filter((item) => item.challenge_period === 'daily') ?? null, [dailyProgress]);
    const weeklyItems = useMemo(() => dailyProgress?.filter((item) => item.challenge_period === 'weekly') ?? null, [dailyProgress]);
    const eventItems = useMemo(() => dailyProgress?.filter((item) => item.challenge_period === 'event') ?? null, [dailyProgress]);

    const dailyResetLabel = dailyItems && dailyItems.length > 0 ? describeChallengeTiming('daily', dailyItems[0].resets_at, now) : null;
    const weeklyResetLabel = weeklyItems && weeklyItems.length > 0 ? describeChallengeTiming('weekly', weeklyItems[0].resets_at, now) : null;

    const openRedeemModal = () => {
        const currentBalance = Number(balance?.balance ?? 0);
        const minRequired = pointsInfo?.min_redemption_points;
        if (minRequired != null && currentBalance < minRequired) {
            setToast({
                message: `You need at least ${minRequired.toLocaleString()} RP to redeem. You currently have ${formatPoints(currentBalance)} RP.`,
                type: 'error',
            });
            return;
        }
        setRedeemModalOpen(true);
    };

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
                            <button type="button" className={styles.redeemBtn} onClick={openRedeemModal}>Redeem</button>
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
                            <ChallengeSection
                                title="Daily Challenges"
                                resetLabel={dailyResetLabel}
                                loading={dailyLoading}
                                error={dailyError}
                                onRetry={loadDailyProgress}
                                items={dailyItems}
                                now={now}
                                emptyMessage="No daily challenges configured right now."
                            />
                        ) : activeTab === 'weekly' ? (
                            <ChallengeSection
                                title="Weekly Challenges"
                                resetLabel={weeklyResetLabel}
                                loading={dailyLoading}
                                error={dailyError}
                                onRetry={loadDailyProgress}
                                items={weeklyItems}
                                now={now}
                                emptyMessage="No weekly challenges running right now - check back soon."
                            />
                        ) : (
                            <ChallengeSection
                                title="Event Challenges"
                                loading={dailyLoading}
                                error={dailyError}
                                onRetry={loadDailyProgress}
                                items={eventItems}
                                now={now}
                                showRowTiming
                                emptyMessage="No limited-time events running right now - check back soon."
                            />
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
                                <>
                                    <div className={styles.ledgerList}>
                                        {ledger.map((entry) => (
                                            <div key={entry.id} className={styles.ledgerItem}>
                                                <span>{ledgerEntryLabel(entry)}</span>
                                                <strong className={Number(entry.delta) >= 0 ? styles.positive : styles.negative}>
                                                    {Number(entry.delta) >= 0 ? '+' : ''}{formatPoints(entry.delta)}
                                                </strong>
                                                <time>{formatDate(entry.created_at)}</time>
                                            </div>
                                        ))}
                                    </div>
                                    {ledgerHasMore && (
                                        <button
                                            type="button"
                                            className={styles.loadMoreBtn}
                                            onClick={loadMoreLedger}
                                            disabled={ledgerLoadingMore}
                                        >
                                            {ledgerLoadingMore ? 'Loading...' : 'Load More'}
                                        </button>
                                    )}
                                </>
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
