'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePlayerDashboardData } from '@/hooks/usePlayerDashboardData';
import { PromoCard } from '@/types';
import { WelcomeBanner } from './WelcomeBanner';
import { PasswordSetupNotice } from './PasswordSetupNotice';
import { PlayerProgressCard } from './PlayerProgressCard';
import { LoginStreakCard } from './LoginStreakCard';
import { HeroPanel } from './HeroPanel';
import { PromoCarousel } from './PromoCarousel';
import { DailyChallengesCard } from './DailyChallengesCard';
import { RewardsOverviewCard } from './RewardsOverviewCard';
import { ContinuePlayingCard } from './ContinuePlayingCard';
import { UpcomingEventsCard } from './UpcomingEventsCard';
import { OnlineFriendsList } from './OnlineFriendsList';
import { RecentActivityCard } from './RecentActivityCard';
import { CommunityHighlights } from './CommunityHighlights';
import styles from './PlayerHomePage.module.css';

/**
 * Top-level orchestrator for the player-only homepage. Every section is a
 * direct child of one CSS grid (PlayerHomePage.module.css) so each
 * breakpoint's grid-template-areas can genuinely reorder/hide sections
 * (e.g. hero omitted on mobile, streak/events/friends repositioned) without
 * a separate mobile component tree.
 */
export function PlayerHomePage() {
    const { streak, dailyProgress, events, onlineFriends, recentActivity, recentGames, posts, refetchSection } =
        usePlayerDashboardData();

    const promoCards = useMemo<PromoCard[]>(() => {
        const cards: PromoCard[] = [];
        const roundsChallenge = dailyProgress.data?.find((item) => item.slug === 'daily_challenge_rounds');
        if (roundsChallenge && !roundsChallenge.completed) {
            cards.push({
                kind: 'challenge',
                slug: roundsChallenge.slug,
                label: roundsChallenge.label,
                current: roundsChallenge.current_count,
                target: roundsChallenge.target_count,
                xpValue: roundsChallenge.xp_value,
                href: '/games/plinko',
            });
        }
        return cards;
    }, [dailyProgress.data]);

    return (
        <div className={styles.grid}>
            <div className={styles.welcome}>
                <WelcomeBanner />
                <PasswordSetupNotice />
            </div>

            <div className={styles.progress}><PlayerProgressCard /></div>
            <div className={styles.streak}>
                <LoginStreakCard
                    streak={streak.data}
                    loading={streak.loading}
                    error={streak.error}
                    onRetry={() => refetchSection('streak')}
                    onRedeemed={() => refetchSection('streak')}
                />
            </div>
            <div className={styles.hero}><HeroPanel /></div>

            <div className={styles.playCtaArea}>
                <a href="https://demo.hi-rollin.online/" target="_blank" rel="noopener noreferrer" className={styles.playCta}>Play Hi-Rollin</a>
            </div>
            <div className={styles.rewardsCtaArea}>
                <Link href="/rewards" className={styles.rewardsCta}>View Rewards</Link>
            </div>

            {promoCards.length > 0 && (
                <div className={styles.promo}><PromoCarousel cards={promoCards} /></div>
            )}

            <div className={styles.challenges}>
                <DailyChallengesCard
                    items={dailyProgress.data}
                    loading={dailyProgress.loading}
                    error={dailyProgress.error}
                    onRetry={() => refetchSection('dailyProgress')}
                    limit={3}
                />
            </div>
            <div className={styles.rewards}>
                <RewardsOverviewCard
                    streak={streak.data}
                    loading={streak.loading}
                    error={streak.error}
                    onRetry={() => refetchSection('streak')}
                />
            </div>
            <div className={styles.continue}>
                <ContinuePlayingCard
                    rounds={recentGames.data}
                    loading={recentGames.loading}
                    error={recentGames.error}
                    onRetry={() => refetchSection('recentGames')}
                />
            </div>

            <div className={styles.events}>
                <UpcomingEventsCard
                    events={events.data}
                    loading={events.loading}
                    error={events.error}
                    onRetry={() => refetchSection('events')}
                />
            </div>
            <div className={styles.friends}>
                <OnlineFriendsList
                    connections={onlineFriends.data}
                    loading={onlineFriends.loading}
                    error={onlineFriends.error}
                    onRetry={() => refetchSection('onlineFriends')}
                />
            </div>

            <div className={styles.community}>
                <CommunityHighlights
                    posts={posts.data}
                    loading={posts.loading}
                    error={posts.error}
                    onRetry={() => refetchSection('posts')}
                />
            </div>

            <div className={styles.activity}>
                <RecentActivityCard
                    activity={recentActivity.data}
                    loading={recentActivity.loading}
                    error={recentActivity.error}
                    onRetry={() => refetchSection('recentActivity')}
                    limit={3}
                />
            </div>
        </div>
    );
}
