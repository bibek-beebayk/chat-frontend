'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsApi } from '@/lib/analytics';
import { eventsApi } from '@/lib/events';
import { rewardsApi } from '@/lib/rewards';
import { ActivityEvent, Event, LoginStreakStatus } from '@/types';
import styles from './RightSidebar.module.css';

export function RightSidebar() {
    const { user } = useAuth();
    const [streak, setStreak] = useState<LoginStreakStatus | null>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
    const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(true);
    const [streakLoading, setStreakLoading] = useState(false);
    const [streakError, setStreakError] = useState('');
    const [redeeming, setRedeeming] = useState(false);

    const loadStreak = async () => {
        if (!user || user.user_type !== 'player') return;
        setStreakLoading(true);
        setStreakError('');
        try {
            setStreak(await rewardsApi.recordVisit());
        } catch (error: any) {
            try {
                setStreak(await rewardsApi.getStreak());
            } catch {
                setStreakError(error?.message || 'Unable to load streak.');
            }
        } finally {
            setStreakLoading(false);
        }
    };

    useEffect(() => {
        loadStreak();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, user?.user_type]);

    useEffect(() => {
        if (!user) return;

        const loadSidebarData = async () => {
            setEventsLoading(true);
            setActivityLoading(true);

            try {
                setUpcomingEvents(await eventsApi.listUpcoming(3));
            } catch {
                setUpcomingEvents([]);
            } finally {
                setEventsLoading(false);
            }

            try {
                setRecentActivity(await analyticsApi.getRecentActivity(5));
            } catch {
                setRecentActivity([]);
            } finally {
                setActivityLoading(false);
            }
        };

        loadSidebarData();
    }, [user]);

    const requestRedemption = async () => {
        setRedeeming(true);
        setStreakError('');
        try {
            await rewardsApi.requestRedemption();
            await loadStreak();
        } catch (error: any) {
            setStreakError(error?.message || 'Unable to create redeem request.');
        } finally {
            setRedeeming(false);
        }
    };

    return (
        <div className={styles.rightSidebar}>
            {user?.user_type === 'player' && (
                <div className={`${styles.widget} ${styles.streakWidget}`}>
                    <div className={styles.widgetHeader}>
                        <h3>Login Streak</h3>
                        <span className={styles.streakReward}>$5 Credit</span>
                    </div>

                    {streakLoading && !streak ? (
                        <div className={styles.streakState}>Loading streak...</div>
                    ) : streak ? (
                        <div className={styles.streakContent}>
                            <div className={styles.streakRing}>
                                <strong>{Math.min(streak.current_streak, streak.target_days)}</strong>
                                <span>/ {streak.target_days}</span>
                            </div>
                            <div className={styles.streakCopy}>
                                <h4>{streak.reward_available ? 'Bonus unlocked' : `${streak.days_remaining} days to unlock`}</h4>
                                <p>
                                    {streak.reward_available
                                        ? `$${Number(streak.receivable_bonus).toFixed(2)} is ready to redeem.`
                                        : 'Log in daily for 7 consecutive days to earn Hi-Rollin credit.'}
                                </p>
                            </div>
                            <div className={styles.progressBarBg}>
                                <div
                                    className={styles.progressBarFill}
                                    style={{ width: `${Math.min(100, (streak.current_streak / streak.target_days) * 100)}%` }}
                                ></div>
                            </div>
                            {streak.active_redemption_request ? (
                                <div className={styles.requestStatus}>
                                    Redeem request: <strong>{streak.active_redemption_request.status_label || streak.active_redemption_request.status}</strong>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className={styles.completeBtn}
                                    onClick={requestRedemption}
                                    disabled={!streak.reward_available || redeeming}
                                >
                                    {redeeming ? 'Requesting...' : 'Request Redeem'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className={styles.streakState}>Streak starts after your next login.</div>
                    )}
                    {streakError && <p className={styles.streakError}>{streakError}</p>}
                </div>
            )}
            
            {/* Online Members */}
            {/* <div className={styles.widget}>
                <div className={styles.widgetHeader}>
                    <h3>Online Members</h3>
                    <span className={styles.onlineCount}><span className={styles.dot}></span>238 Online</span>
                </div>
                <div className={styles.memberList}>
                    {onlineMembers.map((member, i) => (
                        <div key={i} className={styles.memberItem}>
                            <img src={member.avatar} alt={member.name} className={styles.memberAvatar} />
                            <div className={styles.memberInfo}>
                                <h4>{member.name}</h4>
                                <p>Level {member.level}</p>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.chevron}><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </div>
                    ))}
                </div>
                <Link href="/members" className={styles.viewAllBtn}>View All Members</Link>
            </div> */}

            {/* Upcoming Events */}
            <div className={styles.widget}>
                <div className={styles.widgetHeader}>
                    <h3>Upcoming Events</h3>
                    <Link href="/events" className={styles.headerLink}>View All</Link>
                </div>
                <div className={styles.eventList}>
                    {eventsLoading ? (
                        <div className={styles.emptyState}>Loading events...</div>
                    ) : upcomingEvents.length === 0 ? (
                        <div className={styles.emptyState}>No upcoming events yet.</div>
                    ) : (
                        upcomingEvents.map((event) => {
                            const date = new Date(event.start_date);
                            const month = date.toLocaleDateString('en', { month: 'short' });
                            const day = date.toLocaleDateString('en', { day: '2-digit' });
                            return (
                                <div key={event.id} className={styles.eventItem}>
                                    <div className={styles.eventDateBox}>
                                        <span className={styles.eventMonth}>{month}</span>
                                        <span className={styles.eventDay}>{day}</span>
                                    </div>
                                    <div className={styles.eventInfo}>
                                        <h4>{event.title}</h4>
                                        <p>{formatEventRange(event.start_date, event.end_date)}</p>
                                        <Link href={`/events/${event.id}`} className={styles.joinLink}>View Event</Link>
                                    </div>
                                </div>
                            );
                        }))}
                </div>
            </div>

            {/* Recent Activity */}
            <div className={styles.widget}>
                <div className={styles.widgetHeader}>
                    <h3>Recent Activity</h3>
                </div>
                <div className={styles.activityList}>
                    {activityLoading ? (
                        <div className={styles.emptyState}>Loading activity...</div>
                    ) : recentActivity.length === 0 ? (
                        <div className={styles.emptyState}>No recent activity yet.</div>
                    ) : (
                        recentActivity.map((activity) => (
                            <div key={activity.id} className={styles.activityItem}>
                                {activity.actor?.avatar ? (
                                    <img src={activity.actor.avatar} alt={activity.actor.username} className={styles.activityAvatar} />
                                ) : (
                                    <div className={styles.activityAvatarFallback}>
                                        {getInitials(activity.actor?.username || 'RC')}
                                    </div>
                                )}
                                <div className={styles.activityInfo}>
                                    <p><strong>{activity.actor?.username || 'Community'}</strong> {activity.action}</p>
                                    <span className={styles.activityTime}>{formatRelativeTime(activity.created_at)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <Link href="/activity" className={styles.viewAllBtn}>View All Activity</Link>
            </div>

            {/* Level Progress */}
            {/* <div className={styles.widget}>
                <div className={styles.widgetHeader}>
                    <h3>Level Progress</h3>
                </div>
                <div className={styles.progressSection}>
                    <div className={styles.progressHeader}>
                        <span>Level 12</span>
                        <span>300 / 500 XP</span>
                    </div>
                    <div className={styles.progressBarBg}>
                        <div className={styles.progressBarFill} style={{ width: '60%' }}></div>
                    </div>
                    <div className={styles.progressFooter}>60%</div>
                </div>
                
                <div className={styles.completeProfile}>
                    <div className={styles.completeText}>
                        <h4>Complete your profile</h4>
                        <p>Earn 200 XP</p>
                    </div>
                    <button className={styles.completeBtn}>Complete Profile</button>
                </div>
            </div> */}

        </div>
    );
}

function formatEventRange(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
    const startLabel = startDate.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    const endLabel = endDate.toLocaleDateString('en', sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
    return `${startLabel} - ${endLabel}`;
}

function formatRelativeTime(value: string): string {
    const timestamp = new Date(value).getTime();
    const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return 'Just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

    return new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}
