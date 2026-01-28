'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export const ChatBubble: React.FC = () => {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // Only show for players and agents
    if (!user || user.user_type === 'staff') {
        return null;
    }

    // Hide if already on chat page
    if (pathname === '/chat') {
        return null;
    }

    const isEventPage = pathname?.startsWith('/events/');

    return (
        <button
            onClick={() => router.push(isEventPage ? '/chat?room_type=event' : '/chat')}
            style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                padding: '1rem 1.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 'bold',
                transition: 'transform 0.2s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
            <span style={{ fontSize: '1.2rem' }}>💬</span>
            Chat with Support
        </button>
    );
};
