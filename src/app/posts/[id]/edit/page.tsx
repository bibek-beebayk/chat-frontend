'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PostComposerForm } from '@/components/posts/PostComposerForm';
import { useAuth } from '@/contexts/AuthContext';
import { postApi } from '@/lib/posts';
import { Post } from '@/types';
import styles from './page.module.css';

export default function EditPostPage() {
    const params = useParams();
    const postId = Number(Array.isArray(params?.id) ? params.id[0] : params?.id);

    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [post, setPost] = useState<Post | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState<'public' | 'private' | 'connections'>('public');
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);

    const [loadingPost, setLoadingPost] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadPost = useCallback(async () => {
        if (Number.isNaN(postId)) return;
        setLoadingPost(true);
        setError(null);
        try {
            const data = await postApi.getById(postId);
            setPost(data);
            setTitle(data.title || '');
            setContent(data.content || '');
            const allowedVisibility = data.visibility === 'private' || data.visibility === 'connections' ? data.visibility : 'public';
            setVisibility(allowedVisibility);
            setRemovedImageIds([]);
            setSelectedImages([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load post');
        } finally {
            setLoadingPost(false);
        }
    }, [postId]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (!user) return;
        loadPost();
    }, [authLoading, user, router, loadPost]);

    const ownedByCurrentUser = useMemo(() => {
        if (!post || !user) return false;
        return post.author.id === user.id;
    }, [post, user]);

    const addImages = (files: File[]) => setSelectedImages((prev) => [...prev, ...files]);

    const toggleExistingImage = (imageId: number) => {
        setRemovedImageIds((prev) => (prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]));
    };

    const submit = async () => {
        if (!post) return;
        setSaving(true);
        setError(null);
        try {
            await postApi.update(post.id, {
                title,
                content,
                visibility,
                newImages: selectedImages,
                removeImageIds: removedImageIds,
            });
            router.push(`/posts/${post.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update post');
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || !user) {
        return (
            <DashboardLayout>
                <main className={styles.main}>
                    <div className="spinner"></div>
                </main>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <main className={styles.main}>
                <section className={styles.headRow}>
                    <button type="button" className={styles.backBtn} onClick={() => router.back()}>
                        Back
                    </button>
                    <h1 className={styles.title}>Edit Post</h1>
                </section>

                {error && <p className={styles.errorBox}>{error}</p>}

                {loadingPost ? (
                    <section className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </section>
                ) : !post ? (
                    <section className={styles.errorBox}>Post not found.</section>
                ) : !ownedByCurrentUser ? (
                    <section className={styles.errorBox}>You can edit only your own posts.</section>
                ) : (
                    <PostComposerForm
                        title={title}
                        content={content}
                        visibility={visibility}
                        selectedImages={selectedImages}
                        existingImages={post.images || []}
                        removedImageIds={removedImageIds}
                        submitLabel="Save Changes"
                        loading={saving}
                        onTitleChange={setTitle}
                        onContentChange={setContent}
                        onVisibilityChange={setVisibility}
                        onAddImages={addImages}
                        onRemoveSelectedImage={(index) =>
                            setSelectedImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                        }
                        onToggleExistingImage={toggleExistingImage}
                        onSubmit={submit}
                    />
                )}
            </main>
        </DashboardLayout>
    );
}
