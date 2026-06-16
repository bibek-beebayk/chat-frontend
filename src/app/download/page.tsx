'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';
import styles from '../page.module.css';

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

    return (
        <DashboardLayout>
            <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.mainContent}>
            <div
              className={styles.hero}
              style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}
            >
              <h1 className={styles.title}>
                Download the <span className="gradient-text">Rollin Community App</span>
              </h1>
              <p className={styles.subtitle} style={{ marginBottom: '2rem' }}>
                Get the best experience with our native mobile application for Android.
              </p>

              {loading ? (
                <div className={styles.loading}>
                  <div className="spinner"></div>
                </div>
              ) : error ? (
                <div className="glass" style={{ padding: '2rem', color: '#ef4444' }}>
                  <p>{error}</p>
                </div>
              ) : appVersion ? (
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  <div className={`${styles.card} glass`} style={{ textAlign: 'left', padding: '3rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '2rem',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div>
                        <h2 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                          Android APK
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>
                          Version {appVersion.version_code}
                        </p>
                      </div>
                      <a
                        href={appVersion.apk_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.cardButton}
                        style={{
                          textDecoration: 'none',
                          display: 'inline-block',
                          fontSize: '1.2rem',
                          padding: '1rem 2rem',
                        }}
                      >
                        Download Now
                      </a>
                    </div>

                    {appVersion.release_notes && (
                      <div
                        style={{
                          marginTop: '2rem',
                          paddingTop: '2rem',
                          borderTop: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <h3 style={{ marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
                          What&apos;s New:
                        </h3>
                        <div
                          style={{
                            color: 'var(--color-text-secondary)',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {appVersion.release_notes}
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: '3rem',
                        fontSize: '0.9rem',
                        color: 'var(--color-text-secondary)',
                        opacity: 0.8,
                      }}
                    >
                      <p>
                        <strong>Android Installation Instructions:</strong>
                      </p>
                      <ol style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                        <li>Download the APK file using the button above.</li>
                        <li>Open the downloaded file on your Android device.</li>
                        <li>
                          If prompted, allow installation from unknown sources in your device settings.
                        </li>
                        <li>Follow the on-screen instructions to complete the installation.</li>
                      </ol>
                    </div>
                  </div>

                  <div className={`${styles.card} glass`} style={{ textAlign: 'left', padding: '2rem 3rem' }}>
                    <h2 className="gradient-text" style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>
                      iOS PWA
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                      Install the web app on iPhone or iPad from Safari.
                    </p>
                    <ol
                      style={{
                        paddingLeft: '1.5rem',
                        color: 'var(--color-text-secondary)',
                        lineHeight: '1.7',
                      }}
                    >
                      <li>Open this website in Safari on your iPhone or iPad.</li>
                      <li>Tap the Share icon in Safari.</li>
                      <li>
                        Select <strong>Add to Home Screen</strong>.
                      </li>
                      <li>
                        Confirm the app name and tap <strong>Add</strong>.
                      </li>
                      <li>Launch the app from your home screen like a native app.</li>
                    </ol>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
            </main>
        </DashboardLayout>
    );
}
