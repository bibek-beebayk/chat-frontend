'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { gamesApi } from '@/lib/games';
import { getFavoriteGameSlugs, toggleFavoriteGame } from '@/lib/favoriteGames';
import { Game, RecentWin } from '@/types';
import styles from './page.module.css';

const GAME_ROUTES: Record<string, string> = {
    plinko: '/games/plinko',
    slots: '/games/slots',
    rocket: '/games/rocket',
};

const GAME_ICONS: Record<string, string> = {
    plinko: '🔴',
    slots: '🎰',
    rocket: '🚀',
};

const GAME_TAGS: Record<string, 'Popular' | 'New'> = {
    plinko: 'Popular',
    slots: 'Popular',
    rocket: 'New',
};

// Real, sourced figures (not invented for display) - see the code comments
// they're pulled from: plinko/constants.py (rows=8 is the only offered
// config; RTP band + per-risk max multiplier documented there), slots
// services/constants (10M-spin simulation result), rocket/constants.py
// (HOUSE_EDGE and MAX_CRASH_MULTIPLIER). Plinko's volatility is player-
// selectable in-game rather than one fixed value, so it's labeled as such
// instead of picking one risk tier to represent all of them.
const GAME_STATS: Record<string, { rtp: string; maxWin: string; volatility: string }> = {
    plinko: { rtp: 'Up to 98.5%', maxWin: '27x', volatility: 'Adjustable' },
    slots: { rtp: '95.71%', maxWin: '81x', volatility: 'Medium' },
    rocket: { rtp: '~96%', maxWin: '1000x', volatility: 'High' },
};

function formatRelativeTime(value: string): string {
    const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export default function GameDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const slug = typeof params.slug === 'string' ? params.slug : '';

    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [wins, setWins] = useState<RecentWin[]>([]);
    const [winsLoading, setWinsLoading] = useState(true);
    const [isFavorited, setIsFavorited] = useState(false);

    useEffect(() => {
        setIsFavorited(getFavoriteGameSlugs().includes(slug));
    }, [slug]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        gamesApi.list()
            .then((games) => {
                if (cancelled) return;
                setGame(games.find((g) => g.slug === slug) || null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [slug]);

    useEffect(() => {
        if (!slug) return;
        let cancelled = false;
        setWinsLoading(true);
        gamesApi.getRecentWins(slug)
            .then((data) => {
                if (!cancelled) setWins(data);
            })
            .catch(() => {
                if (!cancelled) setWins([]);
            })
            .finally(() => {
                if (!cancelled) setWinsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [slug]);

    const handleToggleFavorite = () => {
        setIsFavorited(toggleFavoriteGame(slug));
    };

    const playRoute = GAME_ROUTES[slug];
    const tag = GAME_TAGS[slug];
    const stats = GAME_STATS[slug];

    return (
        <DashboardLayout>
            <main className={styles.main}>
                <header className={styles.topBar}>
                    <button type="button" className={styles.iconBtn} onClick={() => router.back()} aria-label="Go back">
                        <BackIcon />
                    </button>
                    <h1 className={styles.topBarTitle}>{game?.name || 'Game'}</h1>
                    <button
                        type="button"
                        className={`${styles.iconBtn} ${isFavorited ? styles.iconBtnActive : ''}`}
                        onClick={handleToggleFavorite}
                        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        aria-pressed={isFavorited}
                    >
                        <HeartIcon filled={isFavorited} />
                    </button>
                </header>

                {loading ? (
                    <div className={styles.loadingArea}><div className="spinner"></div></div>
                ) : !game ? (
                    <div className={styles.emptyState}>Game not found.</div>
                ) : (
                    <div className={styles.layout}>
                        <div className={styles.hero}>
                            {game.thumbnail && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={game.thumbnail} alt="" aria-hidden="true" className={styles.heroBg} />
                            )}
                            <div className={styles.heroInner}>
                                <div className={styles.heroArt}>
                                    {game.thumbnail ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={game.thumbnail} alt={`${game.name} thumbnail`} className={styles.heroImg} />
                                    ) : (
                                        <span className={styles.heroFallback} aria-hidden="true">{GAME_ICONS[slug] || '🎮'}</span>
                                    )}
                                </div>

                                <div className={styles.heroInfo}>
                                    <div className={styles.titleRow}>
                                        <h2 className={styles.gameName}>{game.name}</h2>
                                        {tag && <span className={styles.tag}>{tag}</span>}
                                    </div>
                                    {game.description && <p className={styles.description}>{game.description}</p>}

                                    {stats && (
                                        <div className={styles.statsGrid}>
                                            <div className={styles.statTile}>
                                                <span className={styles.statLabel}>RTP</span>
                                                <strong className={styles.statValue}>{stats.rtp}</strong>
                                            </div>
                                            <div className={styles.statTile}>
                                                <span className={styles.statLabel}>Max Win</span>
                                                <strong className={styles.statValue}>{stats.maxWin}</strong>
                                            </div>
                                            <div className={styles.statTile}>
                                                <span className={styles.statLabel}>Volatility</span>
                                                <strong className={styles.statValue}>{stats.volatility}</strong>
                                            </div>
                                        </div>
                                    )}

                                    {playRoute && (
                                        <Link href={playRoute} className={styles.playBtn}>Play Now</Link>
                                    )}
                                </div>
                            </div>
                        </div>

                        <section className={styles.recentWins}>
                            <h3 className={styles.sectionTitle}>Recent Wins</h3>
                            {winsLoading ? (
                                <div className={styles.winsLoading}><div className="spinner"></div></div>
                            ) : wins.length === 0 ? (
                                <p className={styles.emptyWins}>No recent wins yet - be the first!</p>
                            ) : (
                                <ul className={styles.winsList}>
                                    {wins.map((win, index) => (
                                        <li key={`${win.username}-${win.created_at}-${index}`} className={styles.winRow}>
                                            <span className={styles.winAvatar} aria-hidden="true">
                                                {win.username.charAt(0).toUpperCase()}
                                            </span>
                                            <span className={styles.winName}>{win.username}</span>
                                            <span className={styles.winMultiplier}>{Number(win.multiplier).toFixed(2)}x</span>
                                            <span className={styles.winTime}>{formatRelativeTime(win.created_at)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                )}
            </main>
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

function HeartIcon({ filled }: { filled: boolean }) {
    return (
        <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
    );
}
