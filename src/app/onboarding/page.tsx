'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasCompletedSocialOnboarding, socialApi } from '@/lib/social';
import { User } from '@/types';
import { UserAvatar } from '@/components/social/UserAvatar';
import { WelcomeModal } from '@/components/celebrations/WelcomeModal';
import styles from './page.module.css';

export default function OnboardingPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [showWelcome, setShowWelcome] = useState(true);
    const [loading, setLoading] = useState(true);
    const [actionBusyId, setActionBusyId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sentRequestIds, setSentRequestIds] = useState<number[]>([]);
    const [players, setPlayers] = useState<User[]>([]);

    const currentList = players;
    const currentTitle = 'Meet other players';
    const currentSubtitle = 'Build your circle, discover shared interests, and open direct conversations.';
    const connectedCount = sentRequestIds.length;

    const loadPlayerSuggestions = async () => {
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
                await loadPlayerSuggestions();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load onboarding');
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [authLoading, router, user]);

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

    const emptyMessage = 'No player suggestions are available right now.';

    if (authLoading || !user) return null;

    if (showWelcome) {
        return <WelcomeModal onDismissed={() => setShowWelcome(false)} />;
    }

    return (
        <main className={styles.page}>
            <section className={styles.shell}>
                <aside className={styles.sidePanel} aria-label="Onboarding progress">
                    <div className={styles.brandMark}>
                        <Image src="/logo-3.png" alt="Rollin Community" width={260} height={180} priority />
                    </div>
                    <div className={styles.sideCopy}>
                        <span className={styles.sideEyebrow}>Welcome to Rollin</span>
                        <h1>Set up your community circle.</h1>
                        <p>Connect with useful people now so your feed, chats, and profile start with real momentum.</p>
                    </div>
                    <div className={styles.progressCard}>
                        <div className={styles.progressHeader}>
                            <span>Step 1 of 1</span>
                            <strong>100%</strong>
                        </div>
                        <div className={styles.progressTrack}>
                            <span style={{ width: '100%' }}></span>
                        </div>
                    </div>
                    <div className={styles.sideStats}>
                        <div>
                            <span>Suggestions</span>
                            <strong>{currentList.length}</strong>
                        </div>
                        <div>
                            <span>Requests Sent</span>
                            <strong>{connectedCount}</strong>
                        </div>
                    </div>
                </aside>

                <section className={styles.panel}>
                    <header className={styles.hero}>
                        <div>
                            <p className={styles.stepLabel}>Step 1 of 1</p>
                            <h2 className={styles.title}>{currentTitle}</h2>
                            <p className={styles.subtitle}>{currentSubtitle}</p>
                        </div>
                    </header>

                    {error && <p className={styles.error}>{error}</p>}

                    {loading ? (
                        <div className={styles.loadingWrap}>
                            <div className="spinner" />
                            <p>Preparing suggestions...</p>
                        </div>
                    ) : (
                        <>
                            {currentList.length === 0 ? (
                                <div className={styles.empty}>
                                    <span>No suggestions available</span>
                                    <p>{emptyMessage}</p>
                                </div>
                            ) : (
                                <ul className={styles.list}>
                                    {currentList.map((target) => {
                                        const requestSent = sentRequestIds.includes(target.id) || target.connection_status === 'pending_outgoing';

                                        return (
                                            <li key={target.id} className={styles.card}>
                                                <button type="button" className={styles.userMain} onClick={() => openProfile(target)}>
                                                    <UserAvatar user={target} size={50} />
                                                    <div className={styles.userInfo}>
                                                        <div className={styles.nameRow}>
                                                            <p className={styles.username}>{target.username}</p>
                                                            <span>{target.user_type}</span>
                                                        </div>
                                                        <p className={styles.userMeta}>{target.headline || getSuggestionLabel(target)}</p>
                                                    </div>
                                                </button>
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
                                                        {requestSent ? 'Requested' : actionBusyId === target.id ? 'Sending...' : 'Connect'}
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            <div className={styles.footerActions}>
                                <button type="button" className={styles.secondaryBtn} onClick={finishOnboarding}>
                                    Skip for now
                                </button>
                                <button type="button" className={styles.primaryBtn} onClick={finishOnboarding}>
                                    Finish
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </section>
        </main>
    );
}

function getSuggestionLabel(target: User): string {
    if (target.user_type === 'player') return 'Player in the Rollin community';
    return 'Community member';
}
