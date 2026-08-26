import { RankSlug } from '@/types';
import styles from './RankBadge.module.css';

interface RankBadgeProps {
    rank: RankSlug;
    size?: 'sm' | 'md' | 'lg';
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

/**
 * Styled placeholder badge, not image artwork - swappable for real rank art
 * later without touching any call site (this component takes a rank slug,
 * never a filename/page-specific conditional).
 */
export function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
    return (
        <span
            className={`${styles.badge} ${styles[rank]} ${styles[size]}`}
            role="img"
            aria-label={`${RANK_LABELS[rank]} rank`}
        >
            <ShieldIcon />
        </span>
    );
}

function ShieldIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l8 3.5v6c0 5-3.4 8.7-8 10.5-4.6-1.8-8-5.5-8-10.5v-6z" />
            <path d="M9 12l2 2 4-4" />
        </svg>
    );
}
