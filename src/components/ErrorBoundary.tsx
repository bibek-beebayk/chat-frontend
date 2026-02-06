'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary to catch client-side errors and prevent white/black screens
 * Particularly important for in-app browsers where certain APIs may not be available
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '20px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    backgroundColor: '#1a1a1a',
                    color: '#ffffff',
                }}>
                    <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Something went wrong</h1>
                    <p style={{ marginBottom: '24px', textAlign: 'center', maxWidth: '500px' }}>
                        We're having trouble loading this page. Please try opening this link in your default browser.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            backgroundColor: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                        }}
                    >
                        Reload Page
                    </button>
                    {this.state.error && (
                        <details style={{ marginTop: '32px', maxWidth: '600px' }}>
                            <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>Error Details</summary>
                            <pre style={{
                                fontSize: '12px',
                                backgroundColor: '#2a2a2a',
                                padding: '16px',
                                borderRadius: '4px',
                                overflow: 'auto',
                            }}>
                                {this.state.error.toString()}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
