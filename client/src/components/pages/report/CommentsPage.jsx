// ReportCommentsPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';
import styles from './CommentsPage.module.css';
import API from '../../../API/API.js';

export default function CommentsPage({ user }) {
    const selectedReport = useSelector((state) => state.report.selected);
    const navigate = useNavigate();

    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        if(selectedReport)
            loadComments();
    }, [selectedReport]);

    const loadComments = async () => {
        try {
            const fetchedComments = await API.getInternalComments(selectedReport.id);
            const sortedComments = fetchedComments.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
            setComments(sortedComments);
        } catch (err) {
            console.error("Error loading comments:", err);
        }
    }

    const handleSubmit = async () => {
        if (newComment.trim() && user?.username) {
            try {
                await API.addInternalComment(selectedReport.id, newComment);
                await loadComments(); 
                setNewComment('');
            } catch (err) {
                console.error("Error adding comment:", err);
            }
        }
    };

    const formatDate = (date) => {
        return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        }).format(date);
    };

    if (!selectedReport) {
        return null; // Non renderizzare nulla mentre si naviga indietro
    }

    return (
        <div className={styles.container}>
        <div className={styles.contentWrapper}>
            {/* Header Card */}
            <div className={styles.headerCard}>
                <h1 className={styles.title}>{selectedReport.title}</h1>
                <p className={styles.subtitle}>View and add comments to the company report</p>
                <button className={styles.backButton} onClick={() => navigate(-1)}>
                    Back
                </button>
            </div>

            {/* New Comment Form */}
            <div className={styles.card}>
            <h2 className={styles.sectionTitle}>Add a Comment</h2>
            
            <div className={styles.formGroup}>
                <label className={styles.label}>Author Name</label>
                <span>{user?.username}</span>
            </div>
            
            <div className={styles.formGroup}>
                <label className={styles.label}>Comment</label>
                <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write your comment..."
                className={styles.textarea}
                />
            </div>
            
            <button
                onClick={handleSubmit}
                disabled={!newComment.trim()}
                className={styles.primaryButton}
            >
                Publish Comment
            </button>
            </div>

            {/* Comments List */}
            <div className={styles.card}>
            <h2 className={styles.sectionTitle}>
                All Comments ({comments.length})
            </h2>
            
            <div className={styles.commentsList}>
                {comments.length === 0 ? (
                <div className={styles.noComments}>
                    <p>No comments yet. Be the first to comment!</p>
                </div>
                ) : (
                comments.map((comment) => (
                    <div key={comment.id} className={styles.commentItem}>
                    <div className={styles.commentHeader}>
                        <div className={styles.authorInfo}>
                        <div className={styles.authorAvatar}>
                            {comment.sender.username.charAt(0).toUpperCase()}
                        </div>
                        <span className={styles.authorName}>
                            {comment.sender.username}
                        </span>
                        </div>
                    </div>
                    
                    <p className={styles.commentText}>
                        {comment.content}
                    </p>
                    
                    <div className={styles.commentDate}>
                        {formatDate(new Date(comment.created_at))}
                    </div>
                    </div>
                ))
                )}
            </div>
            </div>
        </div>
        </div>
    );
}