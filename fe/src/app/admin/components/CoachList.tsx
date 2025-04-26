// src/app/admin/components/CoachList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

interface Coach {
	coach_id: number;
	name: string;
	rating: number | null;
	experience: string | null;
	specialization?: string;
	bio?: string;
}

const CoachList: React.FC = () => {
	const [coaches, setCoaches] = useState<Coach[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
	const [showEditModal, setShowEditModal] = useState(false);

	// Get token from your auth context or localStorage
	const { token } = useAuth();
	const api = createApiClient(token);

	useEffect(() => {
		fetchCoaches();
	}, []);

	const fetchCoaches = async () => {
		setLoading(true);
		try {
			const response = await api.get("/admin/coaches/");
			setCoaches(response.data);
			setError(null);
		} catch (err) {
			console.error("Error fetching coaches:", err);
			setError("Failed to load coach data. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleEdit = async (coachId: number) => {
		try {
			const response = await api.get(`/admin/coaches/${coachId}`);
			setSelectedCoach(response.data);
			setShowEditModal(true);
		} catch (err) {
			console.error("Error fetching coach details:", err);
			alert("Failed to load coach details. Please try again.");
		}
	};

	const handleUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedCoach) return;

		try {
			await api.put(`/admin/coaches/${selectedCoach.coach_id}`, {
				name: selectedCoach.name,
				experience: selectedCoach.experience,
				specialization: selectedCoach.specialization,
				bio: selectedCoach.bio,
				// Add other fields as needed
			});
			setShowEditModal(false);
			fetchCoaches(); // Refresh the list
		} catch (err) {
			console.error("Error updating coach:", err);
			alert("Failed to update coach. Please try again.");
		}
	};

	if (loading)
		return (
			<div className={styles.loadingIndicator}>Loading coach data...</div>
		);
	if (error) return <div className={styles.error}>{error}</div>;

	return (
		<div className={styles.listContainer}>
			<h2>Coaches</h2>
			<table className={styles.dataTable}>
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Rating</th>
						<th>Experience</th>
						<th>Specialization</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{coaches.map((coach) => (
						<tr key={coach.coach_id}>
							<td>{coach.coach_id}</td>
							<td>{coach.name}</td>
							<td>{coach.rating?.toFixed(1) || "N/A"}</td>
							<td>{coach.experience || "N/A"}</td>
							<td>{coach.specialization || "N/A"}</td>
							<td>
								<button
									className={styles.actionButton}
									onClick={() => handleEdit(coach.coach_id)}
								>
									Edit
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{coaches.length === 0 && !loading && (
				<div className={styles.emptyMessage}>No coaches found.</div>
			)}

			{/* Edit Coach Modal */}
			{showEditModal && selectedCoach && (
				<div className={styles.modalBackdrop}>
					<div className={styles.modal}>
						<h3>Edit Coach</h3>
						<form onSubmit={handleUpdate}>
							<div className={styles.formGroup}>
								<label htmlFor="name">Name</label>
								<input
									type="text"
									id="name"
									value={selectedCoach.name}
									onChange={(e) =>
										setSelectedCoach({
											...selectedCoach,
											name: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="experience">Experience</label>
								<input
									type="text"
									id="experience"
									value={selectedCoach.experience || ""}
									onChange={(e) =>
										setSelectedCoach({
											...selectedCoach,
											experience: e.target.value,
										})
									}
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="specialization">
									Specialization
								</label>
								<input
									type="text"
									id="specialization"
									value={selectedCoach.specialization || ""}
									onChange={(e) =>
										setSelectedCoach({
											...selectedCoach,
											specialization: e.target.value,
										})
									}
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="bio">Bio</label>
								<textarea
									id="bio"
									value={selectedCoach.bio || ""}
									onChange={(e) =>
										setSelectedCoach({
											...selectedCoach,
											bio: e.target.value,
										})
									}
									rows={4}
								/>
							</div>
							<div className={styles.modalActions}>
								<button
									type="button"
									onClick={() => setShowEditModal(false)}
								>
									Cancel
								</button>
								<button type="submit">Update</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default CoachList;
