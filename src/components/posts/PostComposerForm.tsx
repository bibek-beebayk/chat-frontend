'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PostImage } from '@/types';
import styles from './PostComposerForm.module.css';

const MAX_IMAGES = 5;

interface PostComposerFormProps {
    title: string;
    content: string;
    visibility: 'public' | 'private' | 'connections';
    selectedImages: File[];
    existingImages?: PostImage[];
    removedImageIds?: number[];
    loading?: boolean;
    submitLabel: string;
    onTitleChange: (value: string) => void;
    onContentChange: (value: string) => void;
    onVisibilityChange: (value: 'public' | 'private' | 'connections') => void;
    onAddImages: (files: File[]) => void;
    onRemoveSelectedImage: (index: number) => void;
    onToggleExistingImage: (imageId: number) => void;
    onSubmit: () => void;
}

export function PostComposerForm({
    title,
    content,
    visibility,
    selectedImages,
    existingImages = [],
    removedImageIds = [],
    loading = false,
    submitLabel,
    onTitleChange,
    onContentChange,
    onVisibilityChange,
    onAddImages,
    onRemoveSelectedImage,
    onToggleExistingImage,
    onSubmit,
}: PostComposerFormProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [newImageUrls, setNewImageUrls] = useState<string[]>([]);

    const existingVisibleCount = useMemo(
        () => existingImages.filter((image) => !removedImageIds.includes(image.id)).length,
        [existingImages, removedImageIds]
    );
    const currentCount = existingVisibleCount + selectedImages.length;
    const canAddMore = currentCount < MAX_IMAGES;
    const remainingSlots = MAX_IMAGES - currentCount;

    useEffect(() => {
        const urls = selectedImages.map((file) => URL.createObjectURL(file));
        setNewImageUrls(urls);
        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [selectedImages]);

    const openPicker = () => {
        if (!canAddMore) {
            window.alert(`You can upload up to ${MAX_IMAGES} images per post.`);
            return;
        }
        inputRef.current?.click();
    };

    const handlePick: React.ChangeEventHandler<HTMLInputElement> = (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const nextFiles = Array.from(files);
        if (nextFiles.length > remainingSlots) {
            window.alert(`You can select only ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'}.`);
            event.target.value = '';
            return;
        }

        onAddImages(nextFiles);
        event.target.value = '';
    };

    return (
        <section className={styles.wrap}>
            <label className={styles.label}>
                Title (optional)
                <input
                    type="text"
                    value={title}
                    onChange={(event) => onTitleChange(event.target.value)}
                    className={styles.input}
                    placeholder="Write a title"
                />
            </label>

            <label className={styles.label}>
                Content
                <textarea
                    value={content}
                    onChange={(event) => onContentChange(event.target.value)}
                    className={styles.textarea}
                    rows={8}
                    placeholder="Share your update"
                />
            </label>

            <label className={styles.label}>
                Visibility
                <select
                    value={visibility}
                    className={styles.select}
                    onChange={(event) => onVisibilityChange(event.target.value as 'public' | 'private' | 'connections')}
                >
                    <option value="public">Public</option>
                    <option value="connections">Connections</option>
                    <option value="private">Private</option>
                </select>
            </label>

            <div className={styles.mediaHeader}>
                <h3>Photos ({currentCount}/{MAX_IMAGES})</h3>
                <button type="button" className={styles.addBtn} onClick={openPicker} disabled={!canAddMore}>
                    Add Photos
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handlePick}
                />
            </div>

            {existingImages.length > 0 && (
                <div>
                    <p className={styles.sectionHint}>Existing images</p>
                    <div className={styles.mediaGrid}>
                        {existingImages.map((image) => {
                            const removed = removedImageIds.includes(image.id);
                            return (
                                <div key={image.id} className={`${styles.thumbCard} ${removed ? styles.removed : ''}`}>
                                    <img src={image.image} alt="Existing post media" className={styles.thumb} />
                                    <button type="button" className={styles.removeBtn} onClick={() => onToggleExistingImage(image.id)}>
                                        {removed ? 'Undo' : 'Remove'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {selectedImages.length > 0 && (
                <div>
                    <p className={styles.sectionHint}>New images</p>
                    <div className={styles.mediaGrid}>
                        {selectedImages.map((file, index) => (
                            <div key={`${file.name}-${index}`} className={styles.thumbCard}>
                                <img src={newImageUrls[index]} alt={file.name} className={styles.thumb} />
                                <button type="button" className={styles.removeBtn} onClick={() => onRemoveSelectedImage(index)}>
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className={styles.submitRow}>
                <button
                    type="button"
                    className={styles.submitBtn}
                    disabled={loading || !content.trim()}
                    onClick={onSubmit}
                >
                    {loading ? 'Saving...' : submitLabel}
                </button>
            </div>
        </section>
    );
}
