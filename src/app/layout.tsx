import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import '@/styles/globals.css';
import { FloatingChat } from '@/components/chat/FloatingChat';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Hi-Rollin Portal',
    description: 'Officia; Support Portal for Hi-Rollin Players and Agents',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AuthProvider>
                    {children}
                    <FloatingChat />
                </AuthProvider>
            </body>
        </html>
    );
}
