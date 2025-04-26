// src/app/admin/components/EnrollmentList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

interface Enrollment {
	id: number;
	user_id: number;
	username: string;
	session_id: number;
	session_title: string;
	enrollment_date: string;
	status: "active" | "completed" | "cancelled";
}

const EnrollmentList: React.FC = () => {
	const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [newEnrollment, setNewEnrollment] = useState({
		user_id: "",
		session_id: "",
	});

	// Get token from your auth context or localStorage
	const { token } = useAuth();
	const api = createApiClient(token);

	useEffect(() => {
		fetchEnrollments();
	}, []);

	const fetchEnrollments = async () => {
		setLoading(true);
		try {
			const response = await api.get("/admin/enrollments/");
			setEnrollments(response.data);
			setError(null);
		} catch (err) {
			console.error("Error fetching enrollments:", err);
			setError("Failed to load enrollments. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleCreateEnrollment = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await api.post("/admin/enrollments/", {
				user_id: parseInt(newEnrollment.user_id),
				session_id: parseInt(newEnrollment.session_id),
			});
			setShowAddModal(false);
			setNewEnrollment({
				user_id: "",
				session_id: "",
			});
			fetchEnrollments();
		} catch (err) {
			console.error("Error creating enrollment:", err);
			alert("Failed to create enrollment. Please try again.");
		}
	};

	const handleDeleteEnrollment = async (enrollmentId: number) => {
		if (
			window.confirm("Are you sure you want to delete this enrollment?")
		) {
			try {
				await api.delete(`/admin/enrollments/`, {
					data: { enrollment_id: enrollmentId },
				});
				fetchEnrollments();
			} catch (err) {
				console.error("Error deleting enrollment:", err);
				alert("Failed to delete enrollment. Please try again.");
			}
		}
	};

	if (loading)
		return (
			<div className={styles.loadingIndicator}>
				Loading enrollments...
			</div>
		);
	if (error) return <div className={styles.error}>{error}</div>;

	return (
		<div className={styles.listContainer}>
			<div className={styles.listHeader}>
				<h2>Enrollment Management</h2>
				<button
					className={styles.addButton}
					onClick={() => setShowAddModal(true)}
				>
					Add New Enrollment
				</button>
			</div>

			<table className={styles.dataTable}>
				<thead>
					<tr>
						<th>ID</th>
						<th>User</th>
						<th>Training Session</th>
						<th>Enrollment Date</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{enrollments.map((enrollment) => (
						<tr key={enrollment.id}>
							<td>{enrollment.id}</td>
							<td>
								{enrollment.username} (ID: {enrollment.user_id})
							</td>
							<td>
								{enrollment.session_title} (ID:{" "}
								{enrollment.session_id})
							</td>
							<td>
								{new Date(
									enrollment.enrollment_date
								).toLocaleDateString()}
							</td>
							<td>
								<span
									className={`${styles.statusBadge} ${
										styles[enrollment.status]
									}`}
								>
									{enrollment.status.charAt(0).toUpperCase() +
										enrollment.status.slice(1)}
								</span>
							</td>
							<td>
								<button
									className={`${styles.actionButton} ${styles.deleteButton}`}
									onClick={() =>
										handleDeleteEnrollment(enrollment.id)
									}
								>
									Delete
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{enrollments.length === 0 && !loading && (
				<div className={styles.emptyMessage}>No enrollments found.</div>
			)}

			{/* Add Enrollment Modal */}
			{showAddModal && (
				<div className={styles.modalBackdrop}>
					<div className={styles.modal}>
						<h3>Add New Enrollment</h3>
						<form onSubmit={handleCreateEnrollment}>
							<div className={styles.formGroup}>
								<label htmlFor="user_id">User ID</label>
								<input
									type="number"
									id="user_id"
									value={newEnrollment.user_id}
									onChange={(e) =>
										setNewEnrollment({
											...newEnrollment,
											user_id: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="session_id">Session ID</label>
								<input
									type="number"
									id="session_id"
									value={newEnrollment.session_id}
									onChange={(e) =>
										setNewEnrollment({
											...newEnrollment,
											session_id: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.modalActions}>
								<button
									type="button"
									onClick={() => setShowAddModal(false)}
								>
									Cancel
								</button>
								<button type="submit">Create Enrollment</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default EnrollmentList;
