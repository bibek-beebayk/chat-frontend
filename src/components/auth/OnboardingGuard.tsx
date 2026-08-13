'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasCompletedSocialOnboarding, socialApi } from '@/lib/social';

const BYPASS_PREFIXES = [
    '/login',
    '/register',
    '/verify-otp',
    '/set-password',
    '/test-email',
    '/username-setup',
    '/onboarding',
    '/privacy',
    '/terms',
    '/download',
];

type Props = {
    children: ReactNode;
};

export function OnboardingGuard({ children }: Props) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (loading || !pathname) return;
        if (!user || user.user_type !== 'player') return;
        if (BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

        if (user.needs_username_setup) {
            router.replace(`/username-setup?next=${encodeURIComponent(pathname)}`);
            return;
        }

        let cancelled = false;
        const run = async () => {
            try {
                const state = await socialApi.fetchOnboardingState();
                if (!cancelled && !hasCompletedSocialOnboarding(state)) {
                    router.replace('/onboarding');
                }
            } catch {
                if (!cancelled) {
                    router.replace('/onboarding');
                }
            }
        };
        run();

        return () => {
            cancelled = true;
        };
    }, [loading, pathname, router, user]);

    return <>{children}</>;
}
