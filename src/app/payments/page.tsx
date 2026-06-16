'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AgentPayments } from '@/components/payments/AgentPayments';
import { PlayerPaymentMethods } from '@/components/payments/PlayerPaymentMethods';
import styles from './page.module.css';

export default function PaymentsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) return null;

    if (!user) return null;

    const isAgent = user.user_type === 'agent' || user.user_type === 'staff';
    const isPlayer = user.user_type === 'player';

    return (
        <DashboardLayout>
            <main className={styles.main}>
                {isPlayer ? (
                    <PlayerPaymentMethods />
                ) : (
                    <AgentPayments />
                )}
            </main>
        </DashboardLayout>
    );
}
