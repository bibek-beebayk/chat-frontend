import React from 'react';
import { Post } from '@/types';
import styles from './FeedItem.module.css';

interface FeedItemProps {
    post: Post;
    compact?: boolean;
}

export const FeedItem: React.FC<FeedItemProps> = ({ post, compact = false }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);

    const stripTags = (html: string) => {
        return html.replace(/<[^>]*>?/gm, '') || '';
    };

    const hasMedia = !!(post.image || post.video);
    // Strip tags to check length of actual text
    const plainText = stripTags(post.content);
    const shouldTruncate = hasMedia && plainText.length > 150;

    return (
        <article className={`${styles.post} ${compact ? styles.compact : ''}`}>
            <div className={styles.postHeader}>
                <div className={styles.postMeta}>
                    <span className={styles.postDate}>
                        {new Date(post.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </span>
                </div>
            </div>

            <div className={styles.postBody}>
                {post.link ? (
                    <a href={post.link} target="_blank" rel="noopener noreferrer" className={styles.postTitleLink}>
                        <h2 className={styles.postTitle}>{post.title} ↗</h2>
                    </a>
                ) : (
                    <h2 className={styles.postTitle}>{post.title}</h2>
                )}

                {post.content && (
                    <div className={styles.postContent}>
                        {shouldTruncate && !isExpanded ? (
                            <p>
                                {plainText.slice(0, 150)}...
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className={styles.seeMoreBtn}
                                >
                                    See more
                                </button>
                            </p>
                        ) : (
                            <>
                                <div dangerouslySetInnerHTML={{ __html: post.content }} />
                                {shouldTruncate && (
                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className={styles.seeMoreBtn}
                                    >
                                        See less
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {post.image && (
                <div className={styles.postMedia}>
                    <img src={post.image} alt={post.title} loading="lazy" />
                </div>
            )}

            {post.video && (
                <div className={styles.postMedia}>
                    <video controls>
                        <source src={post.video} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </div>
            )}
        </article>
    );
};
