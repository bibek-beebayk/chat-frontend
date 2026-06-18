import React from 'react';
import styles from './PageShell.module.css';

type PageShellWidth = 'narrow' | 'standard' | 'wide';

interface PageShellProps {
    title: string;
    eyebrow?: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
    width?: PageShellWidth;
    centered?: boolean;
}

export function PageShell({
    title,
    eyebrow,
    description,
    actions,
    children,
    width = 'standard',
    centered = false,
}: PageShellProps) {
    return (
        <main className={`${styles.page} ${styles[width]} ${centered ? styles.center : ''}`}>
            <header className={styles.header}>
                <div className={styles.headerText}>
                    {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
                    <h1 className={styles.title}>{title}</h1>
                    {description && <p className={styles.description}>{description}</p>}
                </div>
                {actions && <div className={styles.actions}>{actions}</div>}
            </header>
            {children}
        </main>
    );
}

export function ComingSoonPanel({ title }: { title: string }) {
    return (
        <section className={styles.emptyState} aria-label={`${title} status`}>
            <span className={styles.emptyIcon} aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 6v6l4 2" />
                    <circle cx="12" cy="12" r="9" />
                </svg>
            </span>
            <h2 className={styles.emptyTitle}>{title} is being prepared</h2>
            <p className={styles.emptyText}>
                This area will use the same dashboard layout and navigation once its content is ready.
            </p>
        </section>
    );
}

export function DocumentPanel({ children }: { children: React.ReactNode }) {
    return <section className={`${styles.panel} ${styles.document}`}>{children}</section>;
}

export function DocumentMeta({ children }: { children: React.ReactNode }) {
    return <p className={styles.documentMeta}>{children}</p>;
}
