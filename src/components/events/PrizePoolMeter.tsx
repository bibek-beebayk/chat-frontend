import React from 'react';
import styles from './PrizePoolMeter.module.css';

interface PrizePoolMeterProps {
    basePool: number;
    currentPool: number;
    maxPool?: number; // Optional, defaults to base * 2 if not provided or 0
    participants: number;
}

export const PrizePoolMeter: React.FC<PrizePoolMeterProps> = ({ basePool, currentPool, maxPool, participants }) => {
    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Gauge Logic
    // Min Value (Left, -90deg): Base Pool
    // Max Value (Right, 90deg): Max Pool (or fallback)

    const minValue = basePool;
    // Ensure maxValue is at least slightly larger than minValue to avoid division by zero
    const effectiveMax = maxPool && maxPool > basePool ? maxPool : Math.max(basePool * 2, currentPool * 1.2);
    const maxValue = Math.max(effectiveMax, minValue + 1);

    // Normalize current value between min and max
    // Ratio 0 = min, Ratio 1 = max
    const ratio = Math.min(Math.max((currentPool - minValue) / (maxValue - minValue), 0), 1);

    // Angle: -90deg to 90deg
    const angle = (ratio * 180) - 90;

    return (
        <div className={styles.meterContainer}>
            <div className={styles.meterTitle}>Community Reward Pool</div>

            <div className={styles.gaugeWrapper}>
                <div className={styles.gaugeArc}></div>

                {/* Needle Container/Anchor at bottom center */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '50%',
                        width: '0',
                        height: '0',
                        transform: `rotate(${angle}deg)`,
                        transition: 'transform 1s cubic-bezier(0.1, 1.3, 0.5, 1)',
                        zIndex: 10
                    }}
                >
                    <div className={styles.needle} style={{ position: 'absolute', bottom: 0, left: '-2px', transform: 'none' }}></div>
                </div>

                <div className={styles.needleCap}></div>

                {/* Labels for Min and Max */}
                <div className={styles.labelMin}>
                    {formatCurrency(minValue)}
                </div>
                <div className={styles.labelMax}>
                    {formatCurrency(maxValue)}
                </div>
            </div>

            <div className={styles.amount}>
                {formatCurrency(currentPool)}
            </div>

            <div className={styles.participantsBar}>
                <div
                    className={styles.participantsFill}
                    style={{ width: `${Math.min(participants, 100)}%` }}
                >
                </div>
            </div>

            <div className={styles.participantsInfo}>
                <span>Registered Players: <span className={styles.participantsCount}>{participants}</span></span>
            </div>

            <div className={styles.footerText}>
                Prize pool increases with every new registration!
            </div>
        </div>
    );
};
