'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { gamesApi } from '@/lib/games';
import { getFavoriteGameSlugs, onFavoriteGamesChanged } from '@/lib/favoriteGames';
import { plinkoApi } from '@/lib/plinko';
import { rocketApi } from '@/lib/rocket';
import { slotsApi } from '@/lib/slots';
import { Game, PlinkoRound, RocketHistoryItem, SlotRound } from '@/types';
import styles from './page.module.css';

const GAME_ROUTES: Record<string, string> = {
    plinko: '/games/plinko',
    slots: '/games/slots',
    rocket: '/games/rocket',
};

// Purely decorative categorization for the mobile "All Games" filter pills -
// there's no backend tagging concept, so this is a small client-side map
// rather than fabricated data on the Game model itself.
const GAME_TAGS: Record<string, 'Popular' | 'New'> = {
    plinko: 'Popular',
    slots: 'Popular',
    rocket: 'New',
};

const GAME_ICONS: Record<string, string> = {
    plinko: '🔴',
    slots: '🎰',
    rocket: '🚀',
};

const PLINKO_MODE_LABEL: Record<string, string> = {
    classic: 'Plinko',
    free_drop: 'Plinko: Free Drop',
};

type FilterKey = 'all' | 'popular' | 'new' | 'favorites';

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'popular', label: 'Popular' },
    { key: 'new', label: 'New' },
    { key: 'favorites', label: 'Favorites' },
];

interface ContinueEntry {
    key: string;
    label: string;
    slug: string;
    href: string;
    createdAt: string;
}

