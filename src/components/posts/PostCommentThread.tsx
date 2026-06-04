'use client';

import { useMemo, useState } from 'react';
import { PostComment, User } from '@/types';
import { UserAvatar } from '@/components/social/UserAvatar';
import styles from './PostCommentThread.module.css';

interface PostCommentThreadProps {
    comments: PostComment[];
    currentUser: User;
    onReply: (parentId: number, content: string) => Promise<void>;
    onUpdate: (commentId: number, content: string) => Promise<void>;
    onDelete: (commentId: number) => Promise<void>;
}

export function PostCommentThread({ comments, currentUser, onReply, onUpdate, onDelete }: PostCommentThreadProps) {
    return (
        <div className={styles.listWrap}>
            {comments.length === 0 ? (
                <p className={styles.emptyText}>No comments yet.</p>
            ) : (
                comments.map((comment) => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                        currentUser={currentUser}
                        onReply={onReply}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        depth={0}
                    />
                ))
            )}
        </div>
    );
}

function friendlyTime(value: string): string {
    const then = new Date(value);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - then.getTime());
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return 'now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d`;
    return `${Math.floor(day / 7)}w`;
}

function CommentItem({
    comment,
    currentUser,
    onReply,
    onUpdate,
    onDelete,
    depth,
}: {
    comment: PostComment;
    currentUser: User;
    onReply: (parentId: number, content: string) => Promise<void>;
    onUpdate: (commentId: number, content: string) => Promise<void>;
    onDelete: (commentId: number) => Promise<void>;
    depth: number;
}) {
    const [showReplyBox, setShowReplyBox] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.content);
    const [isUpdating, setIsUpdating] = useState(false);

    const [isDeleting, setIsDeleting] = useState(false);
    const [showActionMenu, setShowActionMenu] = useState(false);

    const canModify = currentUser.id === comment.author.id;
    const formattedDate = useMemo(() => friendlyTime(comment.created_at), [comment.created_at]);

    const handleReply = async () => {
        const value = replyText.trim();
        if (!value) return;
        setIsReplying(true);
        try {
            await onReply(comment.id, value);
            setReplyText('');
            setShowReplyBox(false);
        } finally {
            setIsReplying(false);
        }
    };

    const handleUpdate = async () => {
        const value = editText.trim();
        if (!value) return;
        setIsUpdating(true);
        try {
            await onUpdate(comment.id, value);
            setIsEditing(false);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        const ok = window.confirm('Delete this comment?');
        if (!ok) return;
        setIsDeleting(true);
        try {
            await onDelete(comment.id);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className={styles.itemWrap} style={{ marginLeft: depth > 0 ? `${Math.min(depth * 14, 42)}px` : '0px' }}>
            <div className={styles.itemHeader}>
                <UserAvatar user={comment.author} size={20} />
                <div className={styles.metaCol}>
                    <span className={styles.authorName}>{comment.author.username}</span>
                    <span className={styles.timeText}>{formattedDate}</span>
                </div>
                {canModify && !isEditing && (
                    <div className={styles.actionMenuWrap}>
                        <button
                            type="button"
                            className={styles.moreBtn}
                            onClick={() => setShowActionMenu((prev) => !prev)}
                        >
                            ...
                        </button>
                        {showActionMenu && (
                            <div className={styles.actionMenu}>
                                <button
                                    type="button"
                                    className={styles.actionMenuBtn}
                                    onClick={() => {
                                        setShowActionMenu(false);
                                        setIsEditing(true);
                                    }}
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.actionMenuBtn} ${styles.actionDanger}`}
                                    disabled={isDeleting}
                                    onClick={async () => {
                                        setShowActionMenu(false);
                                        await handleDelete();
                                    }}
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isEditing ? (
                <div className={styles.inlineEditor}>
                    <textarea
                        className={styles.inlineInput}
                        value={editText}
                        onChange={(event) => setEditText(event.target.value)}
                        rows={3}
                    />
                    <div className={styles.inlineActions}>
                        <button type="button" className={styles.secondaryBtn} onClick={() => setIsEditing(false)}>
                            Cancel
                        </button>
                        <button type="button" className={styles.primaryBtn} disabled={isUpdating} onClick={handleUpdate}>
                            {isUpdating ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            ) : (
                <p className={styles.commentText}>
                    {comment.content}
                    <button type="button" className={styles.replyInlineBtn} onClick={() => setShowReplyBox((prev) => !prev)}>
                        Reply
                    </button>
                </p>
            )}

            {showReplyBox && (
                <div className={styles.replyBox}>
                    <div className={styles.replyingRow}>
                        <span className={styles.replyingLabel}>Replying to {comment.author.username}</span>
                        <button type="button" className={styles.replyCancelInline} onClick={() => setShowReplyBox(false)}>
                            x
                        </button>
                    </div>
                    <textarea
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        rows={2}
                        className={styles.inlineInput}
                        placeholder="Write a reply"
                    />
                    <div className={styles.inlineActions}>
                        <button type="button" className={styles.primaryBtn} disabled={isReplying} onClick={handleReply}>
                            {isReplying ? 'Replying...' : 'Send Reply'}
                        </button>
                    </div>
                </div>
            )}

            {comment.replies?.length > 0 && (
                <div className={styles.replyList}>
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            currentUser={currentUser}
                            onReply={onReply}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
