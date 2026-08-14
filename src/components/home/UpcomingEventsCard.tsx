'use client';

import Link from 'next/link';
import { Event as RollinEvent } from '@/types';
import styles from './UpcomingEventsCard.module.css';

interface UpcomingEventsCardProps {
    events: RollinEvent[] | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}

export function UpcomingEventsCard({ events, loading, error, onRetry }: UpcomingEventsCardProps) {
    return (
        <div className={styles.widget}>
            <div className={styles.widgetHeader}>
                <h3>Upcoming Events</h3>
                <Link href="/events" className={styles.headerLink}>View All</Link>
            </div>
            {loading && !events ? (
                <div className={styles.emptyState}>Loading events...</div>
            ) : error && !events ? (
                <div className={styles.emptyState}>
                    Unable to load events.
                    <button type="button" className={styles.retryBtn} onClick={onRetry}>Retry</button>
                </div>
            ) : !events || events.length === 0 ? (
                <div className={styles.emptyState}>No upcoming events yet.</div>
            ) : (
                <div className={styles.eventList}>
                    {events.map((event) => {
                        const date = new Date(event.start_date);
                        const month = date.toLocaleDateString('en', { month: 'short' });
                        const day = date.toLocaleDateString('en', { day: '2-digit' });
                        return (
                            <div key={event.id} className={styles.eventItem}>
                                <div className={styles.eventDateBox}>
                                    <span className={styles.eventMonth}>{month}</span>
                                    <span className={styles.eventDay}>{day}</span>
                                </div>
                                <div className={styles.eventInfo}>
                                    <h4>{event.title}</h4>
                                    <Link href={`/events/${event.id}`} className={styles.joinLink}>View Event</Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
