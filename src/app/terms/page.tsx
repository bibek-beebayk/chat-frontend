'use client';

import type React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import styles from '../legal.module.css';

export default function TermsPage() {
    return (
        <DashboardLayout>
            <PageShell
                title="Terms of Service"
                eyebrow="Legal"
                description="The rules and responsibilities that apply when you use Rollin Community."
                width="wide"
            >
                <section className={styles.heroPanel}>
                    <div className={styles.heroCopy}>
                        <span className={styles.heroEyebrow}>Platform Terms</span>
                        <h2>Use the community with clarity.</h2>
                        <p>
                            These terms explain account responsibilities, acceptable use,
                            community behavior, and how platform access may be managed.
                        </p>
                    </div>
                    <div className={styles.metaGrid}>
                        <div className={styles.metaCard}>
                            <span>Last Updated</span>
                            <strong>January 2026</strong>
                        </div>
                        <div className={styles.metaCard}>
                            <span>Applies To</span>
                            <strong>All members</strong>
                        </div>
                        <div className={styles.metaCard}>
                            <span>Scope</span>
                            <strong>Community use</strong>
                        </div>
                    </div>
                </section>

                <section className={styles.summaryGrid} aria-label="Terms highlights">
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryIcon}><AgreementIcon /></span>
                        <h3>Acceptance</h3>
                        <p>Using Rollin Community means you agree to follow these terms and related platform rules.</p>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryIcon}><AccountIcon /></span>
                        <h3>Your Account</h3>
                        <p>You are responsible for accurate account information and activity under your login.</p>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryIcon}><RulesIcon /></span>
                        <h3>Fair Use</h3>
                        <p>Illegal, abusive, deceptive, or unauthorized activity is not allowed on the platform.</p>
                    </div>
                </section>

                <section className={styles.documentPanel}>
                    <PolicySection title="1. Acceptance of Terms">
                        <p>
                            Please read these Terms of Service carefully before using Rollin Community.
                            By accessing or using our services, you agree to be bound by these Terms.
                            If you disagree with any part of the Terms, you may not access the service.
                        </p>
                    </PolicySection>

                    <PolicySection title="2. User Accounts">
                        <p>
                            You are responsible for safeguarding the password and login details you use
                            to access the service. You are also responsible for activity that occurs under
                            your account.
                        </p>
                        <p>
                            Account information should be accurate and kept current. We may require
                            verification for certain roles, features, promotions, or community access.
                        </p>
                    </PolicySection>

                    <PolicySection title="3. Community Conduct">
                        <p>
                            You agree to interact with other members respectfully and to avoid harassment,
                            impersonation, spam, harmful content, or activity that disrupts the platform.
                        </p>
                    </PolicySection>

                    <PolicySection title="4. Prohibited Activities">
                        <p>
                            You may not use the service for any illegal or unauthorized purpose. This includes
                            attempting to bypass security, misuse private information, manipulate platform
                            features, or interfere with other users.
                        </p>
                    </PolicySection>

                    <PolicySection title="5. Platform Changes and Availability">
                        <p>
                            We may update, suspend, or remove features as the service evolves. We try to keep
                            Rollin Community reliable, but access may occasionally be interrupted for maintenance,
                            updates, or issues outside our control.
                        </p>
                    </PolicySection>

                    <PolicySection title="6. Account Actions">
                        <p>
                            We may limit, suspend, or terminate access if an account violates these Terms,
                            creates risk for the community, or is used in a way that harms the service.
                        </p>
                    </PolicySection>

                    <PolicySection title="7. Contact">
                        <p>
                            If you have questions about these Terms, please contact our support team.
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

function AgreementIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="m9 15 2 2 4-4" />
        </svg>
    );
}

function AccountIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function RulesIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
        </svg>
    );
}
