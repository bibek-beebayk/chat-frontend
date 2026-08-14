'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { ClassicPlinkoGame } from '@/components/games/plinko/ClassicPlinkoGame';
import { FreeDropPlinkoGame } from '@/components/games/plinko/FreeDropPlinkoGame';
import { useAuth } from '@/contexts/AuthContext';
import { PlinkoMode } from '@/types';
import styles from './page.module.css';

/**
 * Thin mode-selecting shell - the actual game UI/state for each mode lives
 * in ClassicPlinkoGame / FreeDropPlinkoGame (see those files), which are
 * fully independent of each other. Switching `mode` unmounts whichever game
 * component isn't active, so there's no shared mutable state between them
 * to reason about.
 */
export default function PlinkoPage() {
    const { user } = useAuth();
    const [mode, setMode] = useState<PlinkoMode>('classic');

    if (!user || user.user_type !== 'player') {
        return (
            <DashboardLayout>
                <PageShell title="Plinko" eyebrow="Games" description="Drop the ball, bet on the bounce." centered>
                    <section className={styles.emptyState}>
                        <p>Plinko is available for player accounts.</p>
                    </section>
                </PageShell>
            </DashboardLayout>
        );
    }

    return mode === 'classic'
        ? <ClassicPlinkoGame mode={mode} onModeChange={setMode} />
        : <FreeDropPlinkoGame mode={mode} onModeChange={setMode} />;
}
