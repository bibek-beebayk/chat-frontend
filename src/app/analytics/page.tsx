'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsApi } from '@/lib/analytics';
import { AnalyticsBucket, AnalyticsDashboard, AnalyticsEventType, AnalyticsTrendPoint, UserType } from '@/types';
import styles from './page.module.css';

const dayOptions = [
    { label: '7D', value: 7 },
    { label: '30D', value: 30 },
    { label: '90D', value: 90 },
    { label: '365D', value: 365 },
];

const roleOptions: Array<{ label: string; value: UserType | '' }> = [
    { label: 'All Users', value: '' },
    { label: 'Players', value: 'player' },
    { label: 'Agents', value: 'agent' },
    { label: 'Staff', value: 'staff' },
];

const eventOptions: Array<{ label: string; value: AnalyticsEventType | '' }> = [
    { label: 'All Events', value: '' },
    { label: 'Page Views', value: 'page_view' },
    { label: 'Registrations', value: 'register' },
    { label: 'Logins', value: 'login' },
    { label: 'Redemptions', value: 'redemption' },
];

export default function AnalyticsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [days, setDays] = useState(30);
    const [userType, setUserType] = useState<UserType | ''>('');
    const [eventType, setEventType] = useState<AnalyticsEventType | ''>('');
    const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await analyticsApi.getDashboard({ days, userType, eventType });
            setDashboard(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load analytics.');
        } finally {
            setLoading(false);
        }
    }, [days, eventType, userType]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (!authLoading && user?.user_type !== 'staff') {
            router.push('/');
            return;
        }
        if (user?.user_type === 'staff') {
            loadDashboard();
        }
    }, [authLoading, loadDashboard, router, user]);

    const maxTrendValue = useMemo(() => {
        if (!dashboard?.trends.length) return 1;
        return Math.max(...dashboard.trends.map((row) => Math.max(row.visits, row.logins, row.registrations)), 1);
    }, [dashboard?.trends]);

    if (authLoading || !user || user.user_type !== 'staff') {
        return (
            <DashboardLayout>
                <main className={styles.loadingArea}>
                    <div className="spinner"></div>
                </main>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <PageShell
                title="Analytics"
                eyebrow="Insights"
                description="Understand visits, registrations, logins, popular pages, traffic sources, and user behavior."
                width="wide"
            >
                <section className={styles.filters}>
                    <FilterGroup label="Range">
                        {dayOptions.map((option) => (
                            <FilterButton key={option.value} active={days === option.value} onClick={() => setDays(option.value)}>
                                {option.label}
                            </FilterButton>
                        ))}
                    </FilterGroup>
                    <FilterGroup label="User Type">
                        {roleOptions.map((option) => (
                            <FilterButton key={option.label} active={userType === option.value} onClick={() => setUserType(option.value)}>
                                {option.label}
                            </FilterButton>
                        ))}
                    </FilterGroup>
                    <FilterGroup label="Event">
                        {eventOptions.map((option) => (
                            <FilterButton key={option.label} active={eventType === option.value} onClick={() => setEventType(option.value)}>
                                {option.label}
                            </FilterButton>
                        ))}
                    </FilterGroup>
                </section>

                {error && (
                    <section className={styles.errorBox}>
                        <span>{error}</span>
                        <button type="button" onClick={loadDashboard}>Retry</button>
                    </section>
                )}

                {loading ? (
                    <section className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </section>
                ) : dashboard ? (
                    <>
                        <section className={styles.kpiGrid}>
                            <KpiCard label="Visits" value={dashboard.kpis.visits} sub={`${formatChange(dashboard.kpis.visit_change_percent)} vs previous`} />
                            <KpiCard label="Unique Visitors" value={dashboard.kpis.unique_visitors} />
                            <KpiCard label="Registrations" value={dashboard.kpis.registrations} sub={`${dashboard.kpis.registration_rate}% visitor conversion`} />
                            <KpiCard label="Logins" value={dashboard.kpis.logins} />
                        </section>

                        <section className={styles.chartPanel}>
                            <div className={styles.panelHeader}>
                                <div>
                                    <span>Trend</span>
                                    <h2>Visits, registrations, and logins</h2>
                                </div>
                                <button type="button" onClick={loadDashboard}>Refresh</button>
                            </div>
                            <div className={styles.trendChart} aria-label="Analytics trend chart">
                                {dashboard.trends.map((point) => (
                                    <TrendColumn key={point.date} point={point} max={maxTrendValue} />
                                ))}
                            </div>
                            <div className={styles.legend}>
                                <span><i className={styles.visitDot}></i>Visits</span>
                                <span><i className={styles.registerDot}></i>Registrations</span>
                                <span><i className={styles.loginDot}></i>Logins</span>
                            </div>
                        </section>

                        <section className={styles.gridPanels}>
                            <BucketPanel title="Top Pages" items={dashboard.top_pages} empty="No page views yet." />
                            <BucketPanel title="Traffic Sources" items={dashboard.traffic_sources} empty="No source data yet." />
                            <BucketPanel title="User Types" items={dashboard.user_types} empty="No role data yet." />
                            <BucketPanel title="Devices" items={dashboard.devices} empty="No device data yet." />
                            <BucketPanel title="Browsers" items={dashboard.browsers} empty="No browser data yet." />
                            <BucketPanel title="Locations" items={dashboard.locations} empty="No location headers yet." />
                        </section>

                        <section className={styles.eventsPanel}>
                            <div className={styles.panelHeader}>
                                <div>
                                    <span>Live Feed</span>
                                    <h2>Recent analytics events</h2>
                                </div>
                            </div>
                            <div className={styles.eventList}>
                                {dashboard.recent_events.length === 0 ? (
                                    <p className={styles.emptyText}>No events found for this filter.</p>
                                ) : dashboard.recent_events.map((event) => (
                                    <article key={event.id} className={styles.eventRow}>
                                        <div>
                                            <strong>{formatEventLabel(event.event_type, event.event_name)}</strong>
                                            <span>{event.path || event.source || 'No path'} {event.user ? `by ${event.user.username}` : ''}</span>
                                        </div>
                                        <time>{formatDateTime(event.created_at)}</time>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </>
                ) : null}
            </PageShell>
        </DashboardLayout>
    );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className={styles.filterGroup}>
            <span>{label}</span>
            <div className={styles.filterButtons}>{children}</div>
        </div>
    );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" className={`${styles.filterBtn} ${active ? styles.activeFilter : ''}`} onClick={onClick}>
            {children}
        </button>
    );
}

function KpiCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
    return (
        <div className={styles.kpiCard}>
            <span>{label}</span>
            <strong>{value.toLocaleString()}</strong>
            {sub && <small>{sub}</small>}
        </div>
    );
}

