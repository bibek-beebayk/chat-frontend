import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import styles from './MessageActionMenu.module.css';

interface MessageActionMenuProps {
    isOwner: boolean;
    isStaff: boolean;
    isPinned: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onPin: () => void;
}

export const MessageActionMenu: React.FC<MessageActionMenuProps> = ({
    isOwner,
    isStaff,
    isPinned,
    onEdit,
    onDelete,
    onPin
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const [menuPos, setMenuPos] = useState<'down' | 'up'>('down');

    // Use useLayoutEffect to prevent flash of wrong position
    useLayoutEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);

            // Calculate position
            if (menuRef.current) {
                const rect = menuRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - rect.bottom;

                // Debug log to confirm calculation
                console.log('Menu position:', { bottom: rect.bottom, innerHeight: window.innerHeight, spaceBelow });

                // If less than 220px (increased buffer) below, flip up
                if (spaceBelow < 220) {
                    setMenuPos('up');
                } else {
                    setMenuPos('down');
                }
            }
        } else {
            // Reset when closed
            setMenuPos('down');
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={styles.menuContainer} ref={menuRef}>
            <button
                className={styles.menuButton}
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                aria-label="Message options"
            >
                ⋮
            </button>

            {isOpen && (
                <div className={`${styles.dropdown} ${menuPos === 'up' ? styles.up : ''}`}>
                    {isOwner && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); onEdit(); }}>
                                ✏️ Edit
                            </button>
                            <button onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                onDelete();
                            }} className={styles.delete}>
                                🗑️ Delete
                            </button>
                        </>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); onPin(); }}>
                        {isPinned ? '❌ Unpin' : '📌 Pin'}
                    </button>
                </div>
            )}
        </div>
    );
};
