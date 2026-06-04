'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './RouteLoadingBar.module.css';

const MIN_VISIBLE_MS = 420;
const MAX_VISIBLE_MS = 10000;

export function RouteLoadingBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [active, setActive] = useState(false);
    const [topOffset, setTopOffset] = useState(0);
    const startedAtRef = useRef<number>(0);
    const timeoutRef = useRef<number | null>(null);

    const currentPath = useMemo(() => {
        const query = searchParams?.toString();
        return `${pathname || ''}${query ? `?${query}` : ''}`;
    }, [pathname, searchParams]);

    const clearPendingTimeout = () => {
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const start = () => {
        if (active) return;
        clearPendingTimeout();
        startedAtRef.current = Date.now();
        setActive(true);
        timeoutRef.current = window.setTimeout(() => {
            setActive(false);
            timeoutRef.current = null;
        }, MAX_VISIBLE_MS);
    };

    const stop = () => {
        clearPendingTimeout();
        const elapsed = Date.now() - startedAtRef.current;
        const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
        timeoutRef.current = window.setTimeout(() => {
            setActive(false);
            timeoutRef.current = null;
        }, wait);
    };

    useEffect(() => {
        if (active) {
            stop();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPath]);

    useEffect(() => {
        const handleNavigateIntent = (event: MouseEvent | PointerEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const anchor = target.closest('a') as HTMLAnchorElement | null;
            if (!anchor) return;
            if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('#')) return;

            let nextUrl: URL;
            try {
                nextUrl = new URL(anchor.href, window.location.origin);
            } catch {
                return;
            }

            if (nextUrl.origin !== window.location.origin) return;
            const nextPath = `${nextUrl.pathname}${nextUrl.search}`;
            if (nextPath === currentPath) return;

            start();
        };

        document.addEventListener('pointerdown', handleNavigateIntent, true);
        document.addEventListener('click', handleNavigateIntent, true);
        return () => {
            document.removeEventListener('pointerdown', handleNavigateIntent, true);
            document.removeEventListener('click', handleNavigateIntent, true);
            clearPendingTimeout();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPath]);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const headerEl = document.querySelector('[data-app-header="true"]') as HTMLElement | null;
        if (!headerEl) {
            setTopOffset(0);
            return;
        }

        const syncOffset = () => {
            const rect = headerEl.getBoundingClientRect();
            const next = Math.max(0, Math.round(rect.bottom - 2));
            setTopOffset(next);
        };

        syncOffset();

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(syncOffset);
            resizeObserver.observe(headerEl);
        }

        window.addEventListener('resize', syncOffset);
        return () => {
            window.removeEventListener('resize', syncOffset);
            resizeObserver?.disconnect();
        };
    }, [pathname]);

    if (!active) return null;

    return (
        <div className={styles.barWrap} style={{ top: `${topOffset}px` }} aria-hidden="true">
            <div className={styles.bar} />
        </div>
    );
}
