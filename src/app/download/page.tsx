'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';
import styles from './page.module.css';

interface AppVersion {
  version_code: string;
  is_mandatory: boolean;
  release_notes: string;
  apk_url: string;
  created_at: string;
}

export default function DownloadPage() {
  const [appVersion, setAppVersion] = useState<AppVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppVersion = async () => {
      try {
        const response = await apiClient.get<AppVersion>(
          '/api/auth/app-version/',
          { skipAuth: true },
        );
        setAppVersion(response);
      } catch (err: any) {
        console.error('Failed to fetch app version:', err);
        setError('Failed to load app download information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppVersion();
  }, []);

  const releaseDate = appVersion?.created_at
    ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(appVersion.created_at))
    : null;

  return (
    <DashboardLayout>
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Mobile App</span>
            <h1>Download Rollin Community</h1>
            <p>
              Get a smoother Hi-Rollin experience on mobile with the Android APK,
              or install the web app from Safari on iPhone and iPad.
            </p>
            <div className={styles.heroMeta}>
              <span>Android APK</span>
              <span>iOS web app</span>
              <span>Fast access</span>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.phoneMockup}>
              <div className={styles.phoneTop}></div>
              <Image src="/logo-3.png" alt="" width={260} height={260} className={styles.heroLogo} priority />
              <div className={styles.phoneContent}>
                <span>Rollin Community</span>
                <strong>{appVersion ? `v${appVersion.version_code}` : 'Mobile ready'}</strong>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className={styles.stateCard} aria-live="polite">
            <div className="spinner"></div>
            <p>Loading download details...</p>
          </section>
        ) : error ? (
          <section className={styles.errorCard} role="alert">
            <span>Download unavailable</span>
            <p>{error}</p>
          </section>
        ) : appVersion ? (
          <section className={styles.contentGrid}>
            <article className={styles.downloadCard}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.cardEyebrow}>Latest Android Build</span>
                  <h2>Android APK</h2>
                </div>
                {appVersion.is_mandatory && (
                  <span className={styles.requiredBadge}>Required update</span>
                )}
              </div>

              <div className={styles.versionPanel}>
                <div>
                  <span>Version</span>
                  <strong>{appVersion.version_code}</strong>
                </div>
                <div>
                  <span>Released</span>
                  <strong>{releaseDate || 'Available now'}</strong>
                </div>
              </div>

              <a
                href={appVersion.apk_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.downloadButton}
              >
                <DownloadIcon />
                Download APK
              </a>

              <p className={styles.helperText}>
                Install the APK directly on Android. Your device may ask for permission
                before opening apps downloaded from the browser.
              </p>
            </article>

            <article className={styles.notesCard}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.cardEyebrow}>Release Notes</span>
                  <h2>What&apos;s New</h2>
                </div>
              </div>
              <div className={styles.releaseNotes}>
                {appVersion.release_notes || 'No release notes were added for this version.'}
              </div>
            </article>

            <article className={styles.guideCard}>
              <span className={styles.guideIcon}><AndroidIcon /></span>
              <h2>Install on Android</h2>
              <ol className={styles.stepList}>
                <li>Download the APK file using the button above.</li>
                <li>Open the downloaded file on your Android device.</li>
                <li>Allow installation from the browser if your device asks.</li>
                <li>Follow the on-screen instructions to finish installing.</li>
              </ol>
            </article>

            <article className={styles.guideCard}>
              <span className={styles.guideIcon}><PhoneIcon /></span>
              <h2>Install on iOS</h2>
              <ol className={styles.stepList}>
                <li>Open Rollin Community in Safari.</li>
                <li>Tap the Share button.</li>
                <li>Select <strong>Add to Home Screen</strong>.</li>
                <li>Confirm the app name and tap <strong>Add</strong>.</li>
              </ol>
            </article>
          </section>
        ) : null}
      </main>
    </DashboardLayout>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9h12v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9Z" />
      <path d="M9 5 7 2" />
      <path d="m15 5 2-3" />
      <path d="M8 13h.01" />
      <path d="M16 13h.01" />
      <path d="M4 10v5" />
      <path d="M20 10v5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}
