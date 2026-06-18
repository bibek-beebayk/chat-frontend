'use client';

import type React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import styles from '../legal.module.css';

export default function PrivacyPage() {
    return (
        <DashboardLayout>
            <PageShell
                title="Privacy Policy"
                eyebrow="Legal"
                description="How Rollin Community handles account information, activity data, communications, and platform safety."
                width="wide"
            >
                <section className={styles.heroPanel}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroEyebrow}>Privacy First</span>
                        <h2>Your data should feel understandable.</h2>
                        <p>
                            This policy explains what we collect, why we use it, how we protect it,
                            and the choices you have when using Rollin Community.
                        </p>
                    </div>
                    <div className={styles.metaGrid}>
                        <div className={styles.metaCard}>
                            <span>Last Updated</span>
                            <strong>January 2026</strong>
                        </div>
                        <div className={styles.metaCard}>
                            <span>Applies To</span>
                            <strong>Website and app</strong>
                        </div>
                        <div className={styles.metaCard}>
                            <span>Contact</span>
                            <strong>Support team</strong>
                        </div>
                    </div>
                </section>

                <section className={styles.summaryGrid} aria-label="Privacy highlights">
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryIcon}><ProfileIcon /></span>
                        <h3>Account Details</h3>
                        <p>We use profile and login details to operate your account and personalize the community experience.</p>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryIcon}><ShieldIcon /></span>
                        <h3>Safety Controls</h3>
                        <p>We process activity data to protect users, prevent abuse, and keep platform features reliable.</p>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryIcon}><MessageIcon /></span>
                        <h3>Communication</h3>
                        <p>We may use your contact details to send account, support, and important service updates.</p>
                    </div>
                </section>

                <section className={styles.documentPanel}>
                    <PolicySection title="1. Information We Collect">
                        <p>
                            We collect information you provide directly to us, including account details,
                            profile information, verification details, messages to support, and content you
                            choose to post or share in the community.
                        </p>
                        <p>
                            We may also collect usage information such as device details, login activity,
                            feature interactions, and basic technical data needed to keep the service stable.
                        </p>
                    </PolicySection>

                    <PolicySection title="2. How We Use Your Information">
                        <p>
                            We use your information to provide, maintain, secure, and improve Rollin Community.
                            This includes account access, community features, chat, posts, support, verification,
                            notifications, and service troubleshooting.
                        </p>
                    </PolicySection>

                    <PolicySection title="3. Sharing and Disclosure">
                        <p>
                            We do not sell your personal information. We may share limited information with
                            service providers, administrators, or support teams when needed to operate the
                            platform, meet legal requirements, prevent fraud, or protect community safety.
                        </p>
                    </PolicySection>

                    <PolicySection title="4. Security and Retention">
                        <p>
                            We use reasonable technical and organizational safeguards to protect personal
                            information. We keep information only as long as needed for platform operations,
                            legal obligations, dispute resolution, and safety requirements.
                        </p>
                    </PolicySection>

                    <PolicySection title="5. Your Choices">
                        <p>
                            You may update account details from your profile settings. You can contact support
                            to request help with privacy questions, account access, or information correction.
                        </p>
                    </PolicySection>

                    <PolicySection title="6. Contact Us">
                        <p>
                            If you have questions about this Privacy Policy or how your information is handled,
                            please contact our support team.
                        </p>
                    </PolicySection>
                </section>
            </PageShell>
        </DashboardLayout>
    );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <article className={styles.policySection}>
            <h2>{title}</h2>
            <div className={styles.sectionBody}>{children}</div>
        </article>
    );
}

function ProfileIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
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

function MessageIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
        </svg>
    );
}
