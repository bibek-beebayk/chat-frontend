'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Input } from '@/components/forms/Input';
import { Button } from '@/components/forms/Button';
import styles from './page.module.css';

export default function TestEmailPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await apiClient.post<{ message: string }>(
                '/api/auth/test-email/',
                { email },
                { skipAuth: true }
            );
            setMessage(response.message || 'Email sent successfully!');
        } catch (err: any) {
            setError(err.message || 'Failed to send email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={`${styles.loginCard} glass`}>
                <div className={styles.header}>
                    <h1 className="gradient-text">Test Email</h1>
                    <p>Send a test email using ZeptoMail.</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.error}>{error}</div>}
                    {message && <div style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        color: '#34d399',
                        fontSize: '0.875rem',
                        textAlign: 'center'
                    }}>{message}</div>}

                    <Input
                        label="Recipient Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter recipient email"
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        loading={loading}
                    >
                        Send Test Email
                    </Button>
                </form>
            </div>
        </div>
    );
}