// Mirrors ContinuePlayingCard.tsx's buildEntries (homepage widget), extended
// to also include Rocket now that it's a real playable game - kept local
// since this page's "Continue Playing" carousel has its own distinct visual
// design (not a reuse of that card).
function buildContinueEntries(plinkoRounds: PlinkoRound[], slotsRounds: SlotRound[], rocketRounds: RocketHistoryItem[]): ContinueEntry[] {
    const entries: ContinueEntry[] = [];

    const byMode = new Map<string, PlinkoRound>();
    for (const round of plinkoRounds) {
        const existing = byMode.get(round.mode);
        if (!existing || new Date(round.created_at) > new Date(existing.created_at)) {
            byMode.set(round.mode, round);
        }
    }
    for (const round of byMode.values()) {
        entries.push({
            key: `plinko-${round.mode}`,
            label: PLINKO_MODE_LABEL[round.mode] || round.mode,
            slug: 'plinko',
            href: GAME_ROUTES.plinko,
            createdAt: round.created_at,
        });
    }

    if (slotsRounds.length > 0) {
        const latest = slotsRounds.reduce((a, b) => (new Date(b.created_at) > new Date(a.created_at) ? b : a));
        entries.push({ key: 'slots', label: 'Rollin 3x3', slug: 'slots', href: GAME_ROUTES.slots, createdAt: latest.created_at });
    }

    if (rocketRounds.length > 0) {
        const latest = rocketRounds.reduce((a, b) => (new Date(b.created_at) > new Date(a.created_at) ? b : a));
        entries.push({ key: 'rocket', label: 'Rollin Rocket', slug: 'rocket', href: GAME_ROUTES.rocket, createdAt: latest.created_at });
    }

    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

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

export default function GamesPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [continueEntries, setContinueEntries] = useState<ContinueEntry[]>([]);
    const [continueLoading, setContinueLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>('all');
    const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);

    useEffect(() => {
        setFavoriteSlugs(getFavoriteGameSlugs());
        return onFavoriteGamesChanged(() => setFavoriteSlugs(getFavoriteGameSlugs()));
    }, []);

    useEffect(() => {
        gamesApi.list()
            .then(setGames)
            .catch(() => setGames([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        Promise.allSettled([plinkoApi.getHistory(), slotsApi.getHistory(), rocketApi.getHistory()])
            .then(([plinkoRes, slotsRes, rocketRes]) => {
                const plinkoRounds = plinkoRes.status === 'fulfilled' ? plinkoRes.value : [];
                const slotsRounds = slotsRes.status === 'fulfilled' ? slotsRes.value : [];
                const rocketRounds = rocketRes.status === 'fulfilled' ? rocketRes.value : [];
                setContinueEntries(buildContinueEntries(plinkoRounds, slotsRounds, rocketRounds));
            })
            .finally(() => setContinueLoading(false));
    }, []);

    const filteredGames = games.filter((game) => {
        if (filter === 'all') return true;
        if (filter === 'favorites') return favoriteSlugs.includes(game.slug);
        return GAME_TAGS[game.slug] === (filter === 'popular' ? 'Popular' : 'New');
    });

    const gamesBySlug: Record<string, Game> = {};
    for (const game of games) gamesBySlug[game.slug] = game;

    return (
        <DashboardLayout>
            <PageShell title="Rollin Games" eyebrow="" description="Play Rollin Games and earn rewards!">
                {loading ? (
                    <div className={styles.loadingArea}><div className="spinner"></div></div>
                ) : games.length === 0 ? (
                    <div className={styles.emptyState}>No games are available right now. Check back soon.</div>
                ) : (
                    <>
                        <section className={styles.gameGrid}>
                            {games.map((game) => {
                                const route = GAME_ROUTES[game.slug];
                                return (
                                    <article key={game.id} className={styles.gameCard}>
                                        {game.thumbnail ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={game.thumbnail} alt={`${game.name} thumbnail`} className={styles.gameThumbnail} />
                                        ) : (
                                            <div className={styles.gameIcon} aria-hidden="true">
                                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect><path d="M12 12h.01M16 12h.01M8 12h.01"></path></svg>
                                            </div>
                                        )}
                                        <h3>{game.name}</h3>
                                        {game.description && <p>{game.description}</p>}
                                        {route ? (
                                            <Link href={`/games/${game.slug}/details`} className={styles.playButton}>View Game</Link>
                                        ) : (
                                            <span className={styles.comingSoon}>Coming Soon</span>
                                        )}
                                    </article>
                                );
                            })}
                        </section>

                        <div className={styles.mobileView}>
                            <section className={styles.continueSection}>
                                <div className={styles.sectionHeader}>
                                    <h2>Continue Playing</h2>
                                </div>
                                {continueLoading ? (
                                    <div className={styles.continueEmpty}>Loading...</div>
                                ) : continueEntries.length === 0 ? (
                                    <div className={styles.continueEmpty}>Start playing to see your recent games here.</div>
                                ) : (
                                    <div className={styles.continueTrack}>
                                        {continueEntries.map((entry) => {
                                            const thumbnail = gamesBySlug[entry.slug]?.thumbnail;
                                            return (
                                                <div key={entry.key} className={styles.continueCard}>
                                                    <div
                                                        className={styles.continueThumb}
                                                        style={thumbnail ? { backgroundImage: `url(${thumbnail})` } : undefined}
                                                    >
                                                        {!thumbnail && (
                                                            <span className={styles.continueThumbIcon} aria-hidden="true">{GAME_ICONS[entry.slug] || '🎮'}</span>
                                                        )}
                                                        <div className={styles.continueThumbScrim} aria-hidden="true" />
                                                        <span className={styles.continueGameName}>{entry.label}</span>
                                                    </div>
                                                    <div className={styles.continueMeta}>
                                                        <span className={styles.continueLastPlayed}>Last played</span>
                                                        <span className={styles.continueTime}>{formatRelativeTime(entry.createdAt)}</span>
                                                    </div>
                                                    <Link href={entry.href} className={styles.continuePlayBtn}>PLAY</Link>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            <section className={styles.allGamesSection}>
                                <h2>All Games</h2>
                                <div className={styles.filterRow}>
                                    {FILTERS.map((f) => (
                                        <button
                                            key={f.key}
                                            type="button"
                                            className={`${styles.filterPill} ${filter === f.key ? styles.filterPillActive : ''}`}
                                            onClick={() => setFilter(f.key)}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                                <div className={styles.gameList}>
                                    {filteredGames.length === 0 ? (
                                        <div className={styles.gameListEmpty}>
                                            {filter === 'favorites' ? 'No favorites yet.' : 'No games match this filter.'}
                                        </div>
                                    ) : filteredGames.map((game) => {
                                        const route = GAME_ROUTES[game.slug];
                                        const tag = GAME_TAGS[game.slug];
                                        return (
                                            <div key={game.id} className={styles.gameRow}>
                                                <div className={styles.gameRowIcon} aria-hidden="true">
                                                    {game.thumbnail ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={game.thumbnail} alt="" className={styles.gameRowThumbImg} />
                                                    ) : (
                                                        GAME_ICONS[game.slug] || '🎮'
                                                    )}
                                                </div>
                                                <div className={styles.gameRowInfo}>
                                                    <span className={styles.gameRowName}>{game.name}</span>
                                                    {tag && <span className={styles.gameRowTag}>{tag}</span>}
                                                </div>
                                                {route ? (
                                                    <Link href={`/games/${game.slug}/details`} className={styles.gameRowPlay}>VIEW</Link>
                                                ) : (
                                                    <span className={styles.comingSoon}>Soon</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </>
                )}
            </PageShell>
        </DashboardLayout>
    );
}
