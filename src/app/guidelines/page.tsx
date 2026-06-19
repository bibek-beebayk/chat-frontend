'use client';

import type React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import styles from '../legal.module.css';

export default function GuidelinesPage() {
    return (
        <DashboardLayout>
            <PageShell
                title="Community Guidelines"
                eyebrow="Support"
                description="How Rollin Community members keep conversations helpful, fair, and safe."
                width="wide"
            >
                <section className={styles.heroPanel}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroEyebrow}>Member Standards</span>
                        <h2>Play fair, speak clearly, and look out for the community.</h2>
                        <p>
                            Rollin Community works best when members share useful updates, respect each other,
                            protect their accounts, and keep discussions focused on the experience we are building together.
                        </p>
                    </div>
                    <div className={styles.metaGrid}>
                        <div className={styles.metaCard}>
                            <span>Applies To</span>
                            <strong>All members</strong>
                        </div>
                        <div className={styles.metaCard}>
                            <span>Focus</span>
                            <strong>Safety and conduct</strong>
                        </div>
                        <div className={styles.metaCard}>
                            <span>Updated</span>
                            <strong>June 2026</strong>
                        </div>
                    </div>
                </section>

                <section className={styles.summaryGrid} aria-label="Guideline highlights">
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryIcon}><RespectIcon /></span>
                        <h3>Respect People</h3>
                        <p>Disagree without attacking. Harassment, threats, hate speech, and personal abuse do not belong here.</p>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryIcon}><ShieldIcon /></span>
                        <h3>Protect Accounts</h3>
                        <p>Never share passwords, private codes, payment details, or another member&apos;s personal information.</p>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryIcon}><ChatIcon /></span>
                        <h3>Keep It Useful</h3>
                        <p>Post in the right place, avoid spam, and make room for conversations that help the whole community.</p>
                    </div>
                </section>

                <section className={styles.documentPanel}>
                    <GuidelineSection title="1. Be Respectful">
                        <p>
                            Treat other members, agents, and staff with courtesy. Healthy debate is welcome,
                            but insults, harassment, intimidation, discriminatory language, or repeated unwanted
                            contact may lead to moderation action.
                        </p>
                    </GuidelineSection>

                    <GuidelineSection title="2. Keep Content Relevant">
                        <p>
                            Use posts, chat, announcements, and support areas for their intended purpose.
                            Avoid flooding conversations, posting duplicate messages, hijacking topics, or
                            using community spaces for unrelated promotion.
                        </p>
                    </GuidelineSection>

                    <GuidelineSection title="3. Share Accurate Information">
                        <p>
                            Do not impersonate staff, agents, or other members. Avoid spreading misleading claims
                            about events, rewards, account status, payments, promotions, or platform rules.
                            When in doubt, check official announcements or ask support.
                        </p>
                    </GuidelineSection>

                    <GuidelineSection title="4. Protect Privacy and Security">
                        <p>
                            Do not post private conversations, personal information, verification details,
                            login credentials, one-time codes, wallet details, or payment information. Support
                            will never ask you to reveal your password in a public channel.
                        </p>
                    </GuidelineSection>

                    <GuidelineSection title="5. Use Fair Play Standards">
                        <p>
                            Do not exploit bugs, automate platform actions, manipulate rewards, coordinate abuse,
                            or help others bypass rules. If you find a technical issue, report it through support
                            instead of sharing instructions publicly.
                        </p>
                    </GuidelineSection>

                    <GuidelineSection title="6. Report Problems Responsibly">
                        <p>
                            If you see abuse, suspicious activity, unsafe content, or account problems, contact
                            support with clear details. Include screenshots or context when useful, but avoid
                            publicly escalating personal disputes.
                        </p>
                    </GuidelineSection>

                    <GuidelineSection title="7. Moderation Actions">
                        <p>
                            Staff may remove content, limit features, issue warnings, or suspend accounts when
                            behavior harms the community or violates these guidelines. Serious abuse, fraud,
                            threats, or security risks may result in immediate account restrictions.
                        </p>
                    </GuidelineSection>
                </section>
            </PageShell>
        </DashboardLayout>
    );
}

function GuidelineSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <article className={styles.policySection}>
            <h2>{title}</h2>
            <div className={styles.sectionBody}>{children}</div>
        </article>
    );
}

function RespectIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5 1.34 3.5 3 3.5Z" />
            <path d="M8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Z" />
            <path d="M2 20c.7-3 2.8-5 6-5" />
            <path d="M22 20c-.7-3-2.8-5-6-5" />
            <path d="M8 15c1.2 1.4 2.5 2 4 2s2.8-.6 4-2" />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function ChatIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
            <path d="M8 9h8" />
            <path d="M8 13h5" />
        </svg>
    );
}
