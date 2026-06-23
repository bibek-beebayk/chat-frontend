'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { UserAvatar } from '@/components/social/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { StaffUserStatusFilter, staffUsersApi } from '@/lib/staffUsers';
import { StaffUsersMeta, StaffUsersStats, User, UserType } from '@/types';
import styles from './page.module.css';

const roleFilters: Array<{ label: string; value: UserType | '' }> = [
    { label: 'All Roles', value: '' },
    { label: 'Players', value: 'player' },
    { label: 'Agents', value: 'agent' },
    { label: 'Staff', value: 'staff' },
];

const statusFilters: Array<{ label: string; value: StaffUserStatusFilter }> = [
    { label: 'All Status', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Verified', value: 'verified' },
    { label: 'Unverified', value: 'unverified' },
    { label: 'Test Users', value: 'test' },
];

const defaultStats: StaffUsersStats = {
    total: 0,
    players: 0,
    agents: 0,
    staff: 0,
    active: 0,
    verified: 0,
    test: 0,
};

const defaultMeta: StaffUsersMeta = {
    count: 0,
    limit: 24,
    offset: 0,
    has_more: false,
};

export default function StaffUsersPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState<StaffUsersStats>(defaultStats);
    const [meta, setMeta] = useState<StaffUsersMeta>(defaultMeta);
    const [roleFilter, setRoleFilter] = useState<UserType | ''>('');
    const [statusFilter, setStatusFilter] = useState<StaffUserStatusFilter>('');
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');

    const loadUsers = useCallback(async (offset = 0) => {
        if (offset === 0) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }
        setError('');

        try {
            const data = await staffUsersApi.list({
                userType: roleFilter,
                status: statusFilter,
                search: searchTerm,
                limit: defaultMeta.limit,
                offset,
            });

            setUsers((current) => offset === 0 ? data.results : [...current, ...data.results]);
            setStats(data.stats);
            setMeta(data.meta);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load users.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [roleFilter, searchTerm, statusFilter]);

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
            loadUsers(0);
        }
    }, [authLoading, loadUsers, router, user]);

    useEffect(() => {
        const handle = window.setTimeout(() => {
            setSearchTerm(searchInput.trim());
        }, 300);

        return () => window.clearTimeout(handle);
    }, [searchInput]);

    const visibleRange = useMemo(() => {
        if (!meta.count) return '0 users';
        const end = Math.min(meta.offset + users.length, meta.count);
        return `${end} of ${meta.count} users`;
    }, [meta.count, meta.offset, users.length]);

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
                title="Users"
                eyebrow="User Management"
                description="Review community accounts, filter by role or account status, and open detailed profiles."
                width="wide"
            >
                <section className={styles.summaryGrid}>
                    <SummaryCard label="Total Users" value={stats.total} />
                    <SummaryCard label="Players" value={stats.players} />
                    <SummaryCard label="Agents" value={stats.agents} />
                    <SummaryCard label="Staff" value={stats.staff} />
                    <SummaryCard label="Active" value={stats.active} />
                    <SummaryCard label="Verified" value={stats.verified} />
                </section>

                <section className={styles.filterPanel}>
                    <label className={styles.searchBox}>
                        <span>Search users</span>
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search name, email, username, or Hi-Rollin ID"
                        />
                    </label>

                    <div className={styles.filterGroup}>
                        <span>Role</span>
                        <div className={styles.filterButtons}>
                            {roleFilters.map((filter) => (
                                <button
                                    key={filter.label}
                                    type="button"
                                    className={`${styles.filterBtn} ${roleFilter === filter.value ? styles.activeFilter : ''}`}
                                    onClick={() => setRoleFilter(filter.value)}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.filterGroup}>
                        <span>Status</span>
                        <div className={styles.filterButtons}>
                            {statusFilters.map((filter) => (
                                <button
                                    key={filter.label}
                                    type="button"
                                    className={`${styles.filterBtn} ${statusFilter === filter.value ? styles.activeFilter : ''}`}
                                    onClick={() => setStatusFilter(filter.value)}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {error && (
                    <section className={styles.errorBox}>
                        <span>{error}</span>
                        <button type="button" onClick={() => loadUsers(0)}>Retry</button>
                    </section>
                )}

                <section className={styles.listHeader}>
                    <div>
                        <span>Directory</span>
                        <strong>{visibleRange}</strong>
                    </div>
                    <button type="button" onClick={() => loadUsers(0)} disabled={loading}>
                        Refresh
                    </button>
                </section>

                {loading ? (
                    <section className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </section>
                ) : users.length === 0 ? (
                    <section className={styles.emptyBox}>
                        <span>No users found</span>
                        <p>Try changing the role, status, or search filters.</p>
                    </section>
                ) : (
                    <section className={styles.userGrid} aria-label="User list">
                        {users.map((item) => (
                            <UserCard key={item.id} user={item} onOpen={() => router.push(`/users/${item.id}`)} />
                        ))}
                    </section>
                )}

                {meta.has_more && !loading && (
                    <div className={styles.loadMoreRow}>
                        <button
                            type="button"
                            className={styles.loadMoreBtn}
                            onClick={() => loadUsers(meta.offset + meta.limit)}
                            disabled={loadingMore}
                        >
                            {loadingMore ? 'Loading...' : 'Load More Users'}
                        </button>
                    </div>
                )}
            </PageShell>
        </DashboardLayout>
    );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
    return (
        <div className={styles.summaryCard}>
            <span>{label}</span>
            <strong>{value.toLocaleString()}</strong>
        </div>
    );
}

function UserCard({ user, onOpen }: { user: User; onOpen: () => void }) {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
    const roleLabel = formatRole(user.user_type);

    return (
        <article className={styles.userCard}>
            <div className={styles.cardTop}>
                <UserAvatar user={user} size={48} />
                <div className={styles.identity}>
                    <strong>{name || user.username}</strong>
                    <span>@{user.username}</span>
                </div>
                <span className={`${styles.rolePill} ${styles[user.user_type]}`}>{roleLabel}</span>
            </div>

            <div className={styles.userMeta}>
                <MetaRow label="Email" value={user.email || 'Not added'} />
                <MetaRow label="Hi-Rollin ID" value={user.external_user_id || 'Not saved'} />
                <MetaRow label="Joined" value={formatDate(user.joined_at)} />
                <MetaRow label="Last login" value={formatDate(user.last_login)} />
            </div>

            <div className={styles.statusRow}>
                <StatusPill active={user.is_active === true} label={user.is_active === false ? 'Inactive' : 'Active'} tone={user.is_active === false ? 'danger' : 'success'} />
                <StatusPill active={user.is_verified === true} label={user.is_verified ? 'Verified' : 'Unverified'} tone={user.is_verified ? 'success' : 'warning'} />
                {user.is_test_user && <StatusPill active label="Test" tone="info" />}
            </div>

            <button type="button" className={styles.openBtn} onClick={onOpen}>
                Open Profile
            </button>
        </article>
    );
}

function MetaRow({ label, value }: { label: string; value: string }) {
    return (
        <div className={styles.metaRow}>
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function StatusPill({ label, tone }: { active: boolean; label: string; tone: 'success' | 'warning' | 'danger' | 'info' }) {
    return <span className={`${styles.statusPill} ${styles[tone]}`}>{label}</span>;
}

function formatRole(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value?: string | null) {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Never';
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}
