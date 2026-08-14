import styles from './Skeleton.module.css';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    borderRadius?: string;
    className?: string;
}

/**
 * Generic placeholder-block primitive - sized via props to match each
 * card's real content dimensions, so loading states don't cause layout
 * shift when real data arrives. The codebase otherwise only has a plain
 * spinner convention; this is additive (uses the same design tokens), not
 * a competing pattern - reach for the spinner for small/incidental loads,
 * this for dashboard-card-shaped content.
 */
export function Skeleton({ width = '100%', height = '1rem', borderRadius, className = '' }: SkeletonProps) {
    return (
        <span
            className={`${styles.skeleton} ${className}`}
            style={{ width, height, borderRadius }}
            aria-hidden="true"
        />
    );
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
    return (
        <span className={`${styles.textGroup} ${className}`} aria-hidden="true">
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} height="0.9rem" width={i === lines - 1 && lines > 1 ? '70%' : '100%'} />
            ))}
        </span>
    );
}
