'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { AgentPayments } from '@/components/payments/AgentPayments';
import { PlayerPaymentMethods } from '@/components/payments/PlayerPaymentMethods';
import styles from './page.module.css';

// Payments page is temporarily hidden from the UI (not removed) - flip this
// back to false to re-enable it; nothing below needs to change.
const PAYMENTS_PAGE_HIDDEN = true;

export default function PaymentsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Payments page is temporarily hidden from the UI (not removed) - redirect
    // away rather than deleting anything below, which stays intact for reuse.
    useEffect(() => {
        if (!loading && user && PAYMENTS_PAGE_HIDDEN) {
            router.replace('/settings');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <DashboardLayout>
                <div className={styles.loading}>
                    <div className="spinner"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!user) return null;

    const isAgent = user.user_type === 'agent' || user.user_type === 'staff';
    const isPlayer = user.user_type === 'player';

    // Payments page is temporarily hidden from the UI (not removed) - the
    // redirect effect above sends authenticated users to /settings, so this
    // just renders a spinner instead of flashing the real content below.
    if (PAYMENTS_PAGE_HIDDEN) {
        return (
            <DashboardLayout>
                <div className={styles.loading}>
                    <div className="spinner"></div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <PageShell
                title="Payments"
                eyebrow="Account"
                description={isPlayer ? 'Manage your saved payment methods.' : 'Review payment information for agent operations.'}
                width="wide"
            >
                {isPlayer ? (
                    <PlayerPaymentMethods />
                ) : (
                    <AgentPayments />
                )}
            </PageShell>
        </DashboardLayout>
    );
}
