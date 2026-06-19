'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { rewardsApi } from '@/lib/rewards';
import { StreakRedemptionRequest, StreakRedemptionStatus } from '@/types';
import styles from './page.module.css';

const filters = [
    { label: 'Active', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Completed', value: 'completed' },
    { label: 'Rejected', value: 'rejected' },
];

export default function RewardRedemptionsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<StreakRedemptionRequest[]>([]);
    const [activeFilter, setActiveFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const list = await rewardsApi.listRedemptions(activeFilter || undefined);
            setRequests(activeFilter ? list : list.filter((item) => item.status === 'pending' || item.status === 'approved'));
        } catch (err: any) {
            setError(err?.message || 'Failed to load redemption requests.');
        } finally {
            setLoading(false);
        }
    }, [activeFilter]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (!authLoading && user?.user_type !== 'staff') {
            router.push('/');
            return;
        }
        if (user?.user_type === 'staff') {
            loadRequests();
        }
    }, [authLoading, loadRequests, router, user]);

    const totals = useMemo(() => {
        const pending = requests.filter((item) => item.status === 'pending').length;
        const approved = requests.filter((item) => item.status === 'approved').length;
        const amount = requests.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        return { pending, approved, amount };
    }, [requests]);

    const updateRequest = async (requestId: number, status: StreakRedemptionStatus) => {
        setUpdatingId(requestId);
        setError('');
        try {
            await rewardsApi.updateRedemption(requestId, { status });
            await loadRequests();
        } catch (err: any) {
            setError(err?.message || 'Failed to update request.');
        } finally {
            setUpdatingId(null);
        }
    };

    if (authLoading || !user || user.user_type !== 'staff') {
        return (
            <DashboardLayout>
                <main className={styles.loadingArea}>
                    <div className="spinner"></div>
                </main>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <PageShell
                title="Streak Redemptions"
                eyebrow="Rewards"
                description="Review and complete $5 Hi-Rollin credit requests from player login streaks."
                width="wide"
            >
                <section className={styles.summaryGrid}>
                    <div className={styles.summaryCard}>
                        <span>Pending</span>
                        <strong>{totals.pending}</strong>
                    </div>
                    <div className={styles.summaryCard}>
                        <span>Approved</span>
                        <strong>{totals.approved}</strong>
                    </div>
                    <div className={styles.summaryCard}>
                        <span>Visible Amount</span>
                        <strong>${totals.amount.toFixed(2)}</strong>
                    </div>
                </section>

                <section className={styles.filterPanel}>
                    {filters.map((filter) => (
                        <button
                            key={filter.label}
                            type="button"
                            className={`${styles.filterBtn} ${activeFilter === filter.value ? styles.activeFilter : ''}`}
                            onClick={() => setActiveFilter(filter.value)}
                        >
                            {filter.label}
                        </button>
                    ))}
                    <button type="button" className={styles.refreshBtn} onClick={loadRequests}>Refresh</button>
                </section>

                {error && <p className={styles.errorBox}>{error}</p>}

                <section className={styles.requestList}>
                    {loading ? (
                        <div className={styles.emptyState}><div className="spinner"></div></div>
                    ) : requests.length === 0 ? (
                        <div className={styles.emptyState}>No redemption requests found.</div>
                    ) : (
                        requests.map((request) => (
                            <article key={request.id} className={styles.requestCard}>
                                <div className={styles.requestMain}>
                                    <div>
                                        <span className={styles.statusBadge}>{request.status_label || request.status}</span>
                                        <h2>{request.user.username}</h2>
                                        <p>{request.user.email || 'No email provided'}</p>
                                    </div>
                                    <strong>${Number(request.amount).toFixed(2)}</strong>
                                </div>
                                <div className={styles.requestMeta}>
                                    <span>Requested {formatDate(request.created_at)}</span>
                                    {request.reviewed_by && <span>Reviewed by {request.reviewed_by.username}</span>}
                                </div>
                                {request.note && <p className={styles.note}>{request.note}</p>}
                                {(request.status === 'pending' || request.status === 'approved') && (
                                    <div className={styles.actions}>
                                        {request.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => updateRequest(request.id, 'approved')}
                                                disabled={updatingId === request.id}
                                            >
                                                Approve
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className={styles.completeBtn}
                                            onClick={() => updateRequest(request.id, 'completed')}
                                            disabled={updatingId === request.id}
                                        >
                                            Complete
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.rejectBtn}
                                            onClick={() => updateRequest(request.id, 'rejected')}
                                            disabled={updatingId === request.id}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </article>
                        ))
                    )}
                </section>
            </PageShell>
        </DashboardLayout>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
