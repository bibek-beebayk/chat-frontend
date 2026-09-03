'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePlayerDashboardData } from '@/hooks/usePlayerDashboardData';
import { PromoCard } from '@/types';
import { PromoCarousel } from './PromoCarousel';
import { WelcomeBanner } from './WelcomeBanner';
import { PasswordSetupNotice } from './PasswordSetupNotice';
import { PlayerProgressCard } from './PlayerProgressCard';
import { LoginStreakCard } from './LoginStreakCard';
import { RewardPointsCard } from './RewardPointsCard';
import { PlayerStatsBar } from './PlayerStatsBar';
import { TodaysMissionBanner } from './TodaysMissionBanner';
import { HeroPanel } from './HeroPanel';
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
 * without a separate mobile component tree. On desktop the three stat tiles
 * (.stats) and the right rail (.rail) are real wrappers; on tablet/mobile
 * they collapse to `display: contents` so their children fall back into the
 * per-breakpoint grid areas unchanged.
 */
export function PlayerHomePage() {
    const { streak, dailyProgress, events, onlineFriends, recentActivity, recentGames, recentSlotsGames, posts, refetchSection } =
        usePlayerDashboardData();

    // Feeds the PromoCarousel, which is shown on tablet/mobile only (hidden on
    // desktop, where TodaysMissionBanner is the single challenge call-to-action
    // - see PlayerHomePage.module.css .promo).
    const promoCards = useMemo<PromoCard[]>(() => {
        const cards: PromoCard[] = [];
        // The first incomplete, actionable challenge - not a specific slug,
        // so a new challenge created in admin (with a target and an
        // action_url) is eligible to be featured here with no frontend
        // change. "Actionable" excludes things like Daily Login, which has
        // no natural destination to send the player to.
        const featured = dailyProgress.data?.find((item) => !item.completed && item.action_url);
        if (featured) {
            cards.push({
                kind: 'challenge',
                slug: featured.slug,
                label: featured.label,
                current: featured.current_count,
                target: featured.target_count,
                xpValue: featured.xp_value,
                href: featured.action_url,
            });
        }
        return cards;
    }, [dailyProgress.data]);

    return (
        <div className={styles.grid}>
            <div className={styles.welcome}>
                <div className={styles.welcomeTop}>
                    <WelcomeBanner />
                    <div className={styles.brandMark}><HeroPanel variant="mark" /></div>
                </div>
                <PasswordSetupNotice />
            </div>

            <div className={styles.stats}>
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
                <div className={styles.rewardPts}><RewardPointsCard /></div>
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

            <div className={styles.rail}>
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

            <div className={styles.community}>
                <CommunityHighlights
                    posts={posts.data}
                    loading={posts.loading}
                    error={posts.error}
                    onRetry={() => refetchSection('posts')}
                />
            </div>
        </div>
    );
}
