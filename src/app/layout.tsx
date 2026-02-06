import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import '@/styles/globals.css';
import { FloatingChat } from '@/components/chat/FloatingChat';
import { Footer } from '@/components/layout/Footer';
import { PWAManager } from '@/components/PWAManager';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Rollin Community',
    description: 'Rollin Community Chat Application',
    manifest: "/manifest.json",
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
                    <AuthProvider>
                        <NotificationProvider>
                            {children}
                            <Footer />
                            <FloatingChat />
                        </NotificationProvider>
                    </AuthProvider>
                </ErrorBoundary>
            </body>
        </html>
    );
}
