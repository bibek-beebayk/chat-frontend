'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
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

    return (
        <>
            <Header />
            <main className={styles.main}>
                <div className={styles.container}>
                    <h1 className={styles.title}>Payment Information</h1>
                    <p className={styles.subtitle}>Manage your payment methods and transaction history</p>

                    <div className={styles.grid}>
                        <div className={`${styles.card} glass`}>
                            <div className={styles.cardHeader}>
                                <h2>💳 Payment Methods</h2>
                            </div>
                            <div className={styles.cardBody}>
                                <p>No payment methods added yet.</p>
                                <button className={styles.addButton}>+ Add Payment Method</button>
                            </div>
                        </div>

                        <div className={`${styles.card} glass`}>
                            <div className={styles.cardHeader}>
                                <h2>📊 Transaction History</h2>
                            </div>
                            <div className={styles.cardBody}>
                                <p>No transactions yet.</p>
                            </div>
                        </div>

                        <div className={`${styles.card} glass`}>
                            <div className={styles.cardHeader}>
                                <h2>💰 Balance</h2>
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.balance}>$0.00</div>
                                <p className={styles.balanceLabel}>Current Balance</p>
                            </div>
                        </div>

                        <div className={`${styles.card} glass`}>
                            <div className={styles.cardHeader}>
                                <h2>🔒 Security</h2>
                            </div>
                            <div className={styles.cardBody}>
                                <p>All transactions are secured with industry-standard encryption.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
