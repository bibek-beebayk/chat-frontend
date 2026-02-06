'use client';

import { useEffect } from 'react';
import { shouldEnableServiceWorker } from '@/utils/browser';

/**
 * Component that conditionally registers the service worker
 * Only registers in regular browsers, skips in-app browsers (FB, Instagram, etc.)
 */
export function PWAManager() {
    useEffect(() => {
        // Only run in browser
        if (typeof window === 'undefined') return;

        const registerServiceWorker = async () => {
            // Check if we should enable service worker
            if (!shouldEnableServiceWorker()) {
                console.log('[PWA] Service worker disabled (in-app browser detected or not supported)');
                return;
            }

            try {
                // Wait for page to load
                if (document.readyState === 'loading') {
                    await new Promise(resolve => {
                        window.addEventListener('load', resolve, { once: true });
                    });
                }

                // Register the service worker
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                });

                console.log('[PWA] Service worker registered successfully:', registration);

                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000); // Check every hour

            } catch (error) {
                console.error('[PWA] Service worker registration failed:', error);
            }
        };

        registerServiceWorker();
    }, []);

    // This component doesn't render anything
    return null;
}
