'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { rewardsApi } from '@/lib/rewards';
import { RedemptionSource, StreakRedemptionRequest, StreakRedemptionStatus } from '@/types';
import styles from './page.module.css';

const statusFilters = [
    { label: 'Active', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Completed', value: 'completed' },
    { label: 'Rejected', value: 'rejected' },
];

const sourceFilters: Array<{ label: string; value: RedemptionSource | '' }> = [
    { label: 'All Sources', value: '' },
    { label: 'Login Streak', value: 'login_streak' },
    { label: 'Scratch Bonus', value: 'scratch_bonus' },
    { label: 'Win Bonus', value: 'win_bonus' },
];

const actionCopy: Record<string, { title: string; message: string; button: string }> = {
    approved: {
        title: 'Approve redemption?',
        message: 'This moves the request to the approved queue. You can complete it after applying the credit.',
        button: 'Approve Request',
    },
    rejected: {
        title: 'Reject redemption?',
        message: 'This closes the request and lets the player submit a new request when eligible.',
        button: 'Reject Request',
    },
    completed: {
        title: 'Complete redemption?',
        message: 'This marks the credit as paid. Streak-based requests reset the player streak after completion.',
        button: 'Complete Request',
    },
};

export default function RewardRedemptionsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<StreakRedemptionRequest[]>([]);
    const [activeFilter, setActiveFilter] = useState('');
    const [activeSourceFilter, setActiveSourceFilter] = useState<RedemptionSource | ''>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [expandedRequestIds, setExpandedRequestIds] = useState<Set<number>>(() => new Set());
    const [confirmAction, setConfirmAction] = useState<{
        request: StreakRedemptionRequest;
        status: StreakRedemptionStatus;
        staffNote?: string;
    } | null>(null);
    const [rejectReasonAction, setRejectReasonAction] = useState<{
        request: StreakRedemptionRequest;
        reason: string;
        error: string;
    } | null>(null);

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const list = await rewardsApi.listRedemptions(
                activeFilter || undefined,
                activeSourceFilter || undefined,
            );
            setRequests(activeFilter ? list : list.filter((item) => item.status === 'pending' || item.status === 'approved'));
        } catch (err: any) {
            setError(err?.message || 'Failed to load redemption requests.');
        } finally {
            setLoading(false);
        }
    }, [activeFilter, activeSourceFilter]);

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

    const updateRequest = async (requestId: number, status: StreakRedemptionStatus, staffNote = '') => {
        setUpdatingId(requestId);
        setError('');
        try {
            await rewardsApi.updateRedemption(requestId, { status, staff_note: staffNote });
            setConfirmAction(null);
            setRejectReasonAction(null);
            await loadRequests();
        } catch (err: any) {
            setError(err?.message || 'Failed to update request.');
        } finally {
            setUpdatingId(null);
        }
    };

    const promptAction = (request: StreakRedemptionRequest, status: StreakRedemptionStatus) => {
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
                title="Redemption Requests"
                eyebrow="Rewards"
                description="Review and complete Hi-Rollin credit requests from login streaks and scratch bonuses."
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
                    <div className={styles.filterGroup}>
                        <span>Source</span>
                        <div className={styles.filterButtons}>
                            {sourceFilters.map((filter) => (
                                <button
                                    key={filter.label}
                                    type="button"
                                    className={`${styles.filterBtn} ${activeSourceFilter === filter.value ? styles.activeFilter : ''}`}
                                    onClick={() => setActiveSourceFilter(filter.value)}
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
                        <div className={styles.emptyState}>No redemption requests found.</div>
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
                                        <span className={`${styles.sourceBadge} ${styles[`source_${request.source}`] || ''}`}>
                                            {request.source_label || formatSource(request.source)}
                                        </span>
                                        <strong className={styles.summaryAmount}>${Number(request.amount).toFixed(2)}</strong>
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
                                            <div className={styles.hiRollinAccount}>
                                                <span>Hi-Rollin account username</span>
                                                <strong>{request.hi_rollin_username || 'Not provided'}</strong>
                                            </div>
                                            {request.staff_note && (
                                                <div className={styles.staffNote}>
                                                    <span>Staff note</span>
                                                    <p>{request.staff_note}</p>
                                                </div>
                                            )}
                                            {request.source === 'login_streak' ? (
                                                <VerificationRecords request={request} />
                                            ) : (
                                                <SourceDetails request={request} />
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
                            aria-labelledby="redemption-reject-title"
                            onSubmit={submitRejectReason}
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <div className={styles.confirmHeader}>
                                <span>Rejection reason</span>
                                <h2 id="redemption-reject-title">Why are you rejecting this request?</h2>
                            </div>
                            <p>Add a clear note for the record before confirming the rejection.</p>
                            <label className={styles.reasonField}>
                                <span>Reason</span>
                                <textarea
                                    value={rejectReasonAction.reason}
                                    onChange={(event) => updateRejectReason(event.target.value)}
                                    placeholder="Example: Hi-Rollin username could not be verified."
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
                            aria-labelledby="redemption-confirm-title"
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <div className={styles.confirmHeader}>
                                <span>Confirm action</span>
                                <h2 id="redemption-confirm-title">
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
                                    <span>Source</span>
                                    <strong>{confirmAction.request.source_label || formatSource(confirmAction.request.source)}</strong>
                                </div>
                                <div>
                                    <span>Hi-Rollin Username</span>
                                    <strong>{confirmAction.request.hi_rollin_username || 'Not provided'}</strong>
                                </div>
                                <div>
                                    <span>Amount</span>
                                    <strong>${Number(confirmAction.request.amount).toFixed(2)}</strong>
                                </div>
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

function VerificationRecords({ request }: { request: StreakRedemptionRequest }) {
    const summary = request.verification_summary;
    const entries = request.verification_entries || [];
    const targetDays = summary?.target_days || 7;
    const isComplete = Boolean(summary?.is_consecutive && (summary?.record_count || 0) >= targetDays);

    return (
        <section className={styles.verificationPanel}>
            <div className={styles.verificationHeader}>
                <div>
                    <span>Login Records</span>
                    <strong>{summary?.record_count || entries.length} / {targetDays} verified days</strong>
                </div>
                <span className={`${styles.verificationBadge} ${isComplete ? styles.verifiedBadge : styles.warningBadge}`}>
                    {isComplete ? 'Consecutive' : 'Needs review'}
                </span>
            </div>
            {summary?.start_date && summary?.end_date && (
                <p className={styles.verificationRange}>
                    Basis window: {formatDateOnly(summary.start_date)} - {formatDateOnly(summary.end_date)}
                </p>
            )}
            {entries.length > 0 ? (
                <div className={styles.recordGrid}>
                    {entries.map((entry, index) => (
                        <div key={entry.id} className={styles.recordPill}>
                            <span>Day {index + 1}</span>
                            <strong>{formatDateOnly(entry.login_date)}</strong>
                        </div>
                    ))}
                </div>
            ) : (
                <p className={styles.noRecords}>No login records were found for this request.</p>
            )}
        </section>
    );
}

function SourceDetails({ request }: { request: StreakRedemptionRequest }) {
    const payload = request.source_payload || {};
    const originalSource = typeof payload.source === 'string' ? payload.source : null;

    return (
        <section className={styles.sourcePanel}>
            <div>
                <span>Redemption Source</span>
                <strong>{request.source_label || formatSource(request.source)}</strong>
            </div>
            {originalSource && (
                <p>Original redirect source: {formatSource(originalSource)}</p>
            )}
        </section>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatDateOnly(value: string) {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function formatSource(value: string) {
    return value
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
