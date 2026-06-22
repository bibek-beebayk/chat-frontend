'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { scratchRedemptionsApi } from '@/lib/scratchRedemptions';
import styles from './page.module.css';

type ToastState = { message: string; type: 'success' | 'error' } | null;

interface RedeemSourceConfig {
    eyebrow: string;
    title: string;
    confirmedTitle: string;
    description: string;
    confirmedDescription: string;
    modalTitle: string;
    modalDescription: string;
    missingMessage: string;
    successMessage: string;
    errorMessage: string;
    confirmButton: string;
    submit: (payload: {
        source: string;
        amount: string;
        reward_id: string;
        expires: string;
        signature: string;
        hi_rollin_username: string;
        query_params: Record<string, string>;
    }) => Promise<unknown>;
}

const redeemSourceConfig: Record<string, RedeemSourceConfig> = {
    scratch: {
        eyebrow: 'Scratch Reward',
        title: 'Confirm Scratch Redemption',
        confirmedTitle: 'Reward Confirmed',
        description: 'Review your scratch reward details and confirm redemption.',
        confirmedDescription: 'Your scratch reward has been recorded. You can continue using Rollin Community.',
        modalTitle: 'Confirm Scratch Redemption',
        modalDescription: 'Please confirm that you want to redeem this scratch reward.',
        missingMessage: 'This scratch redemption link is missing a valid signed reward.',
        successMessage: 'Scratch redemption confirmed successfully.',
        errorMessage: 'Unable to confirm scratch redemption.',
        confirmButton: 'Confirm Redemption',
        submit: scratchRedemptionsApi.create,
    },
    win: {
        eyebrow: 'Win Bonus',
        title: 'Confirm Win Bonus',
        confirmedTitle: 'Win Bonus Confirmed',
        description: 'Review your winning bonus details and confirm redemption.',
        confirmedDescription: 'Your win bonus has been recorded. You can continue using Rollin Community.',
        modalTitle: 'Confirm Win Bonus',
        modalDescription: 'Please confirm that you want to redeem this win bonus.',
        missingMessage: 'This win bonus link is missing a valid signed reward.',
        successMessage: 'Win bonus redemption confirmed successfully.',
        errorMessage: 'Unable to confirm win bonus redemption.',
        confirmButton: 'Confirm Redemption',
        submit: scratchRedemptionsApi.create,
    },
};

function RedeemContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [hiRollinUsername, setHiRollinUsername] = useState('');
    const [formError, setFormError] = useState('');
    const [toast, setToast] = useState<ToastState>(null);

    const source = (searchParams.get('source') || '').trim().toLowerCase();
    const amount = (searchParams.get('amount') || '').trim();
    const rewardId = (searchParams.get('reward_id') || '').trim();
    const expires = (searchParams.get('expires') || '').trim();
    const signature = (searchParams.get('signature') || '').trim();
    const amountValue = Number(amount);
    const expiresValue = Number(expires);
    const config = source ? redeemSourceConfig[source] : null;
    const hasValidIntent = Boolean(
        config
        && amount
        && Number.isFinite(amountValue)
        && amountValue > 0
        && rewardId
        && signature
        && Number.isFinite(expiresValue)
        && expiresValue > 0,
    );

    const targetUrl = useMemo(() => {
        const query = searchParams.toString();
        return `${pathname}${query ? `?${query}` : ''}`;
    }, [pathname, searchParams]);

    const queryPayload = useMemo(() => {
        const payload: Record<string, string> = {};
        searchParams.forEach((value, key) => {
            payload[key] = value;
        });
        return payload;
    }, [searchParams]);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace(`/login?next=${encodeURIComponent(targetUrl)}`);
            return;
        }
        if (user.user_type !== 'player') {
            setToast({ message: 'Only player accounts can confirm redemptions.', type: 'error' });
            return;
        }
        if (hasValidIntent && !confirmed) {
            setConfirmOpen(true);
        }
    }, [confirmed, hasValidIntent, loading, router, targetUrl, user]);

    useEffect(() => {
        if (!user) return;
        setHiRollinUsername((user.external_user_id || '').trim());
    }, [user]);

    const confirmRedemption = useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        if (!config || !hasValidIntent || !source || !amount) return;
        const username = hiRollinUsername.trim();
        if (!username) {
            setFormError('Hi-Rollin account username is required.');
            return;
        }

        setSubmitting(true);
        setFormError('');
        try {
            await config.submit({
                source,
                amount,
                reward_id: rewardId,
                expires,
                signature,
                hi_rollin_username: username,
                query_params: queryPayload,
            });
            setConfirmed(true);
            setConfirmOpen(false);
            setToast({ message: config.successMessage, type: 'success' });
        } catch (error: any) {
            setToast({ message: error?.message || config.errorMessage, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    }, [amount, config, expires, hasValidIntent, hiRollinUsername, queryPayload, rewardId, signature, source]);

    if (loading || !user) {
        return (
            <DashboardLayout>
                <main className={styles.loadingArea}>
                    <div className="spinner"></div>
                </main>
            </DashboardLayout>
        );
    }

    const title = config ? (confirmed ? config.confirmedTitle : config.title) : 'Unsupported Redemption Source';
    const description = config
        ? (confirmed ? config.confirmedDescription : config.description)
        : 'This redemption source is not available yet.';
    const missingMessage = config?.missingMessage || 'This redemption link is missing a valid source or amount.';

    return (
        <DashboardLayout>
            <main className={styles.page}>
                <section className={styles.card}>
                    <span className={styles.eyebrow}>{config?.eyebrow || 'Redemption'}</span>
                    <h1>{title}</h1>
                    <p>{hasValidIntent ? description : missingMessage}</p>

                    <div className={styles.rewardPanel}>
                        <div>
                            <span>Source</span>
                            <strong>{source || 'Missing'}</strong>
                        </div>
                        <div>
                            <span>Amount</span>
                            <strong>{hasValidIntent ? `$${amountValue.toFixed(2)}` : 'Invalid'}</strong>
                        </div>
                        <div>
                            <span>Reward ID</span>
                            <strong>{rewardId || 'Missing'}</strong>
                        </div>
                    </div>

                    {!confirmed && hasValidIntent && user.user_type === 'player' && (
                        <button type="button" className={styles.primaryBtn} onClick={() => setConfirmOpen(true)}>
                            {config?.confirmButton || 'Confirm Redemption'}
                        </button>
                    )}
                </section>
            </main>

            <Modal
                isOpen={confirmOpen}
                onClose={() => !submitting && setConfirmOpen(false)}
                title={config?.modalTitle || 'Confirm Redemption'}
                footer={
                    <>
                        <button type="button" className={styles.secondaryBtn} onClick={() => setConfirmOpen(false)} disabled={submitting}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="scratch-redemption-form"
                            className={styles.primaryBtn}
                            disabled={submitting || !hiRollinUsername.trim()}
                        >
                            {submitting ? 'Confirming...' : config?.confirmButton || 'Confirm Redemption'}
                        </button>
                    </>
                }
            >
                <form id="scratch-redemption-form" className={styles.modalContent} onSubmit={confirmRedemption}>
                    <p>{config?.modalDescription || 'Please confirm that you want to redeem this reward.'}</p>
                    <div className={styles.rewardPanel}>
                        <div>
                            <span>Source</span>
                            <strong>{source}</strong>
                        </div>
                        <div>
                            <span>Amount</span>
                            <strong>${amountValue.toFixed(2)}</strong>
                        </div>
                        <div>
                            <span>Reward ID</span>
                            <strong>{rewardId}</strong>
                        </div>
                    </div>
                    <label className={styles.accountField}>
                        <span>Hi-Rollin username</span>
                        <input
                            type="text"
                            value={hiRollinUsername}
                            onChange={(event) => {
                                setHiRollinUsername(event.target.value);
                                setFormError('');
                            }}
                            placeholder="Enter account username"
                            autoFocus
                            disabled={submitting}
                        />
                    </label>
                    {formError && <p className={styles.formError}>{formError}</p>}
                </form>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </DashboardLayout>
    );
}

export default function RedeemPage() {
    return (
        <Suspense fallback={
            <main className={styles.loadingArea}>
                <div className="spinner"></div>
            </main>
        }>
            <RedeemContent />
        </Suspense>
    );
}
