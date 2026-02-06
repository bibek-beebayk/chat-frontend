/**
 * Utility functions for browser detection
 */

/**
 * Detects if the current browser is an in-app browser from social media apps
 * (Facebook, Instagram, TikTok, etc.)
 * 
 * These browsers often have limited support for PWA features like Service Workers,
 * which can cause compatibility issues.
 */
export function isInAppBrowser(): boolean {
    if (typeof window === 'undefined') return false;

    const ua = navigator.userAgent || navigator.vendor || '';

    // Check for common in-app browser identifiers
    return (
        ua.includes('FBAN') ||      // Facebook App
        ua.includes('FBAV') ||      // Facebook App (alternative)
        ua.includes('Instagram') || // Instagram
        ua.includes('TikTok') ||    // TikTok
        ua.includes('Line/') ||     // Line messenger
        ua.includes('Twitter') ||   // Twitter (now X)
        ua.includes('LinkedIn')     // LinkedIn
    );
}

/**
 * Check if Service Workers are supported and should be enabled
 */
export function shouldEnableServiceWorker(): boolean {
    if (typeof window === 'undefined') return false;

    // Service workers must be supported
    if (!('serviceWorker' in navigator)) return false;

    // Don't enable in in-app browsers
    if (isInAppBrowser()) return false;

    return true;
}
