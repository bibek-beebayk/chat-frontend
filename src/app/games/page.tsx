'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { gamesApi } from '@/lib/games';
import { Game } from '@/types';
import styles from './page.module.css';

const GAME_ROUTES: Record<string, string> = {
    plinko: '/games/plinko',
    slots: '/games/slots',
};

export default function GamesPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        gamesApi.list()
            .then(setGames)
            .catch(() => setGames([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <DashboardLayout>
            <PageShell title="Games" eyebrow="Features" description="Play games and earn reward points.">
                {loading ? (
                    <div className={styles.loadingArea}><div className="spinner"></div></div>
                ) : games.length === 0 ? (
                    <div className={styles.emptyState}>No games are available right now. Check back soon.</div>
                ) : (
                    <section className={styles.gameGrid}>
                        {games.map((game) => {
                            const route = GAME_ROUTES[game.slug];
                            return (
                                <article key={game.id} className={styles.gameCard}>
                                    <div className={styles.gameIcon} aria-hidden="true">
                                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect><path d="M12 12h.01M16 12h.01M8 12h.01"></path></svg>
                                    </div>
                                    <h3>{game.name}</h3>
                                    {game.description && <p>{game.description}</p>}
                                    {route ? (
                                        <Link href={route} className={styles.playButton}>Play Now</Link>
                                    ) : (
                                        <span className={styles.comingSoon}>Coming Soon</span>
                                    )}
                                </article>
                            );
                        })}
                    </section>
                )}
            </PageShell>
        </DashboardLayout>
    );
}
