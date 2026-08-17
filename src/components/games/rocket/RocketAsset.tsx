'use client';

import styles from './RocketAsset.module.css';

interface RocketAssetProps {
    className?: string;
    /** Drives flame length/brightness - purely visual, never used for game logic. */
    intensity?: number;
}

/**
 * Self-contained rocket sprite - gold/metallic body, purple fin accents,
 * glowing porthole, animated exhaust flame. Deliberately isolated from any
 * game/round state (only a cosmetic `intensity` prop) so it can be swapped
 * for a different skin later without touching RocketDisplay's animation
 * logic - the parent controls position/rotation/vibration via CSS on the
 * wrapping element, this component only ever draws the rocket itself.
 */
export function RocketAsset({ className, intensity = 0 }: RocketAssetProps) {
    const flameScale = 0.85 + Math.min(1, Math.max(0, intensity)) * 0.9;

    return (
        <svg
            className={`${styles.svg} ${className || ''}`}
            width="64"
            height="88"
            viewBox="0 0 64 88"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="rocketBodyGold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fff2c9" />
                    <stop offset="45%" stopColor="#f5c542" />
                    <stop offset="100%" stopColor="#b8860b" />
                </linearGradient>
                <linearGradient id="rocketFinPurple" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b3fe8" />
                    <stop offset="100%" stopColor="#5b21b6" />
                </linearGradient>
                <radialGradient id="rocketWindow" cx="0.35" cy="0.35" r="0.7">
                    <stop offset="0%" stopColor="#eaf6ff" />
                    <stop offset="60%" stopColor="#7dd3fc" />
                    <stop offset="100%" stopColor="#0c4a6e" />
                </radialGradient>
                <linearGradient id="rocketFlame" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff7d6" />
                    <stop offset="35%" stopColor="#f5c542" />
                    <stop offset="75%" stopColor="#c026d3" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Exhaust flame - scaled/animated via CSS, kept behind the body. */}
            <g className={styles.flame} style={{ transform: `scaleY(${flameScale})`, transformOrigin: '32px 58px' }}>
                <path d="M32 58 C 26 68, 24 78, 32 88 C 40 78, 38 68, 32 58 Z" fill="url(#rocketFlame)" />
            </g>

            {/* Fins */}
            <path d="M16 46 L4 62 L18 58 Z" fill="url(#rocketFinPurple)" />
            <path d="M48 46 L60 62 L46 58 Z" fill="url(#rocketFinPurple)" />

            {/* Body */}
            <path
                d="M32 2 C 46 14, 48 34, 46 52 L18 52 C 16 34, 18 14, 32 2 Z"
                fill="url(#rocketBodyGold)"
                stroke="rgba(88, 28, 135, 0.4)"
                strokeWidth="1"
            />

            {/* Window */}
            <circle cx="32" cy="26" r="8" fill="url(#rocketWindow)" stroke="#fff7d6" strokeWidth="1.5" />

            {/* Base ring */}
            <rect x="18" y="50" width="28" height="6" rx="2" fill="#5b21b6" />
        </svg>
    );
}
