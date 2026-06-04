'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasCompletedSocialOnboarding, socialApi } from '@/lib/social';
import { User } from '@/types';
import { resolveProfileImageUrl } from '@/lib/social';
import styles from './page.module.css';

type Step = 1 | 2;

export default function OnboardingPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(true);
    const [actionBusyId, setActionBusyId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sentRequestIds, setSentRequestIds] = useState<number[]>([]);
    const [agents, setAgents] = useState<User[]>([]);
    const [players, setPlayers] = useState<User[]>([]);

    const currentList = step === 1 ? agents : players;
    const currentTitle = step === 1 ? 'Connect with top agents' : 'Meet other players';
    const currentSubtitle = step === 1
        ? 'Find trusted agents to chat with and start building your gaming network.'
        : 'Build your circle, discover shared interests, and open direct conversations.';
    const stepLabel = step === 1 ? 'Step 1 of 2' : 'Step 2 of 2';

    const loadStepData = async (targetStep: Step) => {
        if (targetStep === 1) {
            const suggestedAgents = await socialApi.fetchSuggestedAgents();
            setAgents(suggestedAgents);
            await socialApi.updateOnboardingState({ has_seen_agent_suggestions: true });
            return;
        }
        const suggestedPlayers = await socialApi.fetchSuggestedPlayers();
        setPlayers(suggestedPlayers);
        await socialApi.updateOnboardingState({ has_seen_player_suggestions: true });
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        if (user.user_type !== 'player') {
            router.replace('/');
            return;
        }

        const init = async () => {
            setLoading(true);
            setError(null);
            try {
                const state = await socialApi.fetchOnboardingState();
                if (hasCompletedSocialOnboarding(state)) {
                    router.replace('/');
                    return;
                }
                await loadStepData(1);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load onboarding');
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [authLoading, router, user]);

    const goToStepTwo = async () => {
        setLoading(true);
        setError(null);
        try {
            if (players.length === 0) {
                await loadStepData(2);
            }
            setStep(2);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to continue onboarding');
        } finally {
            setLoading(false);
        }
    };

    const finishOnboarding = async () => {
        setLoading(true);
        setError(null);
        try {
            await socialApi.updateOnboardingState({ has_completed_social_onboarding: true });
            router.replace('/');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
            setLoading(false);
        }
    };

    const connectUser = async (target: User) => {
        setActionBusyId(target.id);
        setError(null);
        try {
            await socialApi.createConnection(target.id, { initiatedFromOnboarding: true });
            setSentRequestIds((prev) => (prev.includes(target.id) ? prev : [...prev, target.id]));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send connection request');
        } finally {
            setActionBusyId(null);
        }
    };

    const openProfile = (target: User) => {
        router.push(`/users/${target.id}`);
    };

    const emptyMessage = useMemo(
        () => (step === 1
            ? 'No agent suggestions are available right now.'
            : 'No player suggestions are available right now.'),
        [step]
    );

    if (authLoading || !user) return null;

    return (
        <main className={styles.page}>
            <section className={styles.panel}>
                <header className={styles.hero}>
                    <p className={styles.stepLabel}>{stepLabel}</p>
                    <h1 className={styles.title}>{currentTitle}</h1>
                    <p className={styles.subtitle}>{currentSubtitle}</p>
                </header>

                {error && <p className={styles.error}>{error}</p>}

                {loading ? (
                    <div className={styles.loadingWrap}>
                        <div className="spinner" />
                    </div>
                ) : (
                    <>
                        {currentList.length === 0 ? (
                            <p className={styles.empty}>{emptyMessage}</p>
                        ) : (
                            <ul className={styles.list}>
                                {currentList.map((target) => {
                                    const imageUrl = resolveProfileImageUrl(target);
                                    const fallback = target.username?.charAt(0)?.toUpperCase() || 'U';
                                    const requestSent = sentRequestIds.includes(target.id) || target.connection_status === 'pending_outgoing';

                                    return (
                                        <li key={target.id} className={styles.card}>
                                            <div className={styles.userMain}>
                                                <div className={styles.avatar}>
                                                    {imageUrl ? <img src={imageUrl} alt={`${target.username} profile`} /> : <span>{fallback}</span>}
                                                </div>
                                                <p className={styles.username}>{target.username}</p>
                                            </div>
                                            <div className={styles.cardActions}>
                                                <button type="button" className={styles.secondaryBtn} onClick={() => openProfile(target)}>
                                                    Profile
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.primaryBtn}
                                                    onClick={() => connectUser(target)}
                                                    disabled={actionBusyId === target.id || requestSent}
                                                >
                                                    {requestSent ? 'Requested' : actionBusyId === target.id ? '...' : 'Connect'}
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        <div className={styles.footerActions}>
                            {step === 1 ? (
                                <>
                                    <button type="button" className={styles.secondaryBtn} onClick={goToStepTwo}>
                                        Skip for now
                                    </button>
                                    <button type="button" className={styles.primaryBtn} onClick={goToStepTwo}>
                                        Continue
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button type="button" className={styles.secondaryBtn} onClick={finishOnboarding}>
                                        Skip for now
                                    </button>
                                    <button type="button" className={styles.primaryBtn} onClick={finishOnboarding}>
                                        Finish
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}