function TrendColumn({ point, max }: { point: AnalyticsTrendPoint; max: number }) {
    const visitHeight = Math.max((point.visits / max) * 100, point.visits ? 6 : 0);
    const registerHeight = Math.max((point.registrations / max) * 100, point.registrations ? 6 : 0);
    const loginHeight = Math.max((point.logins / max) * 100, point.logins ? 6 : 0);

    return (
        <div className={styles.trendColumn} title={`${point.date}: ${point.visits} visits, ${point.registrations} registrations, ${point.logins} logins`}>
            <span style={{ height: `${visitHeight}%` }} className={styles.visitBar}></span>
            <span style={{ height: `${registerHeight}%` }} className={styles.registerBar}></span>
            <span style={{ height: `${loginHeight}%` }} className={styles.loginBar}></span>
        </div>
    );
}

function BucketPanel({ title, items, empty }: { title: string; items: AnalyticsBucket[]; empty: string }) {
    const max = Math.max(...items.map((item) => item.count), 1);
    return (
        <section className={styles.bucketPanel}>
            <h2>{title}</h2>
            {items.length === 0 ? (
                <p className={styles.emptyText}>{empty}</p>
            ) : (
                <div className={styles.bucketList}>
                    {items.map((item) => (
                        <div key={item.label} className={styles.bucketRow}>
                            <div>
                                <span>{formatBucketLabel(item.label)}</span>
                                <strong>{item.count.toLocaleString()}</strong>
                            </div>
                            <i style={{ width: `${Math.max((item.count / max) * 100, 4)}%` }}></i>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function formatChange(value: number) {
    if (value === 0) return '0%';
    return `${value > 0 ? '+' : ''}${value}%`;
}

function formatBucketLabel(value: string) {
    if (!value) return 'Unknown';
    return value.replace(/_/g, ' ');
}

function formatEventLabel(type: string, name: string) {
    return `${formatBucketLabel(type)}${name ? ` / ${formatBucketLabel(name)}` : ''}`;
}

function formatDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}
