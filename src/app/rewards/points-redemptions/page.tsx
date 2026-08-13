'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { pointsApi } from '@/lib/points';
import { PointsRedemptionRequest, PointsRedemptionStatus } from '@/types';
import styles from './page.module.css';

const statusFilters = [
    { label: 'Active', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Completed', value: 'completed' },
    { label: 'Rejected', value: 'rejected' },
];

const actionCopy: Record<string, { title: string; message: string; button: string }> = {
    approved: {
        title: 'Approve redemption?',
        message: 'This moves the request to the approved queue. Complete it once the reward has been delivered.',
        button: 'Approve Request',
    },
    rejected: {
        title: 'Reject redemption?',
        message: 'This refunds the held points back to the player and closes the request.',
        button: 'Reject Request',
    },
    completed: {
        title: 'Complete redemption?',
        message: 'This marks the reward as delivered. Points were already deducted when the request was submitted.',
        button: 'Complete Request',
    },
};

export default function PointsRedemptionsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<PointsRedemptionRequest[]>([]);
    const [activeFilter, setActiveFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [expandedRequestIds, setExpandedRequestIds] = useState<Set<number>>(() => new Set());
    const [confirmAction, setConfirmAction] = useState<{
        request: PointsRedemptionRequest;
        status: PointsRedemptionStatus;
        staffNote?: string;
    } | null>(null);
    const [rejectReasonAction, setRejectReasonAction] = useState<{
        request: PointsRedemptionRequest;
        reason: string;
        error: string;
    } | null>(null);

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const list = await pointsApi.listRedemptions(activeFilter || undefined);
            setRequests(activeFilter ? list : list.filter((item) => item.status === 'pending' || item.status === 'approved'));
        } catch (err: any) {
            setError(err?.message || 'Failed to load points redemption requests.');
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
        const points = requests.reduce((sum, item) => sum + Number(item.points_amount || 0), 0);
        return { pending, approved, points };
    }, [requests]);

    const updateRequest = async (requestId: number, status: PointsRedemptionStatus, staffNote = '') => {
        setUpdatingId(requestId);
        setError('');
        try {
            await pointsApi.updateRedemption(requestId, { status, staff_note: staffNote });
            setConfirmAction(null);
            setRejectReasonAction(null);
            await loadRequests();
        } catch (err: any) {
            setError(err?.message || 'Failed to update request.');
        } finally {
            setUpdatingId(null);
        }
    };

    const promptAction = (request: PointsRedemptionRequest, status: PointsRedemptionStatus) => {
        setError('');
        if (status === 'rejected') {
            setRejectReasonAction({ request, reason: '', error: '' });
            return;
        }
        setConfirmAction({ request, status });
    };

    const toggleRequest = (requestId: number) => {
        setExpandedRequestIds((current) => {
            const next = new Set(current);
            if (next.has(requestId)) {
                next.delete(requestId);
            } else {
                next.add(requestId);
            }
            return next;
        });
    };

    const updateRejectReason = (reason: string) => {
        setRejectReasonAction((current) => current ? { ...current, reason, error: '' } : current);
    };

    const submitRejectReason = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!rejectReasonAction) return;

        const reason = rejectReasonAction.reason.trim();
        if (!reason) {
            setRejectReasonAction({ ...rejectReasonAction, error: 'Rejection reason is required.' });
            return;
        }

        setRejectReasonAction(null);
        setConfirmAction({
            request: rejectReasonAction.request,
            status: 'rejected',
            staffNote: reason,
        });
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
                title="Points Redemption Requests"
                eyebrow="Rewards"
                description="Review and complete reward point redemption requests submitted by players."
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
                        <span>Points Held</span>
                        <strong>{totals.points.toLocaleString()}</strong>
                    </div>
                </section>

                <section className={styles.filterPanel}>
                    <div className={styles.filterGroup}>
                        <span>Status</span>
                        <div className={styles.filterButtons}>
                            {statusFilters.map((filter) => (
                                <button
                                    key={filter.label}
                                    type="button"
                                    className={`${styles.filterBtn} ${activeFilter === filter.value ? styles.activeFilter : ''}`}
                                    onClick={() => setActiveFilter(filter.value)}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button type="button" className={styles.refreshBtn} onClick={loadRequests}>Refresh</button>
                </section>

                {error && <p className={styles.errorBox}>{error}</p>}

                <section className={styles.requestList}>
                    {loading ? (
                        <div className={styles.emptyState}><div className="spinner"></div></div>
                    ) : requests.length === 0 ? (
                        <div className={styles.emptyState}>No points redemption requests found.</div>
                    ) : (
                        requests.map((request) => {
                            const isExpanded = expandedRequestIds.has(request.id);

                            return (
                                <article key={request.id} className={styles.requestCard}>
                                    <button
                                        type="button"
                                        className={styles.requestSummary}
                                        onClick={() => toggleRequest(request.id)}
                                        aria-expanded={isExpanded}
                                    >
                                        <div className={styles.summaryPlayer}>
                                            <strong>{request.user.username}</strong>
                                            <span>{request.user.email || 'No email provided'}</span>
                                        </div>
                                        <strong className={styles.summaryAmount}>{request.points_amount.toLocaleString()} pts</strong>
                                        <span className={`${styles.statusBadge} ${styles[`status_${request.status}`] || ''}`}>
                                            {request.status_label || request.status}
                                        </span>
                                        <span className={`${styles.expandIcon} ${isExpanded ? styles.expandedIcon : ''}`} aria-hidden="true">⌄</span>
                                    </button>

                                    {isExpanded && (
                                        <div className={styles.requestDetails}>
                                            <div className={styles.requestMeta}>
                                                <span>Requested {formatDate(request.created_at)}</span>
                                                {request.reviewed_by && <span>Reviewed by {request.reviewed_by.username}</span>}
                                            </div>
                                            {request.reward_description && (
                                                <div className={styles.rewardDescription}>
                                                    <span>Reward requested</span>
                                                    <strong>{request.reward_description}</strong>
                                                </div>
                                            )}
                                            {request.staff_note && (
                                                <div className={styles.staffNote}>
                                                    <span>Staff note</span>
                                                    <p>{request.staff_note}</p>
                                                </div>
                                            )}
                                            {request.note && <p className={styles.note}>{request.note}</p>}
                                            {request.status === 'pending' && (
                                                <div className={styles.actions}>
                                                    <button
                                                        type="button"
                                                        onClick={() => promptAction(request, 'approved')}
                                                        disabled={updatingId === request.id}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={styles.rejectBtn}
                                                        onClick={() => promptAction(request, 'rejected')}
                                                        disabled={updatingId === request.id}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                            {request.status === 'approved' && (
                                                <div className={styles.actions}>
                                                    <button
                                                        type="button"
                                                        className={styles.completeBtn}
                                                        onClick={() => promptAction(request, 'completed')}
                                                        disabled={updatingId === request.id}
                                                    >
                                                        Complete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })
                    )}
                </section>
                {rejectReasonAction && (
                    <div
                        className={styles.confirmBackdrop}
                        role="presentation"
                        onMouseDown={() => setRejectReasonAction(null)}
                    >
                        <form
                            className={styles.confirmDialog}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="points-redemption-reject-title"
                            onSubmit={submitRejectReason}
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <div className={styles.confirmHeader}>
                                <span>Rejection reason</span>
                                <h2 id="points-redemption-reject-title">Why are you rejecting this request?</h2>
                            </div>
                            <p>Add a clear note for the record before confirming the rejection. Points will be refunded to the player.</p>
                            <label className={styles.reasonField}>
                                <span>Reason</span>
                                <textarea
                                    value={rejectReasonAction.reason}
                                    onChange={(event) => updateRejectReason(event.target.value)}
                                    placeholder="Example: Reward is currently unavailable."
                                    autoFocus
                                    rows={4}
                                />
                            </label>
                            {rejectReasonAction.error && <p className={styles.reasonError}>{rejectReasonAction.error}</p>}
                            <div className={styles.confirmActions}>
                                <button type="button" onClick={() => setRejectReasonAction(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.confirmReject}>
                                    Submit Reason
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                {confirmAction && (
                    <div
                        className={styles.confirmBackdrop}
                        role="presentation"
                        onMouseDown={() => updatingId === null && setConfirmAction(null)}
                    >
                        <section
                            className={styles.confirmDialog}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="points-redemption-confirm-title"
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <div className={styles.confirmHeader}>
                                <span>Confirm action</span>
                                <h2 id="points-redemption-confirm-title">
                                    {actionCopy[confirmAction.status]?.title || 'Update redemption?'}
                                </h2>
                            </div>
                            <p>{actionCopy[confirmAction.status]?.message || 'Please confirm this redemption request update.'}</p>
                            <div className={styles.confirmDetails}>
                                <div>
                                    <span>Player</span>
                                    <strong>{confirmAction.request.user.username}</strong>
                                </div>
                                <div>
                                    <span>Points</span>
                                    <strong>{confirmAction.request.points_amount.toLocaleString()}</strong>
                                </div>
                                {confirmAction.request.reward_description && (
                                    <div>
                                        <span>Reward requested</span>
                                        <strong>{confirmAction.request.reward_description}</strong>
                                    </div>
                                )}
                                {confirmAction.staffNote && (
                                    <div>
                                        <span>Rejection Reason</span>
                                        <strong>{confirmAction.staffNote}</strong>
                                    </div>
                                )}
                            </div>
                            <div className={styles.confirmActions}>
                                <button
                                    type="button"
                                    onClick={() => setConfirmAction(null)}
                                    disabled={updatingId !== null}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={
                                        confirmAction.status === 'rejected'
                                            ? styles.confirmReject
                                            : confirmAction.status === 'completed'
                                                ? styles.confirmComplete
                                                : ''
                                    }
                                    onClick={() => updateRequest(confirmAction.request.id, confirmAction.status, confirmAction.staffNote || '')}
                                    disabled={updatingId === confirmAction.request.id}
                                >
                                    {updatingId === confirmAction.request.id
                                        ? 'Updating...'
                                        : actionCopy[confirmAction.status]?.button || 'Confirm'}
                                </button>
                            </div>
                        </section>
                    </div>
                )}
            </PageShell>
        </DashboardLayout>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
