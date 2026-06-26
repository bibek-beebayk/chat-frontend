'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import styles from './DownloadAppModal.module.css';

interface AppVersion {
  version_code: string;
  is_mandatory: boolean;
  release_notes: string;
  apk_url: string;
  created_at: string;
}

interface DownloadAppModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DownloadAppModal({ isOpen, onClose }: DownloadAppModalProps) {
    const [appVersion, setAppVersion] = useState<AppVersion | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
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
    }, [isOpen]);

    if (!isOpen) return null;

    const releaseDate = appVersion?.created_at
        ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(appVersion.created_at))
        : null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <button className={styles.closeBtn} onClick={onClose}>&times;</button>
                <h2>Download Rollin Community</h2>
                <p className={styles.subtitle}>Get a smoother Hi-Rollin experience on mobile!</p>

                {loading ? (
                    <div className={styles.stateCard}>
                        <div className="spinner"></div>
                        <p>Loading download details...</p>
                    </div>
                ) : error ? (
                    <div className={styles.errorCard}>
                        <p>{error}</p>
                    </div>
                ) : appVersion ? (
                    <div className={styles.contentGrid}>
                        <div className={styles.downloadCard}>
                            <div className={styles.cardHeader}>
                                <div>
                                    <span className={styles.cardEyebrow}>Latest Android Build</span>
                                    <h3>Android APK</h3>
                                </div>
                                {appVersion.is_mandatory && (
                                    <span className={styles.requiredBadge}>Required</span>
                                )}
                            </div>

                            <div className={styles.versionPanel}>
                                <div>
                                    <span>Version: </span>
                                    <strong>{appVersion.version_code}</strong>
                                </div>
                                <div>
                                    <span>Released: </span>
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
                        </div>
                        
                        <div className={styles.guideCard}>
                            <h3><PhoneIcon /> iOS users</h3>
                            <p>Open Rollin Community in Safari, tap the Share button, and select <strong>Add to Home Screen</strong>.</p>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '8px' }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}
