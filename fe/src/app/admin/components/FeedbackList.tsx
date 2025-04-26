// src/app/admin/components/FeedbackList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

// Define the FeedbackType enum to match the backend
type FeedbackType = "Court" | "Session";

// Update the Interface to match the backend's FeedbackDetailResponse
interface Feedback {
    FeedbackID: number;       // Renamed from id
    CustomerID: number;       // Renamed from user_id
    CustomerName: string | null; // New field, corresponds to username
    ON: FeedbackType;         // Renamed from category, different values
    Title: string | null;     // Renamed from subject
    Content: string | null;   // Renamed from message
    Rate: number | null;      // Renamed from rating
    TargetDetails: string | null; // New field (e.g., "Court 5")
    CourtID: number | null;    // Added field
    SessionID: number | null;  // Added field
    // submission_date is removed
    // is_resolved is removed
}

const FeedbackList: React.FC = () => {
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
        null
    );

    const { token } = useAuth();
    const api = createApiClient(token); // Creates API client with auth token

    useEffect(() => {
        fetchFeedback();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Fetch feedback on component mount

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            // Endpoint matches the backend router prefix and route
            const response = await api.get("/admin/feedback/");
            // Assume response.data is an array matching FeedbackDetailResponse[]
            setFeedback(response.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching feedback:", err);
            setError("Failed to load feedback. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFeedback = async (feedbackId: number) => {
        // Use FeedbackID
        if (window.confirm("Are you sure you want to delete this feedback?")) {
            try {
                // Endpoint matches the backend delete route
                await api.delete(`/admin/feedback/${feedbackId}`);
                // Refetch the list after successful deletion
                fetchFeedback();
            } catch (err) {
                console.error("Error deleting feedback:", err);
                alert("Failed to delete feedback. Please try again.");
            }
        }
    };

    // Selects feedback item for detailed view in modal
    const handleViewDetails = (feedbackItem: Feedback) => {
        setSelectedFeedback(feedbackItem);
    };

    // Renders star rating based on the 'Rate' field
    const renderStarRating = (rating: number | null) => {
        if (rating === null || rating === undefined) {
            return <span className={styles.notRated}>Not Rated</span>;
        }
        const stars = [];
        for (let i = 1; i <= rating; i++) {
            stars.push(
                <span>
                    ★
                </span>
            );
        }
        return <div className={styles.starRating}>{stars}</div>;
    };

    if (loading)
        return (
            <div className={styles.loadingIndicator}>Loading feedback...</div>
        );
    if (error) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.listContainer}>
            <div className={styles.listHeader}>
                <h2>User Feedback Management</h2>
                {/* Add button to refresh? */}
                {/* <button onClick={fetchFeedback} className={styles.refreshButton}>Refresh</button> */}
            </div>

            <table className={styles.dataTable}>
                <thead>
                    <tr>
                        <th>ID</th> {/* FeedbackID */}
                        <th>Customer</th> {/* CustomerName */}
                        <th>Type</th> {/* ON ('Court' or 'Session') */}
                        <th>Target</th> {/* TargetDetails */}
                        <th>Title</th> {/* Title */}
                        <th>Rating</th> {/* Rate */}
                        {/* Removed Date */}
                        {/* Removed Status */}
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {feedback.map((item) => (
                        // Use FeedbackID as key
                        <tr key={item.FeedbackID}>
                            <td>{item.FeedbackID}</td>
                            <td>{item.CustomerName ?? 'N/A'}</td> {/* Display CustomerName */}
                            <td>
                                {/* Display ON field */}
                                <span className={styles.categoryBadge}>
                                    {item.ON}
                                </span>
                            </td>
                            <td>{item.TargetDetails ?? 'N/A'}</td> {/* Display TargetDetails */}
                            <td>{item.Title ?? 'No Title'}</td> {/* Display Title */}
                            <td>{renderStarRating(item.Rate)}</td> {/* Use Rate field */}
                            {/* Removed Date column */}
                            {/* Removed Status column */}
                            <td>
                                <button
                                    className={styles.actionButton}
                                    onClick={() => handleViewDetails(item)}
                                >
                                    View Details
                                </button>
                                <button
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    // Pass FeedbackID to delete function
                                    onClick={() =>
                                        handleDeleteFeedback(item.FeedbackID)
                                    }
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {feedback.length === 0 && !loading && (
                <div className={styles.emptyMessage}>No feedback found.</div>
            )}

            {/* Feedback Details Modal - Updated Fields */}
            {selectedFeedback && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modal}>
                        <h3>Feedback Details (ID: {selectedFeedback.FeedbackID})</h3>
                        <div className={styles.feedbackDetails}>
                            <div className={styles.feedbackHeader}>
                                <div>
                                    <strong>From:</strong>{' '}
                                    {selectedFeedback.CustomerName ?? 'N/A'}
                                </div>
                                {/* Removed Date */}
                                <div>
                                    <strong>Type:</strong>{' '}
                                    {selectedFeedback.ON}
                                </div>
                                <div>
                                    <strong>Target:</strong>{' '}
                                    {selectedFeedback.TargetDetails ?? 'N/A'}
                                </div>
                                <div>
                                    <strong>Rating:</strong>{' '}
                                    {renderStarRating(selectedFeedback.Rate)}
                                </div>
                            </div>
                            <div className={styles.feedbackSubject}>
                                <strong>Title:</strong>{' '}
                                {selectedFeedback.Title ?? 'No Title'}
                            </div>
                            <div className={styles.feedbackMessage}>
                                <strong>Content:</strong>
                                <p style={{ whiteSpace: 'pre-wrap', marginTop: '5px' }}>
                                    {selectedFeedback.Content ?? 'No Content'}
                                </p>
                            </div>
                            {/* Optionally display CourtID/SessionID if needed */}
                            {/*
                            {selectedFeedback.CourtID && <div><strong>Court ID:</strong> {selectedFeedback.CourtID}</div>}
                            {selectedFeedback.SessionID && <div><strong>Session ID:</strong> {selectedFeedback.SessionID}</div>}
                            */}
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                onClick={() => setSelectedFeedback(null)}
                                className={styles.actionButton} // Optional: style close button
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackList;
