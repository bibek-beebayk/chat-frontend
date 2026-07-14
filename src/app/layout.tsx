import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import '@/styles/globals.css';
import { FloatingChat } from '@/components/chat/FloatingChat';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { RouteLoadingBar } from '@/components/layout/RouteLoadingBar';
import { PWAManager } from '@/components/PWAManager';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingGuard } from '@/components/auth/OnboardingGuard';
import { AnalyticsTracker } from '@/components/analytics/AnalyticsTracker';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Rollin Community',
    description: 'Rollin Community Chat Application',
    manifest: "/manifest.json",
    icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Rollin",
        startupImage: [
            "/icon-512.png",
        ],
    },
    openGraph: {
        title: 'Rollin Community',
        description: 'Rollin Community Chat Application',
        images: ['/icon-512.png'],
        type: 'website',
        siteName: 'Rollin Community',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Rollin Community',
        description: 'Rollin Community Chat Application',
        images: ['/icon-512.png'],
    },
};


export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#1a1a1a",
};



import { NotificationProvider } from '@/contexts/NotificationContext';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <ErrorBoundary>
                    <PWAManager />
                    <ThemeProvider>
                        <AuthProvider>
                            <NotificationProvider>
                                <OnboardingGuard>
                                    <Suspense fallback={null}>
                                        <RouteLoadingBar />
                                        <AnalyticsTracker />
                                    </Suspense>
                                    {children}
                                    <MobileBottomNav />
                                    <Footer />
                                    <FloatingChat />
                                </OnboardingGuard>
                            </NotificationProvider>
                        </AuthProvider>
                    </ThemeProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}
