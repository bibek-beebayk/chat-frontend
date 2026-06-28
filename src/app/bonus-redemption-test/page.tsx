'use client';

import { useMemo, useState } from 'react';
import styles from './page.module.css';

type Source = 'scratch' | 'win';

interface SignedBonusResponse {
    redeem_url: string;
    message: string;
    payload: {
        source: string;
        amount: string;
        reward_id: string;
        expires: string;
        signature: string;
    };
}

const sourceCopy: Record<Source, { label: string; title: string; description: string }> = {
    scratch: {
        label: 'Scratch',
        title: 'Scratch Reward Redirect',
        description: 'Generate a signed scratch reward URL and open the real redemption flow.',
    },
    win: {
        label: 'Game Win',
        title: 'Game Win Bonus Redirect',
        description: 'Generate a signed game win bonus URL using the same verifier flow.',
    },
};

export default function BonusRedemptionTestPage() {
    const [source, setSource] = useState<Source>('scratch');
    const [amount, setAmount] = useState('5.00');
    const [rewardId, setRewardId] = useState(() => `test_${Date.now()}`);
    const [expiresInMinutes, setExpiresInMinutes] = useState('15');
    const [signed, setSigned] = useState<SignedBonusResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const currentCopy = sourceCopy[source];
    const canOpen = Boolean(signed?.redeem_url);

    const exampleUrl = useMemo(() => {
        if (signed?.redeem_url) return signed.redeem_url;
        return '/redeem?source=scratch&amount=5.00&reward_id=test_123&expires=1780000000&signature=...';
    }, [signed]);

    const generateRewardId = () => {
        const prefix = source === 'scratch' ? 'scratch' : 'win';
        setRewardId(`${prefix}_${Date.now()}`);
        setSigned(null);
        setCopied(false);
    };

    const createSignedUrl = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setCopied(false);

        try {
            const response = await fetch('/api/dev-bonus-sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source,
                    amount,
                    reward_id: rewardId,
                    expires_in_minutes: Number(expiresInMinutes),
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to generate signed URL.');
            }
            setSigned(data);
        } catch (err: any) {
            setError(err?.message || 'Failed to generate signed URL.');
            setSigned(null);
        } finally {
            setLoading(false);
        }
    };

    const copyUrl = async () => {
        if (!signed?.redeem_url) return;
        await navigator.clipboard.writeText(signed.redeem_url);
        setCopied(true);
    };

    const openRedemption = () => {
        if (!signed?.redeem_url) return;
        window.location.href = signed.redeem_url;
    };

    return (
        <main className={styles.page}>
            <section className={styles.panel}>
                <div className={styles.header}>
                    <span>Dev Tool</span>
                    <h1>Bonus Redirect Tester</h1>
                    <p>
                        Simulate the external bonus app by generating a signed redirect URL for
                        scratch rewards or game win bonuses.
                    </p>
                </div>

                <div className={styles.sourceTabs} role="tablist" aria-label="Bonus source">
                    {(Object.keys(sourceCopy) as Source[]).map((item) => (
                        <button
                            key={item}
                            type="button"
                            className={source === item ? styles.activeTab : ''}
                            onClick={() => {
                                setSource(item);
                                setSigned(null);
                                setCopied(false);
                            }}
                        >
                            {sourceCopy[item].label}
                        </button>
                    ))}
                </div>

                <form className={styles.form} onSubmit={createSignedUrl}>
                    <div className={styles.sourceIntro}>
                        <strong>{currentCopy.title}</strong>
                        <p>{currentCopy.description}</p>
                    </div>

                    <label>
                        <span>Amount</span>
                        <input
                            value={amount}
                            onChange={(event) => {
                                setAmount(event.target.value);
                                setSigned(null);
                            }}
                            placeholder="5.00"
                            inputMode="decimal"
                            required
                        />
                    </label>

                    <label>
                        <span>Reward ID</span>
                        <div className={styles.inlineField}>
                            <input
                                value={rewardId}
                                onChange={(event) => {
                                    setRewardId(event.target.value);
                                    setSigned(null);
                                }}
                                placeholder="scratch_abc123"
                                required
                            />
                            <button type="button" onClick={generateRewardId}>
                                New
                            </button>
                        </div>
                    </label>

                    <label>
                        <span>Expires In</span>
                        <select
                            value={expiresInMinutes}
                            onChange={(event) => {
                                setExpiresInMinutes(event.target.value);
                                setSigned(null);
                            }}
                        >
                            <option value="10">10 minutes</option>
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">60 minutes</option>
                        </select>
                    </label>

                    {error && <div className={styles.error}>{error}</div>}

                    <button className={styles.primaryButton} type="submit" disabled={loading}>
                        {loading ? 'Signing...' : 'Generate Signed Redirect'}
                    </button>
                </form>

                <section className={styles.output}>
                    <div>
                        <span>Redirect URL</span>
                        <code>{exampleUrl}</code>
                    </div>

                    {signed && (
                        <div>
                            <span>Signed message</span>
                            <code>{signed.message}</code>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <button type="button" onClick={copyUrl} disabled={!canOpen}>
                            {copied ? 'Copied' : 'Copy URL'}
                        </button>
                        <button type="button" onClick={openRedemption} disabled={!canOpen}>
                            Open Redemption
                        </button>
                    </div>
                </section>
            </section>
        </main>
    );
}
