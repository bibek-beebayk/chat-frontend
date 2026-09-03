import styles from './HeroPanel.module.css';

interface HeroPanelProps {
    /**
     * 'panel' (default) - the full decorative branding block, still used in
     * the tablet grid. 'mark' - a slim inline crown + wordmark used in the
     * desktop "Welcome back" row (see PlayerHomePage).
     */
    variant?: 'panel' | 'mark';
}

/**
 * Presentational-only branding - no fetch, no game logic. Omitted entirely
 * on narrow mobile (see PlayerHomePage.module.css).
 */
export function HeroPanel({ variant = 'panel' }: HeroPanelProps) {
    if (variant === 'mark') {
        return (
            <div className={styles.mark} aria-hidden="true">
                <span className={styles.markCrown}>👑</span>
                <span className={styles.markWordmark}>
                    <span className={styles.rollin}>ROLLIN</span>
                    <span className={styles.markCommunity}>COMMUNITY</span>
                </span>
            </div>
        );
    }

    return (
        <div className={styles.panel} aria-hidden="true">
            <div className={styles.glow} />
            <span className={styles.crown}>👑</span>
            <div className={styles.wordmark}>
                <span className={styles.rollin}>ROLLIN</span>
                <span className={styles.community}>COMMUNITY</span>
            </div>
            <div className={styles.suits}>
                <span>♠</span><span>♥</span><span>♦</span><span>♣</span>
            </div>
        </div>
    );
}
