'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { rewardsApi } from '@/lib/rewards';
import { LoginStreakStatus } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { Toast } from '@/components/ui/Toast';
import styles from './LoginStreakCard.module.css';

interface LoginStreakCardProps {
    streak: LoginStreakStatus | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    onRedeemed: () => void;
    /** Renders without its own card background/border/padding, for embedding as one column of PlayerStatsBar. The redeem modal/logic is unchanged. */
    embedded?: boolean;
}

/**
 * Dashboard-main streak card - distinct from RightSidebar.tsx's own streak
 * widget (which stays untouched for agent). Unlike that widget, this always
 * renders the reward amount dynamically from streak.reward_amount instead
 * of a hardcoded "$5 Credit" string. Also owns the actual redeem-request
 * flow (mirroring RightSidebar's modal) since players no longer see that
 * sidebar widget - this is the one place the action needs to live for them.
 */
export function LoginStreakCard({ streak, loading, error, onRetry, onRedeemed, embedded }: LoginStreakCardProps) {
    const { user } = useAuth();
    const [modalOpen, setModalOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    if (loading && !streak) {
        return (
            <div className={embedded ? styles.embedded : styles.card}>
                <Skeleton width="50%" height="1rem" />
                <Skeleton width="30%" height="1.6rem" />
                <Skeleton height="1.6rem" />
            </div>
        );
    }

    if (error && !streak) {
        return (
            <div className={embedded ? styles.embedded : styles.card}>
                <p className={styles.errorText}>Unable to load your streak.</p>
                <button type="button" className={styles.retryBtn} onClick={onRetry}>Retry</button>
            </div>
        );
    }

    if (!streak) return null;

    const rewardLabel = `$${Number(streak.reward_amount).toFixed(2)} credit`;
    const currentDay = Math.min(streak.current_streak, streak.target_days);

    const openModal = () => {
        setFormError('');
        setUsername((user?.external_user_id || '').trim());
        setModalOpen(true);
    };

    const submitRedemption = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = username.trim();
        if (!trimmed) {
            setFormError('Hi-Rollin account username is required.');
            return;
        }
        setSubmitting(true);
        setFormError('');
        try {
            await rewardsApi.requestRedemption({ hi_rollin_username: trimmed });
            setModalOpen(false);
            onRedeemed();
            setToast({ message: 'Redeem request submitted successfully.', type: 'success' });
        } catch (err: any) {
            setFormError(err?.message || 'Unable to create redeem request.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={embedded ? styles.embedded : styles.card}>
            {!embedded && (
                <div className={styles.header}>
                    <span className={styles.flame} aria-hidden="true">🔥</span>
                    <h3>Login Streak</h3>
                </div>
            )}
            {!embedded && (
                <p className={styles.dayCount}>{streak.current_streak} {streak.current_streak === 1 ? 'Day' : 'Days'}</p>
            )}
            <p className={styles.subtext}>
                {streak.reward_available
                    ? `${rewardLabel} ready to redeem.`
                    : `Keep it up! Day ${streak.target_days} reward: ${rewardLabel}`}
            </p>
            <div className={styles.pipRow}>
                {Array.from({ length: streak.target_days }).map((_, i) => {
                    const day = i + 1;
                    const done = day <= currentDay;
                    return (
                        <span key={day} className={`${styles.pip} ${done ? styles.pipDone : ''}`}>
                            {done ? '✓' : day}
                        </span>
                    );
                })}
            </div>

            {streak.active_redemption_request ? (
                <p className={styles.pendingText}>
                    Redeem request: <strong>{streak.active_redemption_request.status_label || streak.active_redemption_request.status}</strong>
                </p>
            ) : streak.reward_available ? (
                <button type="button" className={styles.redeemBtn} onClick={openModal}>Request Redeem</button>
            ) : null}

            {modalOpen && (
                <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => !submitting && setModalOpen(false)}>
                    <form className={styles.modal} onSubmit={submitRedemption} onMouseDown={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h4>Hi-Rollin account</h4>
                            <button type="button" onClick={() => setModalOpen(false)} disabled={submitting} aria-label="Close">×</button>
                        </div>
                        <p>Enter the Hi-Rollin account username where the {rewardLabel} should be applied.</p>
                        <label className={styles.field}>
                            <span>Hi-Rollin username</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter account username"
                                autoFocus
                                disabled={submitting}
                            />
                        </label>
                        {formError && <p className={styles.errorText}>{formError}</p>}
                        <div className={styles.modalActions}>
                            <button type="button" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</button>
                            <button type="submit" disabled={submitting || !username.trim()}>
                                {submitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
