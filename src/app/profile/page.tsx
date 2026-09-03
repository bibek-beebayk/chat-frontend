'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Toast } from '@/components/ui/Toast';
import { UserAvatar } from '@/components/social/UserAvatar';
import { RankBadge } from '@/components/home/RankBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useXpStatus } from '@/hooks/useXpStatus';
import { usePointsBalance } from '@/hooks/usePointsBalance';
import { apiClient } from '@/lib/api';
import { xpApi } from '@/lib/xp';
import { gamesApi } from '@/lib/games';
import { rewardsApi } from '@/lib/rewards';
import { Achievement, LoginStreakStatus, PlayerGameStats } from '@/types';
import styles from './page.module.css';

type ToastState = { message: string; type: 'success' | 'error' } | null;
type StatsRange = 'all' | 'week' | 'month';

const RANK_TEXT_COLORS: Record<string, string> = {
    bronze: '#cd7f32',
    silver: '#c7ccd1',
    gold: 'var(--color-accent)',
    platinum: '#8fc9e0',
    diamond: '#3fa8e0',
    rollin_elite: 'var(--color-accent)',
    rollin_legend: '#f7d774',
};

const STATS_RANGE_OPTIONS: { value: StatsRange; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
];

function capitalize(slug: string): string {
    return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading, checkAuth, updateUsername } = useAuth();
    const { data: xpStatus } = useXpStatus();
    const pointsBalance = usePointsBalance();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [toast, setToast] = useState<ToastState>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [usernameDraft, setUsernameDraft] = useState('');
    const [isSavingUsername, setIsSavingUsername] = useState(false);

    const [streak, setStreak] = useState<LoginStreakStatus | null>(null);
    const [achievements, setAchievements] = useState<Achievement[] | null>(null);
    const [statsRange, setStatsRange] = useState<StatsRange>('all');
    const [gameStats, setGameStats] = useState<PlayerGameStats | null>(null);

    const [isRangeMenuOpen, setIsRangeMenuOpen] = useState(false);
    const [rangeMenuPos, setRangeMenuPos] = useState<'down' | 'up'>('down');
    const rangeMenuRef = useRef<HTMLDivElement>(null);

    const isPlayer = user?.user_type === 'player';

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [loading, router, user]);

    useEffect(() => {
        if (!isPlayer) return;
        rewardsApi.getStreak().then(setStreak).catch(() => {});
        xpApi.getAchievements().then(setAchievements).catch(() => {});
    }, [isPlayer]);

    useEffect(() => {
        if (!isPlayer) return;
        gamesApi.getStats(statsRange).then(setGameStats).catch(() => {});
    }, [isPlayer, statsRange]);

    useLayoutEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (rangeMenuRef.current && !rangeMenuRef.current.contains(event.target as Node)) {
                setIsRangeMenuOpen(false);
            }
        };

        if (isRangeMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            if (rangeMenuRef.current) {
                const rect = rangeMenuRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;
                setRangeMenuPos(spaceBelow < 180 ? 'up' : 'down');
            }
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isRangeMenuOpen]);

    const onPickAvatar = () => {
        fileInputRef.current?.click();
    };

    const onAvatarSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setToast({ message: 'Please select an image file.', type: 'error' });
            return;
        }

        const formData = new FormData();
        formData.append('profile_picture', file);

        try {
            setIsUploadingAvatar(true);
            await apiClient.postFormData('/api/auth/profile/picture/', formData);
            await checkAuth();
            setToast({ message: 'Profile picture updated.', type: 'success' });
        } catch (error: any) {
            setToast({ message: error?.message || 'Failed to update profile picture.', type: 'error' });
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const startEditingUsername = () => {
        if (!user) return;
        setUsernameDraft(user.username);
        setIsEditingUsername(true);
    };

    const cancelEditingUsername = () => {
        setIsEditingUsername(false);
        setUsernameDraft('');
    };

    const saveUsername = async () => {
        const trimmed = usernameDraft.trim();
        if (!user || !trimmed || trimmed === user.username) {
            setIsEditingUsername(false);
            return;
        }
        try {
            setIsSavingUsername(true);
            await updateUsername(trimmed);
            setToast({ message: 'Username updated.', type: 'success' });
            setIsEditingUsername(false);
        } catch (error: any) {
            setToast({ message: error?.message || 'Failed to update username.', type: 'error' });
        } finally {
            setIsSavingUsername(false);
        }
    };

    if (loading || !user) {
        return null;
    }

    const streakRewardLabel = streak ? `$${Number(streak.reward_amount).toFixed(2)} credit` : null;

    return (
        <DashboardLayout>
            <main className={styles.main}>
                <header className={styles.topBar}>
                    <button type="button" className={styles.iconBtn} onClick={() => router.back()} aria-label="Go back">
                        <BackIcon />
                    </button>
                    <h1 className={styles.topBarTitle}>My Profile</h1>
                    <Link href="/settings" className={styles.iconBtn} aria-label="Settings">
                        <GearIcon />
                    </Link>
                </header>

                <section className={styles.profileCard}>
                    <div className={styles.profileCardTop}>
                        <div className={styles.avatarRing}>
                            <UserAvatar user={user} size={72} />
                            <span className={styles.crownBadge} aria-hidden="true">👑</span>
                            <button type="button" className={styles.avatarEditBtn} onClick={onPickAvatar} disabled={isUploadingAvatar} aria-label="Change profile picture">
                                <CameraIcon />
                            </button>
                        </div>

                        <div className={styles.profileCardInfo}>
                            {isEditingUsername ? (
                                <div className={styles.usernameEditRow}>
                                    <input
                                        className={styles.usernameInput}
                                        value={usernameDraft}
                                        onChange={(e) => setUsernameDraft(e.target.value)}
                                        autoFocus
                                        maxLength={150}
                                        disabled={isSavingUsername}
                                    />
                                    <button type="button" className={styles.usernameSaveBtn} onClick={saveUsername} disabled={isSavingUsername}>
                                        {isSavingUsername ? '...' : 'Save'}
                                    </button>
                                    <button type="button" className={styles.usernameCancelBtn} onClick={cancelEditingUsername} disabled={isSavingUsername}>
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.usernameRow}>
                                    <h2 className={styles.username}>{user.username}</h2>
                                    <button type="button" className={styles.editPencilBtn} onClick={startEditingUsername} aria-label="Edit username">
                                        <PencilIcon />
                                    </button>
                                </div>
                            )}
                            <p className={styles.playerId}>@{user.username}</p>

                            {isPlayer && xpStatus && (
                                <>
                                    <div className={styles.rankRow}>
                                        <RankBadge rank={xpStatus.rank} size="sm" badgeUrl={xpStatus.rank_badge_url} />
                                        <span className={styles.rankLabel} style={{ color: RANK_TEXT_COLORS[xpStatus.rank] }}>{xpStatus.rank_label}</span>
                                    </div>
                                    <div className={styles.xpRow}>
                                        <XpIcon />
                                        <span>
                                            {xpStatus.total_xp.toLocaleString()}
                                            {xpStatus.next_rank_xp != null ? ` / ${xpStatus.next_rank_xp.toLocaleString()} XP` : ' XP'}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {isPlayer && xpStatus && (
                        <Link href="/levels" className={styles.progressBlock}>
                            <div className={styles.progressTrack} role="progressbar" aria-valuenow={xpStatus.rank_progress_percent} aria-valuemin={0} aria-valuemax={100}>
                                <div className={styles.progressFill} style={{ width: `${xpStatus.rank_progress_percent}%` }} />
                            </div>
                            <p className={styles.progressCaption}>
                                {xpStatus.next_rank
                                    ? `${xpStatus.xp_to_next_rank.toLocaleString()} XP to reach ${capitalize(xpStatus.next_rank)}`
                                    : 'Top rank reached'}
                                <span className={styles.progressCaptionLink}>View Rollin Levels ›</span>
                            </p>
                        </Link>
                    )}
                </section>

                {isPlayer && (
                    <section className={styles.statRow}>
                        <div className={styles.statTile}>
                            <span className={styles.statValue}>{pointsBalance.toLocaleString()}</span>
                            <span className={styles.statLabel}>RP</span>
                        </div>
                        <div className={styles.statTile}>
                            <span className={styles.statValue}>{xpStatus ? `#${xpStatus.global_rank.toLocaleString()}` : '—'}</span>
                            <span className={styles.statLabel}>Global Rank</span>
                        </div>
                    </section>
                )}

                {isPlayer && (xpStatus || streak) && (
                    <section className={styles.sectionCard}>
                        <h3 className={styles.sectionTitle}>Next Rewards</h3>
                        <div className={styles.rewardsList}>
                            {xpStatus?.next_rank && (
                                <div className={styles.rewardRow}>
                                    <span className={styles.rewardLockIcon}><LockIcon /></span>
                                    <div className={styles.rewardText}>
                                        <strong>{capitalize(xpStatus.next_rank)} Rank</strong>
                                        <small>{xpStatus.next_rank_xp?.toLocaleString()} XP</small>
                                    </div>
                                </div>
                            )}
                            {streak && (
                                <div className={styles.rewardRow}>
                                    <span className={`${styles.rewardLockIcon} ${streak.reward_available ? styles.rewardUnlocked : ''}`}>
                                        {streak.reward_available ? <CheckIcon /> : <LockIcon />}
                                    </span>
                                    <div className={styles.rewardText}>
                                        <strong>Daily Streak - {streakRewardLabel}</strong>
                                        <small>Day {Math.min(streak.current_streak, streak.target_days)} of {streak.target_days}</small>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {isPlayer && achievements && (
                    <section className={styles.sectionCard}>
                        <h3 className={styles.sectionTitle}>Achievements</h3>
                        <div className={styles.achievementsRow}>
                            {achievements.map((achievement) => (
                                <div key={achievement.slug} className={styles.achievementItem}>
                                    <div className={`${styles.achievementBadge} ${achievement.unlocked ? styles.achievementUnlocked : styles.achievementLocked}`}>
                                        <span aria-hidden="true">{achievement.icon || '⭐'}</span>
                                        {!achievement.unlocked && <span className={styles.achievementLockOverlay}><LockIcon /></span>}
                                    </div>
                                    <span className={styles.achievementLabel}>{achievement.label}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {isPlayer && (
                    <section className={styles.sectionCard}>
                        <div className={styles.statsHeader}>
                            <h3 className={styles.sectionTitle}>Stats</h3>
                            <div className={styles.rangeMenuWrap} ref={rangeMenuRef}>
                                <button
                                    type="button"
                                    className={styles.rangeSelect}
                                    aria-haspopup="listbox"
                                    aria-expanded={isRangeMenuOpen}
                                    onClick={() => setIsRangeMenuOpen((open) => !open)}
                                >
                                    {STATS_RANGE_OPTIONS.find((o) => o.value === statsRange)?.label}
                                    <ChevronDownIcon />
                                </button>
                                {isRangeMenuOpen && (
                                    <div className={`${styles.rangeMenu} ${rangeMenuPos === 'up' ? styles.rangeMenuUp : ''}`} role="listbox">
                                        {STATS_RANGE_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                role="option"
                                                aria-selected={statsRange === option.value}
                                                className={`${styles.rangeMenuItem} ${statsRange === option.value ? styles.rangeMenuItemActive : ''}`}
                                                onClick={() => {
                                                    setStatsRange(option.value);
                                                    setIsRangeMenuOpen(false);
                                                }}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={styles.gameStatsGrid}>
                            <div className={styles.gameStatTile}>
                                <span className={styles.statValue}>{gameStats ? gameStats.rounds_played.toLocaleString() : '—'}</span>
                                <span className={styles.statLabel}>Rounds Played</span>
                            </div>
                            <div className={styles.gameStatTile}>
                                <span className={styles.statValue}>{gameStats ? gameStats.total_wins.toLocaleString() : '—'}</span>
                                <span className={styles.statLabel}>Total Wins</span>
                            </div>
                            <div className={styles.gameStatTile}>
                                <span className={styles.statValue}>{gameStats?.highest_multiplier ? `${Number(gameStats.highest_multiplier).toFixed(2)}x` : '—'}</span>
                                <span className={styles.statLabel}>Highest Multiplier</span>
                            </div>
                        </div>
                    </section>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onAvatarSelected}
                    className={styles.hiddenFileInput}
                />
            </main>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </DashboardLayout>
    );
}

function BackIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
        </svg>
    );
}

function GearIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );
}

function CameraIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
}

function PencilIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
        </svg>
    );
}

function XpIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}

function LockIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function ChevronDownIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}
