'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { FeedItem } from '@/components/feed/FeedItem';
import { apiClient } from '@/lib/api';
import { Post } from '@/types';
import styles from './page.module.css';

export default function FeedPage() {
    const { user, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user && !authLoading) return;

        const fetchPosts = async () => {
            try {
                const response = await apiClient.get<Post[]>('/api/posts/');
                setPosts(response);
            } catch (err) {
                console.error('Failed to fetch posts:', err);
                setError('Failed to load posts. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchPosts();
        }
    }, [user, authLoading]);

    if (authLoading || loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <>
            <Header />
            <main className={styles.main}>
                <div className={styles.container}>
                    <h1 className="gradient-text" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                        News Feed
                    </h1>

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <div className={styles.feed}>
                        {posts.length > 0 ? (
                            posts.map(post => (
                                <FeedItem key={post.id} post={post} />
                            ))
                        ) : (
                            <div className={styles.empty}>
                                <p>No posts yet. Check back later!</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
