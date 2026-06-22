'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ScratchRedeemRedirect() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (!params.get('source')) {
            params.set('source', 'scratch');
        }
        router.replace(`/redeem?${params.toString()}`);
    }, [router, searchParams]);

    return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
            <div className="spinner" />
        </main>
    );
}

export default function ScratchRedeemPage() {
    return (
        <Suspense fallback={
            <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
                <div className="spinner" />
            </main>
        }>
            <ScratchRedeemRedirect />
        </Suspense>
    );
}
