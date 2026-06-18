'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PostCard } from '@/components/posts/PostCard';
import { PostCommentThread } from '@/components/posts/PostCommentThread';
import { ShareToChatModal } from '@/components/posts/ShareToChatModal';
import { UserAvatar } from '@/components/social/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';
import { postApi } from '@/lib/posts';
import { Post, PostComment } from '@/types';
import styles from './page.module.css';

function insertReply(comments: PostComment[], parentId: number, reply: PostComment): PostComment[] {
    return comments.map((comment) => {
        if (comment.id === parentId) {
            return { ...comment, replies: [...(comment.replies || []), reply] };
        }
        if (!comment.replies?.length) return comment;
        return { ...comment, replies: insertReply(comment.replies, parentId, reply) };
    });
}

function updateCommentNode(comments: PostComment[], targetId: number, content: string): PostComment[] {
    return comments.map((comment) => {
        if (comment.id === targetId) {
            return { ...comment, content, updated_at: new Date().toISOString() };
        }
        if (!comment.replies?.length) return comment;
        return { ...comment, replies: updateCommentNode(comment.replies, targetId, content) };
    });
}

function removeCommentNode(comments: PostComment[], targetId: number): PostComment[] {
    return comments
        .filter((comment) => comment.id !== targetId)
        .map((comment) => ({
            ...comment,
            replies: comment.replies?.length ? removeCommentNode(comment.replies, targetId) : [],
        }));
}

