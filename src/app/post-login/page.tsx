'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasCompletedSocialOnboarding, socialApi } from '@/lib/social';

export default function PostLoginPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.replace('/login');
            return;
        }

        const nextUrl = searchParams.get('next');

        const resolveDestination = async () => {
            if (user.user_type === 'staff') {
                router.replace(nextUrl || '/staff-dashboard');
                return;
            }

            if (user.user_type !== 'player') {
                router.replace(nextUrl || '/');
                return;
            }

            try {
                const state = await socialApi.fetchOnboardingState();
                if (!hasCompletedSocialOnboarding(state)) {
                    router.replace('/onboarding');
                    return;
                }
                router.replace(nextUrl || '/');
            } catch {
                router.replace('/onboarding');
            }
        };

        resolveDestination();
    }, [loading, router, searchParams, user]);

    return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
            <div className="spinner" />
        </main>
    );
}

