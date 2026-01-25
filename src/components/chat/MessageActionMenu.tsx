import React, { useState, useRef, useEffect } from 'react';
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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
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
                <div className={styles.dropdown}>
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
                    {(isStaff || isOwner) && (
                        <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); onPin(); }}>
                            {isPinned ? '❌ Unpin' : '📌 Pin'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
