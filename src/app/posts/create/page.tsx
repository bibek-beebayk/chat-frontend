'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/layout/PageShell';
import { PostComposerForm } from '@/components/posts/PostComposerForm';
import { useAuth } from '@/contexts/AuthContext';
import { postApi } from '@/lib/posts';
import styles from './page.module.css';

export default function CreatePostPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [visibility, setVisibility] = useState<'public' | 'private' | 'connections'>('public');
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addImages = (files: File[]) => setSelectedImages((prev) => [...prev, ...files]);

    const submit = async () => {
        setSaving(true);
        setError(null);
        try {
            const post = await postApi.create({
                title,
                content,
                visibility,
                newImages: selectedImages,
            });
            router.push(`/posts/${post.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create post');
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || !user) {
        return (
            <DashboardLayout>
                <main className={styles.loadingArea}>
                    <div className="spinner"></div>
                </main>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <PageShell
                title="Create Post"
                eyebrow="Community"
                description="Publish an update for the Rollin Community feed."
                width="standard"
                actions={
                    <button type="button" className={styles.backBtn} onClick={() => router.back()}>
                        Back
                    </button>
                }
            >

                {error && <p className={styles.errorBox}>{error}</p>}

                <PostComposerForm
                    title={title}
                    content={content}
                    visibility={visibility}
                    selectedImages={selectedImages}
                    submitLabel="Publish"
                    loading={saving}
                    onTitleChange={setTitle}
                    onContentChange={setContent}
                    onVisibilityChange={setVisibility}
                    onAddImages={addImages}
                    onRemoveSelectedImage={(index) =>
                        setSelectedImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                    }
                    onToggleExistingImage={() => undefined}
                    onSubmit={submit}
                />
            </PageShell>
        </DashboardLayout>
    );
}
