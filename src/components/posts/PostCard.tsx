'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Post } from '@/types';
import { UserAvatar } from '@/components/social/UserAvatar';
import { parsePostSharePayload } from '@/lib/posts';
import styles from './PostCard.module.css';

interface PostCardProps {
    post: Post;
    compact?: boolean;
    fullAspectImage?: boolean;
    showAllImages?: boolean;
    onImageClick?: (imageUrl: string, imageIndex: number, images: string[]) => void;
    truncateContent?: boolean;
    truncateAt?: number;
    onLike?: (post: Post) => void;
    onShare?: (post: Post) => void;
    onEdit?: (post: Post) => void;
    onDelete?: (post: Post) => void;
    showOwnerActions?: boolean;
    showFooterActions?: boolean;
}

function stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '').trim();
}

function PostMediaImage({
    src,
    alt,
    className,
    loading,
}: {
    src: string;
    alt: string;
    className: string;
    loading?: 'eager' | 'lazy';
}) {
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const mountedAtRef = useRef<number>(Date.now());
    const settleTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (settleTimeoutRef.current !== null) {
                window.clearTimeout(settleTimeoutRef.current);
            }
        };
    }, []);

    const markLoaded = () => {
        const elapsed = Date.now() - mountedAtRef.current;
        const minVisibleMs = 220;
        const wait = Math.max(0, minVisibleMs - elapsed);
        settleTimeoutRef.current = window.setTimeout(() => {
            setLoaded(true);
            settleTimeoutRef.current = null;
        }, wait);
    };

    return (
        <div className={styles.imageFrame}>
            {!loaded && !failed && (
                <div className={styles.imageLoading} aria-hidden="true">
                    <span className={styles.imageSpinner} />
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={`${className} ${loaded || failed ? styles.imageVisible : styles.imageHidden}`}
                loading={loading}
                onLoad={markLoaded}
                onError={() => setFailed(true)}
            />
        </div>
    );
}

export function PostCard({
    post,
    compact = false,
    fullAspectImage = false,
    showAllImages = false,
    onImageClick,
    truncateContent = false,
    truncateAt = 320,
    onLike,
    onShare,
    onEdit,
    onDelete,
    showOwnerActions = false,
    showFooterActions = true,
}: PostCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const plainContent = stripHtml(post.content || '');
    const contentPreview = compact && plainContent.length > 180 ? `${plainContent.slice(0, 180)}...` : plainContent;
    const shouldTruncate = useMemo(
        () => truncateContent && plainContent.length > truncateAt,
        [plainContent.length, truncateAt, truncateContent]
    );
    const truncatedText = useMemo(
        () => `${plainContent.slice(0, truncateAt).trimEnd()}...`,
        [plainContent, truncateAt]
    );
    const allImages = useMemo(() => {
        const imageList = (post.images || []).map((item) => item.image).filter(Boolean);
        if (imageList.length > 0) return imageList;
        return post.image ? [post.image] : [];
    }, [post.image, post.images]);
    const firstImage = allImages[0] || null;
    const imageCount = allImages.length;
    const createdAt = new Date(post.created_at);
    const sharePayload = parsePostSharePayload(post.content || '');

    if (sharePayload) {
        return null;
    }

    return (
        <article className={`${styles.card} ${compact ? styles.compact : ''} ${fullAspectImage ? styles.fullAspect : ''}`}>
            <header className={styles.header}>
                <div className={styles.authorBlock}>
                    <UserAvatar user={post.author} size={38} />
                    <div>
                        <Link href={`/users/${post.author.id}`} className={styles.authorName}>
                            {post.author.username}
                        </Link>
                        <p className={styles.metaText}>
                            {createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                {showOwnerActions && (
                    <div className={styles.ownerActions}>
                        {onEdit && (
                            <button type="button" className={styles.ghostBtn} onClick={() => onEdit(post)}>
                                Edit
                            </button>
                        )}
                        {onDelete && (
                            <button type="button" className={styles.dangerBtn} onClick={() => onDelete(post)}>
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </header>

            {post.title && <h3 className={styles.title}>{post.title}</h3>}

            {contentPreview && (
                shouldTruncate && !isExpanded ? (
                    <div className={styles.content}>
                        {truncatedText}
                        <button type="button" className={styles.expandBtn} onClick={() => setIsExpanded(true)}>
                            See full content
                        </button>
                    </div>
                ) : (
                    <div className={styles.content}>
                        <div dangerouslySetInnerHTML={{ __html: compact ? contentPreview : post.content }} />
                        {shouldTruncate && (
                            <button type="button" className={styles.expandBtn} onClick={() => setIsExpanded(false)}>
                                Show less
                            </button>
                        )}
                    </div>
                )
            )}

            {showAllImages && imageCount > 1 ? (
                <div className={styles.galleryWrap}>
                    <div className={styles.galleryTrack}>
                        {allImages.map((image, index) => (
                            onImageClick ? (
                                <button
                                    key={`${post.id}-img-${index}`}
                                    type="button"
                                    className={`${styles.gallerySlide} ${styles.gallerySlideButton}`}
                                    onClick={() => onImageClick(image, index, allImages)}
                                >
                                    <PostMediaImage
                                        src={image}
                                        alt={`${post.title || 'Post image'} ${index + 1}`}
                                        className={styles.image}
                                        loading={index === 0 ? 'eager' : 'lazy'}
                                    />
                                </button>
                            ) : (
                                <Link key={`${post.id}-img-${index}`} href={`/posts/${post.id}`} className={styles.gallerySlide}>
                                    <PostMediaImage
                                        src={image}
                                        alt={`${post.title || 'Post image'} ${index + 1}`}
                                        className={styles.image}
                                        loading={index === 0 ? 'eager' : 'lazy'}
                                    />
                                </Link>
                            )
                        ))}
                    </div>
                </div>
            ) : firstImage && (
                onImageClick ? (
                    <button
                        type="button"
                        className={`${styles.imageWrap} ${styles.imageAction}`}
                        onClick={() => onImageClick(firstImage, 0, allImages)}
                    >
                        <PostMediaImage src={firstImage} alt={post.title || 'Post image'} className={styles.image} loading="lazy" />
                        {imageCount > 1 && <span className={styles.imageCount}>+{imageCount - 1}</span>}
                    </button>
                ) : (
                    <Link href={`/posts/${post.id}`} className={styles.imageWrap}>
                        <PostMediaImage src={firstImage} alt={post.title || 'Post image'} className={styles.image} loading="lazy" />
                        {imageCount > 1 && <span className={styles.imageCount}>+{imageCount - 1}</span>}
                    </Link>
                )
            )}

            {!firstImage && post.video && (
                <div className={styles.videoWrap}>
                    <video controls className={styles.video}>
                        <source src={post.video} />
                    </video>
                </div>
            )}

            {showFooterActions && (
                <footer className={styles.footer}>
                    <button
                        type="button"
                        className={`${styles.actionBtn} ${post.is_liked ? styles.likedAction : ''}`}
                        onClick={() => onLike?.(post)}
                        aria-label={post.is_liked ? 'Unlike post' : 'Like post'}
                    >
                        {post.is_liked ? <LikedIcon /> : <LikeIcon />}
                        <span className={styles.actionCount}>{post.like_count || 0}</span>
                    </button>
                    <Link href={`/posts/${post.id}`} className={styles.actionBtn} aria-label="View comments">
                        <CommentIcon />
                        <span className={styles.actionCount}>{post.comment_count || 0}</span>
                    </Link>
                    <button type="button" className={styles.actionBtn} onClick={() => onShare?.(post)} aria-label="Share post to chat">
                        <ShareIcon />
                    </button>
                </footer>
            )}
        </article>
    );
}

function LikeIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.actionIcon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-7-4.35-9.5-8.19C.73 10.15 2.1 6.5 5.4 5.67c2.26-.57 4.12.45 5.1 1.74.98-1.29 2.84-2.31 5.1-1.74 3.3.83 4.67 4.48 2.9 7.14C19 16.65 12 21 12 21Z" />
        </svg>
    );
}

function LikedIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.actionIcon} fill="currentColor" aria-hidden="true">
            <path d="M12 21s-7-4.35-9.5-8.19C.73 10.15 2.1 6.5 5.4 5.67c2.26-.57 4.12.45 5.1 1.74.98-1.29 2.84-2.31 5.1-1.74 3.3.83 4.67 4.48 2.9 7.14C19 16.65 12 21 12 21Z" />
        </svg>
    );
}

function CommentIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.actionIcon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
    );
}

function ShareIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.actionIcon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
        </svg>
    );
}
