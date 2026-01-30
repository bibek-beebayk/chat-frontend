import React from 'react';

export const Footer: React.FC = () => {
    return (
        <footer style={{
            marginTop: 'auto',
            textAlign: 'center',
            color: '#666',
            fontSize: '0.9rem',
            padding: '2rem 1rem',
            borderTop: '1px solid var(--color-border)', // Using CSS variable for consistency
            backgroundColor: 'var(--color-bg-secondary)' // Optional: distinct background
        }}>
            <p>&copy; 2024 Rollers Community. All rights reserved.</p>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
                <span style={{ cursor: 'pointer' }}>Terms of Service</span>
                <span style={{ cursor: 'pointer' }}>Responsible Gaming</span>
            </div>
        </footer>
    );
};
