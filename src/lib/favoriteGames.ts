'use client';

// Real per-device favoriting (localStorage-backed) - there's no backend
// favorites concept, and adding one just for a heart-toggle icon isn't
// worth a migration. This is genuinely functional (persists, drives the
// games list "Favorites" filter), just not synced across devices - a
// reasonable, honest scope for this feature rather than a fake toggle that
// resets on reload.
const STORAGE_KEY = 'favorite_game_slugs';
const EVENT_NAME = 'favoriteGames:updated';

function readFavorites(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeFavorites(slugs: string[]) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
        window.dispatchEvent(new Event(EVENT_NAME));
    } catch {
        // ignore write failures (private browsing, storage disabled, etc.)
    }
}

export function getFavoriteGameSlugs(): string[] {
    return readFavorites();
}

export function isGameFavorited(slug: string): boolean {
    return readFavorites().includes(slug);
}

export function toggleFavoriteGame(slug: string): boolean {
    const current = readFavorites();
    const isFavorited = current.includes(slug);
    const next = isFavorited ? current.filter((s) => s !== slug) : [...current, slug];
    writeFavorites(next);
    return !isFavorited;
}

export function onFavoriteGamesChanged(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(EVENT_NAME, callback);
    window.addEventListener('storage', callback);
    return () => {
        window.removeEventListener(EVENT_NAME, callback);
        window.removeEventListener('storage', callback);
    };
}
