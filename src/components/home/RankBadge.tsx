import { useId } from 'react';
import { RankSlug } from '@/types';
import styles from './RankBadge.module.css';

interface RankBadgeProps {
    rank: RankSlug;
    size?: 'sm' | 'md' | 'lg';
    /**
     * Backend-uploaded badge artwork (xp.Tier.badge). When set it's rendered
     * instead of the built-in SVG, which stays as the fallback for tiers with
     * no art uploaded yet.
     */
    badgeUrl?: string | null;
}

const RANK_LABELS: Record<RankSlug, string> = {
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    platinum: 'Platinum',
    diamond: 'Diamond',
    rollin_elite: 'Rollin Elite',
    rollin_legend: 'Rollin Legend',
};

type Emblem = 'check' | 'star' | 'gem' | 'crown';

interface Palette {
    light: string;
    mid: string;
    dark: string;
    rim: string;
    laurel: string;
    laurelDark: string;
    emblem: string;
    glow: string;
    emblemShape: Emblem;
    crown?: 'small' | 'large';
}

const PALETTES: Record<RankSlug, Palette> = {
    bronze: {
        light: '#F3B87E', mid: '#C87E3F', dark: '#5F3115', rim: '#EBA871',
        laurel: '#E8B665', laurelDark: '#A9762E', emblem: '#5A2E10',
        glow: '', emblemShape: 'check',
    },
    silver: {
        light: '#FDFEFF', mid: '#C4CCD6', dark: '#7C868F', rim: '#E7ECF1',
        laurel: '#D8DEE5', laurelDark: '#98A1AC', emblem: '#48525C',
        glow: '', emblemShape: 'check',
    },
    gold: {
        light: '#FFEBA8', mid: '#F3C24C', dark: '#9E6E17', rim: '#FFDF86',
        laurel: '#F2C75B', laurelDark: '#B0842D', emblem: '#6A4909',
        glow: 'rgba(243,194,76,0.45)', emblemShape: 'star',
    },
    platinum: {
        light: '#ECFBFF', mid: '#ACDBE7', dark: '#57889A', rim: '#D2F0F7',
        laurel: '#CBD9DE', laurelDark: '#8CA3AB', emblem: '#22505F',
        glow: 'rgba(130,205,224,0.4)', emblemShape: 'star',
    },
    diamond: {
        light: '#E1F5FF', mid: '#7FCAF1', dark: '#2A79BC', rim: '#B7E7FF',
        laurel: '#AEE0F5', laurelDark: '#5BA6CE', emblem: '#0C3C61',
        glow: 'rgba(78,178,240,0.6)', emblemShape: 'gem',
    },
    rollin_elite: {
        light: '#DABFFF', mid: '#9A5CE0', dark: '#391585', rim: '#EAB765',
        laurel: '#EFC163', laurelDark: '#B0842F', emblem: '#F4E9FF',
        glow: 'rgba(154,92,224,0.55)', emblemShape: 'check', crown: 'small',
    },
    rollin_legend: {
        light: '#CFAAFF', mid: '#7C3FD6', dark: '#290A5E', rim: '#F6D26C',
        laurel: '#F1C961', laurelDark: '#B78F32', emblem: '#FFE9A8',
        glow: 'rgba(246,210,108,0.6)', emblemShape: 'crown', crown: 'large',
    },
};

const SHIELD_PATH =
    'M36 15 C36 15 45.5 18.3 51.2 20.2 C52.2 20.5 52.8 21.2 52.8 22.2 L52.8 35 C52.8 47.5 45.6 54.6 36 58.8 C26.4 54.6 19.2 47.5 19.2 35 L19.2 22.2 C19.2 21.2 19.8 20.5 20.8 20.2 C26.5 18.3 36 15 36 15 Z';

const LEAF_TRANSFORMS = [
    'translate(31 57) rotate(-32)',
    'translate(25.5 51.5) rotate(-46)',
    'translate(21 44.5) rotate(-62)',
    'translate(18.4 36.5) rotate(-80)',
    'translate(18 28.5) rotate(-98)',
    'translate(20 21.5) rotate(-116)',
];

/**
 * Rank badge artwork - a laurel-wreathed shield with a per-tier emblem (and a
 * crown for the two Rollin tiers), drawn as inline SVG so it scales crisply at
 * every call site and stays theme-independent. Takes only a rank slug + size,
 * never a page-specific conditional.
 */
