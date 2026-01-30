import React from 'react';
import styles from '@/app/payments/page.module.css';

export const AgentPayments: React.FC = () => {
    return (
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
    );
};