export default function PostDetailsPage() {
    const params = useParams();
    const postId = Number(Array.isArray(params?.id) ? params.id[0] : params?.id);
    const commentCacheKey = useMemo(() => (Number.isNaN(postId) ? '' : `post_comments_${postId}`), [postId]);

    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<PostComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentsLoading, setCommentsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [commentInput, setCommentInput] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [actionInfo, setActionInfo] = useState<string | null>(null);
    const [sharingPost, setSharingPost] = useState<Post | null>(null);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [previewZoom, setPreviewZoom] = useState(1);

    const previewImage = previewImages[previewIndex] || null;

    const hydrateCommentsCache = useCallback(() => {
        if (!commentCacheKey || typeof window === 'undefined') return;
        try {
            const raw = window.sessionStorage.getItem(commentCacheKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as PostComment[];
            if (Array.isArray(parsed)) {
                setComments(parsed);
                setCommentsLoading(false);
            }
        } catch {
            // ignore cache read errors
        }
    }, [commentCacheKey]);

    const persistCommentsCache = useCallback(
        (nextComments: PostComment[]) => {
            if (!commentCacheKey || typeof window === 'undefined') return;
            try {
                window.sessionStorage.setItem(commentCacheKey, JSON.stringify(nextComments));
            } catch {
                // ignore cache write errors
            }
        },
        [commentCacheKey]
    );

    const loadPost = useCallback(async () => {
        if (Number.isNaN(postId)) return;
        setLoading(true);
        setError(null);
        try {
            const data = await postApi.getById(postId);
            setPost(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load post');
        } finally {
            setLoading(false);
        }
    }, [postId]);

    const loadComments = useCallback(async () => {
        if (Number.isNaN(postId)) return;
        setCommentsLoading(true);
        try {
            const list = await postApi.listComments(postId);
            setComments(list);
            persistCommentsCache(list);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load comments');
        } finally {
            setCommentsLoading(false);
        }
    }, [postId, persistCommentsCache]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
            return;
        }
        if (!user || Number.isNaN(postId)) return;
        hydrateCommentsCache();
        loadPost();
        loadComments();
    }, [authLoading, user, postId, router, hydrateCommentsCache, loadPost, loadComments]);

    useEffect(() => {
        if (!previewImage || typeof document === 'undefined') return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPreviewImages([]);
                setPreviewIndex(0);
                setPreviewZoom(1);
                return;
            }
            if (event.key === 'ArrowRight') {
                setPreviewIndex((prev) => (prev + 1) % previewImages.length);
                setPreviewZoom(1);
                return;
            }
            if (event.key === 'ArrowLeft') {
                setPreviewIndex((prev) => (prev - 1 + previewImages.length) % previewImages.length);
                setPreviewZoom(1);
                return;
            }
            if (event.key === '+' || event.key === '=') {
                setPreviewZoom((prev) => Math.min(3, prev + 0.25));
                return;
            }
            if (event.key === '-') {
                setPreviewZoom((prev) => Math.max(1, prev - 0.25));
            }
        };
        window.addEventListener('keydown', onEsc);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', onEsc);
        };
    }, [previewImage, previewImages.length]);

    const closePreview = () => {
        setPreviewImages([]);
        setPreviewIndex(0);
        setPreviewZoom(1);
    };

    const openPreview = (imageUrl: string, imageIndex: number, images: string[]) => {
        const normalized = images?.length ? images : [imageUrl];
        setPreviewImages(normalized);
        setPreviewIndex(Math.max(0, Math.min(imageIndex, normalized.length - 1)));
        setPreviewZoom(1);
    };

    const goNextPreview = () => {
        setPreviewIndex((prev) => (prev + 1) % previewImages.length);
        setPreviewZoom(1);
    };

    const goPrevPreview = () => {
        setPreviewIndex((prev) => (prev - 1 + previewImages.length) % previewImages.length);
        setPreviewZoom(1);
    };

    const zoomInPreview = () => setPreviewZoom((prev) => Math.min(3, prev + 0.25));
    const zoomOutPreview = () => setPreviewZoom((prev) => Math.max(1, prev - 0.25));
    const resetZoomPreview = () => setPreviewZoom(1);

    const submitComment = async () => {
        const value = commentInput.trim();
        if (!value || Number.isNaN(postId)) return;
        setSubmittingComment(true);
        setActionInfo('Posting comment...');
        try {
            const created = await postApi.createComment(postId, value, null);
            const nextComments = [...comments, created];
            setComments(nextComments);
            persistCommentsCache(nextComments);
            setCommentInput('');
            setPost((prev) => (prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to post comment');
        } finally {
            setSubmittingComment(false);
            setActionInfo(null);
        }
    };

    const replyComment = async (parentId: number, content: string) => {
        if (Number.isNaN(postId)) return;
        setActionInfo('Posting reply...');
        try {
            const created = await postApi.createComment(postId, content, parentId);
            const nextComments = insertReply(comments, parentId, created);
            setComments(nextComments);
            persistCommentsCache(nextComments);
            setPost((prev) => (prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev));
        } finally {
            setActionInfo(null);
        }
    };

    const updateComment = async (commentId: number, content: string) => {
        if (Number.isNaN(postId)) return;
        setActionInfo('Updating comment...');
        try {
            await postApi.updateComment(postId, commentId, content);
            const nextComments = updateCommentNode(comments, commentId, content);
            setComments(nextComments);
            persistCommentsCache(nextComments);
        } finally {
            setActionInfo(null);
        }
    };

    const deleteComment = async (commentId: number) => {
        if (Number.isNaN(postId)) return;
        setActionInfo('Deleting comment...');
        try {
            const result = await postApi.deleteComment(postId, commentId);
            const nextComments = removeCommentNode(comments, commentId);
            setComments(nextComments);
            persistCommentsCache(nextComments);
            setPost((prev) =>
                prev
                    ? {
                        ...prev,
                        comment_count: Math.max(0, (prev.comment_count || 0) - Math.max(1, result.deleted_count || 1)),
                    }
                    : prev
            );
        } finally {
            setActionInfo(null);
        }
    };

    const likePost = async (target: Post) => {
        const result = await postApi.toggleLike(target.id);
        setPost((prev) => (prev ? { ...prev, is_liked: result.liked, like_count: result.like_count } : prev));
    };

    const postCreatedAt = post?.created_at ? new Date(post.created_at) : null;
    const postDateLabel = postCreatedAt && !Number.isNaN(postCreatedAt.getTime())
        ? postCreatedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Recently';

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
                        <span aria-hidden="true">‹</span>
                        Back
                    </button>
                    <div>
                        <p className={styles.eyebrow}>Community Post</p>
                        <h1 className={styles.title}>Post Details</h1>
                    </div>
                </section>

                {error && <p className={styles.errorBox}>{error}</p>}
                {actionInfo && <p className={styles.infoBox}>{actionInfo}</p>}

                {loading ? (
                    <section className={styles.loadingArea}>
                        <div className="spinner"></div>
                    </section>
                ) : !post ? (
                    <section className={styles.errorBox}>Post not found.</section>
                ) : (
                    <div className={styles.detailLayout}>
                        <div className={styles.contentColumn}>
                            <section className={styles.postShell}>
                                <PostCard
                                    post={post}
                                    fullAspectImage
                                    showAllImages
                                    onImageClick={openPreview}
                                    onLike={likePost}
                                    onShare={setSharingPost}
                                    showFooterActions
                                    showOwnerActions={post.author.id === user.id}
                                    onEdit={() => router.push(`/posts/${post.id}/edit`)}
                                    onDelete={async () => {
                                        const ok = window.confirm('Delete this post?');
                                        if (!ok) return;
                                        await postApi.delete(post.id);
                                        router.push('/posts/my');
                                    }}
                                />
                            </section>

                            <section className={styles.commentsSection}>
                                <header className={styles.commentsHeader}>
                                    <div>
                                        <p className={styles.sectionEyebrow}>Discussion</p>
                                        <h2>Comments</h2>
                                    </div>
                                    <span>{post.comment_count || comments.length}</span>
                                </header>

                                <div className={styles.commentComposer}>
                                    <UserAvatar user={user} size={38} />
                                    <textarea
                                        value={commentInput}
                                        onChange={(event) => setCommentInput(event.target.value)}
                                        placeholder="Write a thoughtful comment"
                                        rows={3}
                                        className={styles.commentInput}
                                    />
                                    <button type="button" className={styles.commentSendBtn} disabled={submittingComment || !commentInput.trim()} onClick={submitComment}>
                                        {submittingComment ? '...' : 'Send'}
                                    </button>
                                </div>

                                {commentsLoading ? (
                                    <div className={styles.loadingComments}>Loading comments...</div>
                                ) : (
                                    <PostCommentThread
                                        comments={comments}
                                        currentUser={user}
                                        onReply={replyComment}
                                        onUpdate={updateComment}
                                        onDelete={deleteComment}
                                    />
                                )}
                            </section>
                        </div>

                        <aside className={styles.sidePanel}>
                            <div className={styles.authorCard}>
                                <UserAvatar user={post.author} size={54} />
                                <div>
                                    <span>Posted by</span>
                                    <strong>{post.author.username}</strong>
                                    <p>{post.author.user_type}</p>
                                </div>
                            </div>
                            <div className={styles.metricGrid}>
                                <div>
                                    <span>Likes</span>
                                    <strong>{post.like_count || 0}</strong>
                                </div>
                                <div>
                                    <span>Comments</span>
                                    <strong>{post.comment_count || comments.length}</strong>
                                </div>
                                <div>
                                    <span>Visibility</span>
                                    <strong>{post.visibility || 'public'}</strong>
                                </div>
                                <div>
                                    <span>Date</span>
                                    <strong>{postDateLabel}</strong>
                                </div>
                            </div>
                            <button type="button" className={styles.shareBtn} onClick={() => setSharingPost(post)}>
                                Share to Chat
                            </button>
                        </aside>
                    </div>
                )}
            </main>

            <ShareToChatModal post={sharingPost} isOpen={!!sharingPost} onClose={() => setSharingPost(null)} />
            {previewImage && (
                <div className={styles.imageLightbox} onClick={closePreview}>
                    <button
                        type="button"
                        className={styles.lightboxClose}
                        onClick={closePreview}
                        aria-label="Close image preview"
                    >
                        ×
                    </button>
                    {previewImages.length > 1 && (
                        <>
                            <button type="button" className={`${styles.lightboxNavBtn} ${styles.lightboxNavPrev}`} onClick={(event) => { event.stopPropagation(); goPrevPreview(); }} aria-label="Previous image">
                                ‹
                            </button>
                            <button type="button" className={`${styles.lightboxNavBtn} ${styles.lightboxNavNext}`} onClick={(event) => { event.stopPropagation(); goNextPreview(); }} aria-label="Next image">
                                ›
                            </button>
                        </>
                    )}
                    <div className={styles.lightboxToolbar} onClick={(event) => event.stopPropagation()}>
                        <button type="button" className={styles.lightboxToolBtn} onClick={zoomOutPreview} aria-label="Zoom out">−</button>
                        <button type="button" className={styles.lightboxToolBtn} onClick={resetZoomPreview} aria-label="Reset zoom">
                            {Math.round(previewZoom * 100)}%
                        </button>
                        <button type="button" className={styles.lightboxToolBtn} onClick={zoomInPreview} aria-label="Zoom in">+</button>
                    </div>
                    <img
                        src={previewImage}
                        alt="Post image preview"
                        className={styles.lightboxImage}
                        style={{ transform: `scale(${previewZoom})` }}
                        onClick={(event) => event.stopPropagation()}
                    />
                    {previewImages.length > 1 && (
                        <div className={styles.lightboxCounter} onClick={(event) => event.stopPropagation()}>
                            {previewIndex + 1} / {previewImages.length}
                        </div>
                    )}
                </div>
            )}
        </DashboardLayout>
    );
}
