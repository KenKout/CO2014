// src/app/admin/components/FeedbackList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

interface Feedback {
	id: number;
	user_id: number;
	username: string;
	category:
		| "general"
		| "facilities"
		| "staff"
		| "classes"
		| "equipment"
		| "other";
	subject: string;
	message: string;
	rating: number;
	submission_date: string;
	is_resolved: boolean;
}

const FeedbackList: React.FC = () => {
	const [feedback, setFeedback] = useState<Feedback[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
		null
	);

	// Get token from your auth context or localStorage
	const { token } = useAuth();
	const api = createApiClient(token);

	useEffect(() => {
		fetchFeedback();
	}, []);

	const fetchFeedback = async () => {
		setLoading(true);
		try {
			const response = await api.get("/admin/feedback/");
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
		if (window.confirm("Are you sure you want to delete this feedback?")) {
			try {
				await api.delete(`/admin/feedback/${feedbackId}`);
				fetchFeedback();
			} catch (err) {
				console.error("Error deleting feedback:", err);
				alert("Failed to delete feedback. Please try again.");
			}
		}
	};

	const handleViewDetails = (feedback: Feedback) => {
		setSelectedFeedback(feedback);
	};

	const renderStarRating = (rating: number) => {
		const stars = [];
		for (let i = 1; i <= 5; i++) {
			stars.push(
				<span
					key={i}
					className={
						i <= rating ? styles.starFilled : styles.starEmpty
					}
				>
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
			</div>

			<table className={styles.dataTable}>
				<thead>
					<tr>
						<th>ID</th>
						<th>User</th>
						<th>Category</th>
						<th>Subject</th>
						<th>Rating</th>
						<th>Date</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{feedback.map((item) => (
						<tr key={item.id}>
							<td>{item.id}</td>
							<td>{item.username}</td>
							<td>
								<span className={styles.categoryBadge}>
									{item.category.charAt(0).toUpperCase() +
										item.category.slice(1)}
								</span>
							</td>
							<td>{item.subject}</td>
							<td>{renderStarRating(item.rating)}</td>
							<td>
								{new Date(
									item.submission_date
								).toLocaleDateString()}
							</td>
							<td>
								<span
									className={
										item.is_resolved
											? styles.statusResolved
											: styles.statusPending
									}
								>
									{item.is_resolved ? "Resolved" : "Pending"}
								</span>
							</td>
							<td>
								<button
									className={styles.actionButton}
									onClick={() => handleViewDetails(item)}
								>
									View Details
								</button>
								<button
									className={`${styles.actionButton} ${styles.deleteButton}`}
									onClick={() =>
										handleDeleteFeedback(item.id)
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

			{/* Feedback Details Modal */}
			{selectedFeedback && (
				<div className={styles.modalBackdrop}>
					<div className={styles.modal}>
						<h3>Feedback Details</h3>
						<div className={styles.feedbackDetails}>
							<div className={styles.feedbackHeader}>
								<div>
									<strong>From:</strong>{" "}
									{selectedFeedback.username}
								</div>
								<div>
									<strong>Date:</strong>{" "}
									{new Date(
										selectedFeedback.submission_date
									).toLocaleString()}
								</div>
								<div>
									<strong>Category:</strong>{" "}
									{selectedFeedback.category
										.charAt(0)
										.toUpperCase() +
										selectedFeedback.category.slice(1)}
								</div>
								<div>
									<strong>Rating:</strong>{" "}
									{renderStarRating(selectedFeedback.rating)}
								</div>
							</div>
							<div className={styles.feedbackSubject}>
								<strong>Subject:</strong>{" "}
								{selectedFeedback.subject}
							</div>
							<div className={styles.feedbackMessage}>
								{selectedFeedback.message}
							</div>
						</div>
						<div className={styles.modalActions}>
							<button
								type="button"
								onClick={() => setSelectedFeedback(null)}
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
