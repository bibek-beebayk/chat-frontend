'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePlayerDashboardData } from '@/hooks/usePlayerDashboardData';
import { displayLabelForDailyProgressItem } from '@/lib/xp';
import { PromoCard } from '@/types';
import { WelcomeBanner } from './WelcomeBanner';
import { PasswordSetupNotice } from './PasswordSetupNotice';
import { PlayerProgressCard } from './PlayerProgressCard';
import { LoginStreakCard } from './LoginStreakCard';
import { PlayerStatsBar } from './PlayerStatsBar';
import { TodaysMissionBanner } from './TodaysMissionBanner';
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
    const { streak, dailyProgress, events, onlineFriends, recentActivity, recentGames, recentSlotsGames, posts, refetchSection } =
        usePlayerDashboardData();

    const promoCards = useMemo<PromoCard[]>(() => {
        const cards: PromoCard[] = [];
        const roundsChallenge = dailyProgress.data?.find((item) => item.slug === 'daily_challenge_rounds');
        if (roundsChallenge && !roundsChallenge.completed) {
            cards.push({
                kind: 'challenge',
                slug: roundsChallenge.slug,
                label: displayLabelForDailyProgressItem(roundsChallenge),
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
            <div className={styles.statsBar}>
                <PlayerStatsBar
                    streak={streak.data}
                    streakLoading={streak.loading}
                    streakError={streak.error}
                    onRetryStreak={() => refetchSection('streak')}
                    onStreakRedeemed={() => refetchSection('streak')}
                />
            </div>
            <div className={styles.hero}><HeroPanel /></div>

            <div className={styles.playCtaArea}>
                <a href="https://demo.hi-rollin.online/" target="_blank" rel="noopener noreferrer" className={styles.playCta}>
                    <div className={styles.playCtaTop}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/hi-rollin_logo_2.png" alt="" className={styles.playCtaCrown} />
                        <div className={styles.playCtaBody}>
                            <div className={styles.playCtaTitleRow}>
                                <span className={styles.playCtaTitle}>Play Hi-Rollin</span>
                                <span className={styles.playCtaLiveTag}>Live</span>
                            </div>
                            <span className={styles.playCtaSubtitle}>Compete, climb, win big every season</span>
                        </div>
                    </div>
                    <span className={styles.playCtaBtn}>Play Now</span>
                </a>
            </div>
            <div className={styles.rewardsCtaArea}>
                <Link href="/rewards" className={styles.rewardsCta}>View Rewards</Link>
            </div>

            {promoCards.length > 0 && (
                <div className={styles.promo}><PromoCarousel cards={promoCards} /></div>
            )}

            <div className={styles.mission}>
                <TodaysMissionBanner items={dailyProgress.data} />
            </div>

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
                    plinkoRounds={recentGames.data}
                    slotsRounds={recentSlotsGames.data}
                    loading={recentGames.loading || recentSlotsGames.loading}
                    error={recentGames.error && recentSlotsGames.error ? recentGames.error : null}
                    onRetry={() => {
                        refetchSection('recentGames');
                        refetchSection('recentSlotsGames');
                    }}
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
