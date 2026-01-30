import React from 'react';
import styles from './FeaturedEventCard.module.css';

interface Event {
    id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    poster: string | null;
    is_active: boolean;
}

interface FeaturedEventCardProps {
    event: Event;
}

export const FeaturedEventCard: React.FC<FeaturedEventCardProps> = ({ event }) => {
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
        <div className={styles.eventCard}>
            <div className={styles.posterWrapper}>
                {event.poster ? (
                    <img src={event.poster} alt={event.title} className={styles.poster} />
                ) : (
                    <div className={styles.posterPlaceholder} style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(45deg, #2a2a2a, #333)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.1)',
                        fontSize: '3rem'
                    }}>
                        EVENT
                    </div>
                )}
                <div className={styles.overlay}></div>
            </div>

            <div className={styles.content}>
                <div className={styles.dateBadge}>
                    📅 {formatDate(startDate)} - {formatDate(endDate)}
                </div>

                <h3 className={styles.title}>{event.title}</h3>

                <p className={styles.description}>
                    {event.description}
                </p>

                <div className={styles.actions}>
                    <button
                        className={styles.viewBtn}
                        onClick={() => window.open(`/events/${event.id}`, '_blank')}
                    >
                        View Event Details
                    </button>

                    {/* <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                        Limited Spots Available
                    </div> */}
                </div>
            </div>
        </div>
    );
};
