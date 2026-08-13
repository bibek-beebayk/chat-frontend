'use client';

import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { emitPointsUpdated } from '@/hooks/usePointsBalance';
import { pointsApi } from '@/lib/points';
import { PointsBalance, PointsLedgerEntry, PointsRedemptionRequest } from '@/types';
import styles from './page.module.css';

type ToastState = { message: string; type: 'success' | 'error' } | null;

const entryTypeCopy: Record<string, string> = {
    earn: 'Earned',
    redemption_hold: 'Redemption requested',
    redemption_refund: 'Redemption refunded',
    redemption_finalize: 'Redemption completed',
    adjustment: 'Staff adjustment',
};

export default function RewardsPage() {
    const { user } = useAuth();
    const [balance, setBalance] = useState<PointsBalance | null>(null);
    const [ledger, setLedger] = useState<PointsLedgerEntry[]>([]);
    const [activeRequest, setActiveRequest] = useState<PointsRedemptionRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [pointsAmount, setPointsAmount] = useState('');
    const [rewardDescription, setRewardDescription] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [toast, setToast] = useState<ToastState>(null);

    const loadData = useCallback(async () => {
        if (!user || user.user_type !== 'player') {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [balanceData, ledgerData, requests] = await Promise.all([
                pointsApi.getBalance(),
                pointsApi.getLedger(),
                pointsApi.listRedemptions(),
            ]);
            setBalance(balanceData);
            setLedger(ledgerData);
            setActiveRequest(requests.find((item) => item.status === 'pending' || item.status === 'approved') || null);
        } catch {
            // leave existing state on transient errors
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const submitRedemption = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const amount = Number(pointsAmount);
        if (!amount || amount < 1) {
            setFormError('Enter a valid number of points to redeem.');
            return;
        }
        if (balance && amount > balance.balance) {
            setFormError('You do not have enough points for this redemption.');
            return;
        }

        setSubmitting(true);
        setFormError('');
        try {
            await pointsApi.requestRedemption({
                points_amount: amount,
                reward_description: rewardDescription.trim() || undefined,
                note: note.trim() || undefined,
            });
            setPointsAmount('');
            setRewardDescription('');
            setNote('');
            emitPointsUpdated();
            await loadData();
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
            <PageShell title="Rewards" eyebrow="Features" description="Earn points from games and community actions, then redeem them for rewards.">
                {loading ? (
                    <div className={styles.loadingArea}><div className="spinner"></div></div>
                ) : (
                    <>
                        <section className={styles.balanceCard}>
                            <div>
                                <span>Reward Points</span>
                                <strong>{(balance?.balance ?? 0).toLocaleString()}</strong>
                            </div>
                            <div className={styles.lifetimeStat}>
                                <span>Lifetime Earned</span>
                                <strong>{(balance?.lifetime_earned ?? 0).toLocaleString()}</strong>
                            </div>
                        </section>

                        <section className={styles.redeemSection}>
                            <h2>Request Redemption</h2>
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
                                        />
                                    </label>
                                    <label>
                                        <span>What are you redeeming for? (optional)</span>
                                        <input
                                            type="text"
                                            value={rewardDescription}
                                            onChange={(event) => setRewardDescription(event.target.value)}
                                            placeholder="e.g. Hi-Rollin credit"
                                            disabled={submitting}
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
                                    <button type="submit" disabled={submitting || !balance?.balance}>
                                        {submitting ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </form>
                            )}
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
                                            <strong className={entry.delta >= 0 ? styles.positive : styles.negative}>
                                                {entry.delta >= 0 ? '+' : ''}{entry.delta.toLocaleString()}
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
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </DashboardLayout>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
