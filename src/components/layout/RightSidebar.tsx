'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsApi } from '@/lib/analytics';
import { eventsApi } from '@/lib/events';
import { rewardsApi } from '@/lib/rewards';
import { resolveProfileImageUrl } from '@/lib/social';
import { ActivityEvent, Event, LoginStreakStatus } from '@/types';
import { Toast } from '@/components/ui/Toast';
import styles from './RightSidebar.module.css';

type ToastState = { message: string; type: 'success' | 'error' } | null;

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
    const [redeemModalOpen, setRedeemModalOpen] = useState(false);
    const [hiRollinUsername, setHiRollinUsername] = useState('');
    const [toast, setToast] = useState<ToastState>(null);

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

    const openRedeemModal = () => {
        setStreakError('');
        setHiRollinUsername((user?.external_user_id || '').trim());
        setRedeemModalOpen(true);
    };

    const requestRedemption = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const username = hiRollinUsername.trim();
        if (!username) {
            setStreakError('Hi-Rollin account username is required.');
            return;
        }

        setRedeeming(true);
        setStreakError('');
        try {
            await rewardsApi.requestRedemption({ hi_rollin_username: username });
            setRedeemModalOpen(false);
            await loadStreak();
            setToast({ message: 'Redeem request submitted successfully.', type: 'success' });
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
                        <div className={styles.streakTitle}>
                            <h3>Login Streak</h3>
                            <span
                                className={styles.streakInfo}
                                tabIndex={0}
                                aria-label="Login for consecutive 7 days to get the bonus. The streak will reset if you miss to visit the site during the streak. The redeem button will unlock after the streak is complete."
                            >
                                i
                            </span>
                        </div>
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
                                <div className={`${styles.requestStatus} ${styles[`redemptionStatus_${streak.active_redemption_request.status}`] || ''}`}>
                                    Redeem request: <strong>{streak.active_redemption_request.status_label || streak.active_redemption_request.status}</strong>
                                </div>
                            ) : streak.reward_available ? (
                                <button
                                    type="button"
                                    className={styles.completeBtn}
                                    onClick={openRedeemModal}
                                    disabled={redeeming}
                                >
                                    {redeeming ? 'Requesting...' : 'Request Redeem'}
                                </button>
                            ) : null}
                            {streak.last_redemption_request && !streak.active_redemption_request && (
                                <div className={`${styles.lastRedemptionStatus} ${styles[`redemptionStatus_${streak.last_redemption_request.status}`] || ''}`}>
                                    <span>Last Login Streak Bonus Status</span>
                                    <strong>{streak.last_redemption_request.status_label || streak.last_redemption_request.status}</strong>
                                    {streak.last_redemption_request.status === 'rejected' && streak.last_redemption_request.staff_note && (
                                        <p>{streak.last_redemption_request.staff_note}</p>
                                    )}
                                </div>
                            )}
                            {streak.last_scratch_redemption_request && (
                                <div className={`${styles.lastRedemptionStatus} ${styles[`redemptionStatus_${streak.last_scratch_redemption_request.status}`] || ''}`}>
                                    <span>Last Scratch Bonus Status</span>
                                    <strong>{streak.last_scratch_redemption_request.status_label || streak.last_scratch_redemption_request.status}</strong>
                                    {streak.last_scratch_redemption_request.status === 'rejected' && streak.last_scratch_redemption_request.staff_note && (
                                        <p>{streak.last_scratch_redemption_request.staff_note}</p>
                                    )}
                                </div>
                            )}
                            {streak.last_win_redemption_request && (
                                <div className={`${styles.lastRedemptionStatus} ${styles[`redemptionStatus_${streak.last_win_redemption_request.status}`] || ''}`}>
                                    <span>Last Win Bonus Status</span>
                                    <strong>{streak.last_win_redemption_request.status_label || streak.last_win_redemption_request.status}</strong>
                                    {streak.last_win_redemption_request.status === 'rejected' && streak.last_win_redemption_request.staff_note && (
                                        <p>{streak.last_win_redemption_request.staff_note}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={styles.streakState}>Streak starts after your next login.</div>
                    )}
                    {streakError && <p className={styles.streakError}>{streakError}</p>}
                </div>
            )}
            {redeemModalOpen && (
                <div className={styles.redeemModalBackdrop} role="presentation" onMouseDown={() => !redeeming && setRedeemModalOpen(false)}>
                    <form className={styles.redeemModal} onSubmit={requestRedemption} onMouseDown={(event) => event.stopPropagation()}>
                        <div className={styles.redeemModalHeader}>
                            <div>
                                <span>Redeem Bonus</span>
                                <h3>Hi-Rollin account</h3>
                            </div>
                            <button type="button" onClick={() => setRedeemModalOpen(false)} disabled={redeeming} aria-label="Close redeem request dialog">×</button>
                        </div>
                        <p>Enter the Hi-Rollin account username where the $5 streak credit should be applied.</p>
                        <label className={styles.redeemField}>
                            <span>Hi-Rollin username</span>
                            <input
                                type="text"
                                value={hiRollinUsername}
                                onChange={(event) => setHiRollinUsername(event.target.value)}
                                placeholder="Enter account username"
                                autoFocus
                                disabled={redeeming}
                            />
                        </label>
                        <div className={styles.redeemActions}>
                            <button type="button" onClick={() => setRedeemModalOpen(false)} disabled={redeeming}>Cancel</button>
                            <button type="submit" disabled={redeeming || !hiRollinUsername.trim()}>
                                {redeeming ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
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
                        recentActivity.map((activity) => {
                            const avatarUrl = resolveProfileImageUrl(activity.actor);
                            const actorName = activity.actor?.username || 'Community';

                            return (
                                <div key={activity.id} className={styles.activityItem}>
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={`${actorName} profile`} className={styles.activityAvatar} />
                                    ) : (
                                        <div className={styles.activityAvatarFallback}>
                                            {getInitials(activity.actor?.username || 'RC')}
                                        </div>
                                    )}
                                    <div className={styles.activityInfo}>
                                        <p><strong>{actorName}</strong> {activity.action}</p>
                                        <span className={styles.activityTime}>{formatRelativeTime(activity.created_at)}</span>
                                    </div>
                                </div>
                            );
                        })
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
