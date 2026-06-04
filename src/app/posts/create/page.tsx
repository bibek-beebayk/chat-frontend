'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
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
            <div className={styles.pageWrap}>
                <Header />
                <main className={styles.main}>
                    <div className="spinner"></div>
                </main>
            </div>
        );
    }

    return (
        <div className={styles.pageWrap}>
            <Header />
            <main className={styles.main}>
                <section className={styles.headRow}>
                    <button type="button" className={styles.backBtn} onClick={() => router.back()}>
                        Back
                    </button>
                    <h1 className={styles.title}>Create Post</h1>
                </section>

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
            </main>
        </div>
    );
}
