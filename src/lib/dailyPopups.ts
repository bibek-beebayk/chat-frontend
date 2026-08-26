'use client';

// Per-device "don't show this again today" throttle for the repeatable
// celebration nudges (daily login reward, streak progress) - these aren't
// one-time server facts like a rank-up, just a once-a-day reminder, so a
// localStorage date check is the right (and simplest) tool here.
function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

export function hasShownToday(key: string): boolean {
    if (typeof window === 'undefined') return true;
    try {
        return window.localStorage.getItem(`popup_shown_${key}`) === todayKey();
    } catch {
        return true;
    }
}

export function markShownToday(key: string): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(`popup_shown_${key}`, todayKey());
    } catch {
        // ignore write failures (private browsing, storage disabled, etc.)
    }
}