export function RankBadge({ rank, size = 'md', badgeUrl }: RankBadgeProps) {
    const uid = useId().replace(/:/g, '');
    const p = PALETTES[rank];

    if (badgeUrl) {
        return (
            <span
                className={`${styles.badge} ${styles[size]} ${styles[rank]}`}
                role="img"
                aria-label={`${RANK_LABELS[rank]} rank`}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={badgeUrl} alt="" className={styles.badgeImg} />
            </span>
        );
    }
    const shieldGrad = `sg-${uid}`;
    const laurelGrad = `lg-${uid}`;
    const crownGrad = `cg-${uid}`;
    const glowGrad = `gg-${uid}`;
    const shieldClip = `sc-${uid}`;

    return (
        <span
            className={`${styles.badge} ${styles[size]} ${styles[rank]}`}
            role="img"
            aria-label={`${RANK_LABELS[rank]} rank`}
        >
            <svg viewBox="0 0 72 72" width="100%" height="100%" aria-hidden="true">
                <defs>
                    <linearGradient id={shieldGrad} x1="0" y1="0" x2="0.85" y2="1">
                        <stop offset="0" stopColor={p.light} />
                        <stop offset="0.5" stopColor={p.mid} />
                        <stop offset="1" stopColor={p.dark} />
                    </linearGradient>
                    <linearGradient id={laurelGrad} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor={p.laurel} />
                        <stop offset="1" stopColor={p.laurelDark} />
                    </linearGradient>
                    <linearGradient id={crownGrad} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#FFEFB0" />
                        <stop offset="0.55" stopColor="#F3C64F" />
                        <stop offset="1" stopColor="#B5801F" />
                    </linearGradient>
                    {p.glow && (
                        <radialGradient id={glowGrad} cx="0.5" cy="0.42" r="0.5">
                            <stop offset="0" stopColor={p.glow} />
                            <stop offset="1" stopColor="rgba(0,0,0,0)" />
                        </radialGradient>
                    )}
                    <clipPath id={shieldClip}>
                        <path d={SHIELD_PATH} />
                    </clipPath>
                </defs>

                {p.glow && <circle cx="36" cy="34" r="34" fill={`url(#${glowGrad})`} />}

                {/* Laurel wreath - one branch, mirrored */}
                <g fill={`url(#${laurelGrad})`} stroke={p.laurelDark} strokeWidth="0.5">
                    <g>
                        <path
                            d="M36 61 C27 60 21.5 52 19.5 42 C17.8 33.5 18.4 25 20 20"
                            fill="none"
                            stroke={`url(#${laurelGrad})`}
                            strokeWidth="2.4"
                            strokeLinecap="round"
                        />
                        {LEAF_TRANSFORMS.map((t, i) => (
                            <path key={i} transform={t} d="M0 0 C4 -1.6 4.6 -7.5 0 -12 C-4.6 -7.5 -4 -1.6 0 0 Z" />
                        ))}
                    </g>
                    <g transform="translate(72 0) scale(-1 1)">
                        <path
                            d="M36 61 C27 60 21.5 52 19.5 42 C17.8 33.5 18.4 25 20 20"
                            fill="none"
                            stroke={`url(#${laurelGrad})`}
                            strokeWidth="2.4"
                            strokeLinecap="round"
                        />
                        {LEAF_TRANSFORMS.map((t, i) => (
                            <path key={i} transform={t} d="M0 0 C4 -1.6 4.6 -7.5 0 -12 C-4.6 -7.5 -4 -1.6 0 0 Z" />
                        ))}
                    </g>
                </g>

                {/* Crown for the Rollin tiers */}
                {p.crown && (
                    <g transform={p.crown === 'large' ? 'translate(36 12) scale(1.08)' : 'translate(36 13.5) scale(0.82)'}>
                        <path
                            d="M-13 6 L-13 -4 L-6.5 1 L0 -9 L6.5 1 L13 -4 L13 6 Z"
                            fill={`url(#${crownGrad})`}
                            stroke="#8A5F16"
                            strokeWidth="0.8"
                            strokeLinejoin="round"
                        />
                        <circle cx="-13" cy="-5" r="1.7" fill={`url(#${crownGrad})`} stroke="#8A5F16" strokeWidth="0.6" />
                        <circle cx="0" cy="-10.5" r="1.9" fill={`url(#${crownGrad})`} stroke="#8A5F16" strokeWidth="0.6" />
                        <circle cx="13" cy="-5" r="1.7" fill={`url(#${crownGrad})`} stroke="#8A5F16" strokeWidth="0.6" />
                    </g>
                )}

                {/* Shield */}
                <path d={SHIELD_PATH} fill={`url(#${shieldGrad})`} stroke={p.rim} strokeWidth="2.2" strokeLinejoin="round" />
                <g clipPath={`url(#${shieldClip})`}>
                    <ellipse cx="30" cy="16" rx="26" ry="18" fill="#ffffff" opacity="0.22" />
                    <ellipse cx="46" cy="56" rx="20" ry="14" fill="#000000" opacity="0.16" />
                </g>
                <path
                    d={SHIELD_PATH}
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity="0.32"
                    strokeWidth="0.9"
                    transform="translate(3.6 3.7) scale(0.9)"
                />

                {/* Emblem */}
                <Emblem shape={p.emblemShape} color={p.emblem} />
            </svg>
        </span>
    );
}

function Emblem({ shape, color }: { shape: Emblem; color: string }) {
    if (shape === 'check') {
        return (
            <path
                d="M28 35 l5.5 5.5 L45 27"
                fill="none"
                stroke={color}
                strokeWidth="4.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        );
    }
    if (shape === 'star') {
        return (
            <path
                transform="translate(36 35)"
                d="M0 -11 L2.59 -3.4 L10.46 -3.4 L4.12 1.3 L6.47 8.9 L0 4.2 L-6.47 8.9 L-4.12 1.3 L-10.46 -3.4 L-2.59 -3.4 Z"
                fill={color}
            />
        );
    }
    if (shape === 'gem') {
        return (
            <g stroke={color} strokeWidth="1.4" strokeLinejoin="round" fill={color} fillOpacity="0.9">
                <path d="M36 23 L45 31 L36 49 L27 31 Z" />
                <path d="M27 31 L45 31 M36 23 L36 49 M31 27 L41 27" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" />
            </g>
        );
    }
    return (
        <g transform="translate(36 35)">
            <path d="M-12 6 L-12 -5 L-6 0 L0 -9 L6 0 L12 -5 L12 6 Z" fill={color} stroke="#00000022" strokeWidth="0.6" strokeLinejoin="round" />
            <circle cx="0" cy="-3" r="1.6" fill="#00000022" />
        </g>
    );
}
