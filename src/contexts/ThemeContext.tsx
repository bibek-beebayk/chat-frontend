'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';
export type VisualStyle = 'card' | 'flat';

type AccentOption = {
    id: string;
    label: string;
    value: string;
};

type ThemeContextValue = {
    themeMode: ThemeMode;
    resolvedTheme: 'dark' | 'light';
    accentColor: string;
    visualStyle: VisualStyle;
    accentOptions: AccentOption[];
    setThemeMode: (mode: ThemeMode) => void;
    setAccentColor: (color: string) => void;
    setVisualStyle: (style: VisualStyle) => void;
};

const STORAGE_KEYS = {
    themeMode: 'rollin_theme_mode',
    accentColor: 'rollin_accent_color',
    visualStyle: 'rollin_visual_style',
};

const ACCENT_OPTIONS: AccentOption[] = [
    { id: 'violet', label: 'Violet', value: '#8b5cf6' },
    { id: 'emerald', label: 'Emerald', value: '#10b981' },
    { id: 'sky', label: 'Sky', value: '#0ea5e9' },
    { id: 'amber', label: 'Amber', value: '#f59e0b' },
    { id: 'rose', label: 'Rose', value: '#f43f5e' },
    { id: 'indigo', label: 'Indigo', value: '#6366f1' },
];

const DEFAULT_THEME_MODE: ThemeMode = 'dark';
const DEFAULT_ACCENT = ACCENT_OPTIONS[0].value;
const DEFAULT_VISUAL_STYLE: VisualStyle = 'card';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const normalized = hex.replace('#', '').trim();
    const full = normalized.length === 3
        ? normalized.split('').map((c) => c + c).join('')
        : normalized;
    const int = Number.parseInt(full, 16);
    return {
        r: (int >> 16) & 255,
        g: (int >> 8) & 255,
        b: int & 255,
    };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    let h = 0;
    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    if (delta !== 0) {
        if (max === rn) h = ((gn - bn) / delta) % 6;
        else if (max === gn) h = (bn - rn) / delta + 2;
        else h = (rn - gn) / delta + 4;
    }

    h = Math.round((h * 60 + 360) % 360);
    return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslString(h: number, s: number, l: number): string {
    const hh = Math.max(0, Math.min(360, Math.round(h)));
    const ss = Math.max(0, Math.min(100, Math.round(s)));
    const ll = Math.max(0, Math.min(100, Math.round(l)));
    return `hsl(${hh}, ${ss}%, ${ll}%)`;
}

function buildPaletteFromAccent(hex: string): {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    rgb: string;
} {
    const { r, g, b } = hexToRgb(hex);
    const { h, s, l } = rgbToHsl(r, g, b);
    const sat = Math.max(45, Math.min(80, s));
    const primary = hslString(h, sat, l);
    const primaryDark = hslString(h, sat, Math.max(25, l - 10));
    const primaryLight = hslString(h, sat, Math.min(72, l + 10));
    const secondary = hslString((h + 34) % 360, Math.max(45, sat - 6), Math.min(70, l + 4));
    return {
        primary,
        primaryDark,
        primaryLight,
        secondary,
        rgb: `${r} ${g} ${b}`,
    };
}

function getStoredThemeMode(): ThemeMode {
    if (typeof window === 'undefined') return DEFAULT_THEME_MODE;
    const raw = localStorage.getItem(STORAGE_KEYS.themeMode);
    if (raw === 'dark' || raw === 'light' || raw === 'system') return raw;
    return DEFAULT_THEME_MODE;
}

function getStoredVisualStyle(): VisualStyle {
    if (typeof window === 'undefined') return DEFAULT_VISUAL_STYLE;
    const raw = localStorage.getItem(STORAGE_KEYS.visualStyle);
    if (raw === 'card' || raw === 'flat') return raw;
    return DEFAULT_VISUAL_STYLE;
}

function getStoredAccent(): string {
    if (typeof window === 'undefined') return DEFAULT_ACCENT;
    const raw = localStorage.getItem(STORAGE_KEYS.accentColor);
    const normalized = raw?.trim().toLowerCase();
    if (!normalized) return DEFAULT_ACCENT;
    // Backward compatibility for previously stored invalid violet token.
    if (normalized === 'var(--color-primary)') return '#8b5cf6';
    const exists = ACCENT_OPTIONS.some((option) => option.value.toLowerCase() === normalized);
    return exists ? normalized : DEFAULT_ACCENT;
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
    if (mode === 'dark' || mode === 'light') return mode;
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [themeMode, setThemeModeState] = useState<ThemeMode>(DEFAULT_THEME_MODE);
    const [accentColor, setAccentColorState] = useState<string>(DEFAULT_ACCENT);
    const [visualStyle, setVisualStyleState] = useState<VisualStyle>(DEFAULT_VISUAL_STYLE);
    const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');

    useEffect(() => {
        setThemeModeState(getStoredThemeMode());
        setAccentColorState(getStoredAccent());
        setVisualStyleState(getStoredVisualStyle());
    }, []);

    useEffect(() => {
        const next = resolveTheme(themeMode);
        const palette = buildPaletteFromAccent(accentColor);
        setResolvedTheme(next);

        if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', next);
            document.documentElement.setAttribute('data-visual-style', visualStyle);
            document.documentElement.style.setProperty('--color-accent', accentColor);
            document.documentElement.style.setProperty('--color-accent-rgb', palette.rgb);
            document.documentElement.style.setProperty('--color-primary', palette.primary);
            document.documentElement.style.setProperty('--color-primary-dark', palette.primaryDark);
            document.documentElement.style.setProperty('--color-primary-light', palette.primaryLight);
            document.documentElement.style.setProperty('--color-secondary', palette.secondary);
            document.documentElement.style.setProperty('--color-primary-rgb', palette.rgb);
        }

        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.themeMode, themeMode);
        }
    }, [themeMode, accentColor, visualStyle]);

    useEffect(() => {
        if (themeMode !== 'system' || typeof window === 'undefined') return;
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => setResolvedTheme(media.matches ? 'dark' : 'light');
        media.addEventListener('change', handleChange);
        return () => media.removeEventListener('change', handleChange);
    }, [themeMode]);

    const setThemeMode = (mode: ThemeMode) => {
        setThemeModeState(mode);
    };

    const setAccentColor = (color: string) => {
        setAccentColorState(color);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.accentColor, color);
        }
    };

    const setVisualStyle = (style: VisualStyle) => {
        setVisualStyleState(style);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.visualStyle, style);
        }
    };

    const value = useMemo<ThemeContextValue>(
        () => ({
            themeMode,
            resolvedTheme,
            accentColor,
            visualStyle,
            accentOptions: ACCENT_OPTIONS,
            setThemeMode,
            setAccentColor,
            setVisualStyle,
        }),
        [themeMode, resolvedTheme, accentColor, visualStyle]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used inside ThemeProvider');
    }
    return context;
}

