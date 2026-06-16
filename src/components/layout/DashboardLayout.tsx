import React, { useState } from 'react';
import styles from './DashboardLayout.module.css';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { MobileBottomNav } from './MobileBottomNav';

interface DashboardLayoutProps {
    children: React.ReactNode;
    rightSidebar?: React.ReactNode;
    hideSidebar?: boolean;
}

export function DashboardLayout({ children, rightSidebar, hideSidebar }: DashboardLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className={styles.layoutContainer}>
            {/* Desktop Left Sidebar */}
            {!hideSidebar && (
                <div className={`${styles.leftSidebar} ${isMobileMenuOpen ? styles.mobileOpen : ''}`}>
                    <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
                </div>
            )}

            {/* Mobile overlay */}
            {isMobileMenuOpen && (
                <div className={styles.overlay} onClick={() => setIsMobileMenuOpen(false)} />
            )}

            <div className={styles.mainWrapper}>
                <TopNav onMenuClick={() => setIsMobileMenuOpen(true)} />
                
                <div className={styles.contentArea}>
                    <main className={styles.mainContent}>
                        {children}
                    </main>

                    {rightSidebar && (
                        <aside className={styles.rightSidebar}>
                            {rightSidebar}
                        </aside>
                    )}
                </div>
            </div>
            
            {/* The existing MobileBottomNav is globally rendered in app/layout.tsx, so we don't need to render it here, or we can move it here. 
                Wait, app/layout.tsx renders <MobileBottomNav /> globally. We will just leave it there. */}
        </div>
    );
}
