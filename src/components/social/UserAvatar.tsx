'use client';

import React from 'react';
import { User } from '@/types';
import { resolveProfileImageUrl } from '@/lib/social';

interface UserAvatarProps {
    user: User;
    size?: number;
    className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 40, className }) => {
    const imageUrl = resolveProfileImageUrl(user);
    const label = user.username?.trim()?.[0]?.toUpperCase() || 'U';

    return (
        <div
            className={className}
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: `${Math.max(12, Math.floor(size * 0.42))}px`,
            }}
            aria-label={`${user.username} avatar`}
        >
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={`${user.username} profile`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            ) : (
                label
            )}
        </div>
    );
};

