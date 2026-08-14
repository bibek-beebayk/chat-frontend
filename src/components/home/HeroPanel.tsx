import styles from './HeroPanel.module.css';

/**
 * Presentational-only branding panel - no fetch, no game logic. De-emphasized
 * entirely on narrow mobile (see PlayerHomePage.module.css) per the design
 * brief's "functionality over decoration" rule for small screens.
 */
export function HeroPanel() {
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
