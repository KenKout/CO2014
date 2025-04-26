// src/app/admin/components/TrainingSessionList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

interface TrainingSession {
	id: number;
	title: string;
	description: string;
	coach_id: number;
	coach_name: string;
	start_time: string;
	end_time: string;
	max_capacity: number;
	current_bookings: number;
	status: "scheduled" | "in-progress" | "completed" | "cancelled";
}

const TrainingSessionList: React.FC = () => {
	const [sessions, setSessions] = useState<TrainingSession[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [newSession, setNewSession] = useState({
		title: "",
		description: "",
		coach_id: "",
		start_time: "",
		end_time: "",
		max_capacity: 10,
	});

	// Get token from your auth context or localStorage
	const { token } = useAuth();
	const api = createApiClient(token);

	useEffect(() => {
		fetchSessions();
	}, []);

	const fetchSessions = async () => {
		setLoading(true);
		try {
			const response = await api.get("/admin/training-sessions/");
			setSessions(response.data);
			setError(null);
		} catch (err) {
			console.error("Error fetching training sessions:", err);
			setError("Failed to load training sessions. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleCreateSession = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await api.post("/admin/training-sessions/", {
				...newSession,
				coach_id: parseInt(newSession.coach_id),
				max_capacity: parseInt(newSession.max_capacity.toString()),
			});
			setShowAddModal(false);
			setNewSession({
				title: "",
				description: "",
				coach_id: "",
				start_time: "",
				end_time: "",
				max_capacity: 10,
			});
			fetchSessions();
		} catch (err) {
			console.error("Error creating training session:", err);
			alert("Failed to create training session. Please try again.");
		}
	};

	const handleUpdateSession = async (sessionId: number, data: any) => {
		try {
			await api.put(`/admin/training-sessions/${sessionId}`, data);
			fetchSessions();
		} catch (err) {
			console.error("Error updating training session:", err);
			alert("Failed to update training session. Please try again.");
		}
	};

	const handleDeleteSession = async (sessionId: number) => {
		if (
			window.confirm(
				"Are you sure you want to delete this training session?"
			)
		) {
			try {
				await api.delete(`/admin/training-sessions/${sessionId}`);
				fetchSessions();
			} catch (err) {
				console.error("Error deleting training session:", err);
				alert("Failed to delete training session. Please try again.");
			}
		}
	};

	if (loading)
		return (
			<div className={styles.loadingIndicator}>
				Loading training sessions...
			</div>
		);
	if (error) return <div className={styles.error}>{error}</div>;

	return (
		<div className={styles.listContainer}>
			<div className={styles.listHeader}>
				<h2>Training Session Management</h2>
				<button
					className={styles.addButton}
					onClick={() => setShowAddModal(true)}
				>
					Add New Session
				</button>
			</div>

			<table className={styles.dataTable}>
				<thead>
					<tr>
						<th>ID</th>
						<th>Title</th>
						<th>Coach</th>
						<th>Date & Time</th>
						<th>Capacity</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{sessions.map((session) => (
						<tr key={session.id}>
							<td>{session.id}</td>
							<td>{session.title}</td>
							<td>{session.coach_name}</td>
							<td>
								{new Date(
									session.start_time
								).toLocaleDateString()}{" "}
								{new Date(
									session.start_time
								).toLocaleTimeString()}{" "}
								-{" "}
								{new Date(
									session.end_time
								).toLocaleTimeString()}
							</td>
							<td>
								{session.current_bookings} /{" "}
								{session.max_capacity}
							</td>
							<td>
								<span
									className={`${styles.statusBadge} ${
										styles[session.status]
									}`}
								>
									{session.status.charAt(0).toUpperCase() +
										session.status.slice(1)}
								</span>
							</td>
							<td>
								<button
									className={styles.actionButton}
									onClick={() => {
										// Here you might want to show an edit modal instead
										// For simplicity, let's just update the status
										const newStatus =
											session.status === "scheduled"
												? "cancelled"
												: "scheduled";
										handleUpdateSession(session.id, {
											status: newStatus,
										});
									}}
								>
									{session.status === "scheduled"
										? "Cancel"
										: "Reschedule"}
								</button>
								<button
									className={`${styles.actionButton} ${styles.deleteButton}`}
									onClick={() =>
										handleDeleteSession(session.id)
									}
								>
									Delete
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{sessions.length === 0 && !loading && (
				<div className={styles.emptyMessage}>
					No training sessions found.
				</div>
			)}

			{/* Add Session Modal */}
			{showAddModal && (
				<div className={styles.modalBackdrop}>
					<div className={styles.modal}>
						<h3>Add New Training Session</h3>
						<form onSubmit={handleCreateSession}>
							<div className={styles.formGroup}>
								<label htmlFor="title">Title</label>
								<input
									type="text"
									id="title"
									value={newSession.title}
									onChange={(e) =>
										setNewSession({
											...newSession,
											title: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="description">Description</label>
								<textarea
									id="description"
									value={newSession.description}
									onChange={(e) =>
										setNewSession({
											...newSession,
											description: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="coach_id">Coach ID</label>
								<input
									type="number"
									id="coach_id"
									value={newSession.coach_id}
									onChange={(e) =>
										setNewSession({
											...newSession,
											coach_id: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="start_time">Start Time</label>
								<input
									type="datetime-local"
									id="start_time"
									value={newSession.start_time}
									onChange={(e) =>
										setNewSession({
											...newSession,
											start_time: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="end_time">End Time</label>
								<input
									type="datetime-local"
									id="end_time"
									value={newSession.end_time}
									onChange={(e) =>
										setNewSession({
											...newSession,
											end_time: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="max_capacity">
									Max Capacity
								</label>
								<input
									type="number"
									id="max_capacity"
									value={newSession.max_capacity}
									onChange={(e) =>
										setNewSession({
											...newSession,
											max_capacity: parseInt(
												e.target.value
											),
										})
									}
									min="1"
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
								<button type="submit">Create Session</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default TrainingSessionList;
