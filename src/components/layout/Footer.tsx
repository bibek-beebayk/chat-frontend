'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Footer: React.FC = () => {
    const pathname = usePathname();
    const isChatPage = pathname?.startsWith('/chat') || pathname?.startsWith('/staff-dashboard');
    const isAuthPage = ['/login', '/register', '/verify-otp', '/set-password', '/forgot-password'].some((prefix) => pathname?.startsWith(prefix));

    if (isChatPage || isAuthPage) return null;

    return (
        <footer style={{
            marginTop: 'auto',
            textAlign: 'center',
            color: '#666',
            fontSize: '0.9rem',
            padding: '2rem 1rem',
            borderTop: '1px solid var(--color-border)', // Using CSS variable for consistency
            backgroundColor: 'var(--color-bg-secondary)' // Optional: distinct background
        }}>
            <p>&copy; 2024 Rollin Community. All rights reserved.</p>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link href="/privacy" style={{ cursor: 'pointer', color: '#666', textDecoration: 'none' }}>Privacy Policy</Link>
                <Link href="/terms" style={{ cursor: 'pointer', color: '#666', textDecoration: 'none' }}>Terms of Service</Link>
                <Link href="/download" style={{ cursor: 'pointer', color: '#666', textDecoration: 'none' }}>Download App</Link>
            </div>
        </footer>
    );
};
