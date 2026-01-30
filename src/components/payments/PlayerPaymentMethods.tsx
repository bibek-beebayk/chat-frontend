import React from 'react';
import styles from '@/app/payments/page.module.css';

const PAYMENT_METHODS = [
    {
        id: 'btc',
        name: 'Bitcoin',
        icon: '₿',
        color: '#F7931A',
        description: 'Instant crypto deposits',
    },
    {
        id: 'eth',
        name: 'Ethereum',
        icon: 'Ξ',
        color: '#627EEA',
        description: 'ERC-20 network supported',
    },
    {
        id: 'cashapp',
        name: 'Cash App',
        icon: '$',
        color: '#00D632',
        description: 'Fast and secure mobile payments',
    }
];

export const PlayerPaymentMethods: React.FC = () => {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Deposit Methods</h1>
            <p className={styles.subtitle}>Choose from a wide range of payment methods to fund and withdraw from your account.</p>

            <div className={styles.grid}>
                {PAYMENT_METHODS.map((method) => (
                    <div key={method.id} className={`${styles.card} glass`} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                        <div className={styles.cardHeader} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: method.color,
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem',
                                fontWeight: 'bold'
                            }}>
                                {method.icon}
                            </div>
                            <h2>{method.name}</h2>
                        </div>
                        <div className={styles.cardBody}>
                            <p style={{ color: '#ccc', marginBottom: '1rem' }}>{method.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                <h3 style={{ marginBottom: '0.5rem', color: '#ffd700' }}>Need Help?</h3>
                <p style={{ color: '#ccc' }}>If you have any issues with deposits, please contact our support team via the chat bubble in the bottom right corner.</p>
            </div>

        </div>
    );
};
