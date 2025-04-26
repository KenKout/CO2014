// src/app/admin/components/StaffList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

interface Staff {
	staff_id: number;
	name: string;
	salary: number;
	hired_date: string;
	user_id: number;
}

const StaffList: React.FC = () => {
	const [staff, setStaff] = useState<Staff[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
	const [showEditModal, setShowEditModal] = useState(false);

	// Get token from your auth context or localStorage
	const { token } = useAuth();
	const api = createApiClient(token);

	useEffect(() => {
		fetchStaff();
	}, []);

	const fetchStaff = async () => {
		setLoading(true);
		try {
			const response = await api.get("/admin/staff/");
			setStaff(response.data);
			setError(null);
		} catch (err) {
			console.error("Error fetching staff:", err);
			setError("Failed to load staff data. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleEdit = async (staffId: number) => {
		try {
			const response = await api.get(`/admin/staff/${staffId}`);
			setSelectedStaff(response.data);
			setShowEditModal(true);
		} catch (err) {
			console.error("Error fetching staff details:", err);
			alert("Failed to load staff details. Please try again.");
		}
	};

	const handleUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedStaff) return;

		try {
			await api.put(`/admin/staff/${selectedStaff.staff_id}`, {
				name: selectedStaff.name,
				salary: selectedStaff.salary,
				// Add other fields as needed
			});
			setShowEditModal(false);
			fetchStaff(); // Refresh the list
		} catch (err) {
			console.error("Error updating staff:", err);
			alert("Failed to update staff. Please try again.");
		}
	};

	if (loading)
		return (
			<div className={styles.loadingIndicator}>Loading staff data...</div>
		);
	if (error) return <div className={styles.error}>{error}</div>;

	return (
		<div className={styles.listContainer}>
			<h2>Staff Management</h2>
			<table className={styles.dataTable}>
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Salary</th>
						<th>Hired Date</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{staff.map((member) => (
						<tr key={member.staff_id}>
							<td>{member.staff_id}</td>
							<td>{member.name}</td>
							<td>{member.salary.toLocaleString()} VND</td>
							<td>
								{new Date(
									member.hired_date
								).toLocaleDateString()}
							</td>
							<td>
								<button
									className={styles.actionButton}
									onClick={() => handleEdit(member.staff_id)}
								>
									Edit
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{staff.length === 0 && !loading && (
				<div className={styles.emptyMessage}>
					No staff members found.
				</div>
			)}

			{/* Edit Staff Modal */}
			{showEditModal && selectedStaff && (
				<div className={styles.modalBackdrop}>
					<div className={styles.modal}>
						<h3>Edit Staff Member</h3>
						<form onSubmit={handleUpdate}>
							<div className={styles.formGroup}>
								<label htmlFor="name">Name</label>
								<input
									type="text"
									id="name"
									value={selectedStaff.name}
									onChange={(e) =>
										setSelectedStaff({
											...selectedStaff,
											name: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="salary">Salary (VND)</label>
								<input
									type="number"
									id="salary"
									value={selectedStaff.salary}
									onChange={(e) =>
										setSelectedStaff({
											...selectedStaff,
											salary: parseInt(e.target.value),
										})
									}
									required
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

export default StaffList;
