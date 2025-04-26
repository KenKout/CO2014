// src/app/admin/components/EquipmentList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

interface Equipment {
	id: number;
	name: string;
	description: string;
	category: string;
	status: "available" | "in-use" | "maintenance" | "out-of-order";
	location: string;
	purchase_date: string;
	last_maintenance_date?: string;
}

const EquipmentList: React.FC = () => {
	const [equipment, setEquipment] = useState<Equipment[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [newEquipment, setNewEquipment] = useState({
		name: "",
		description: "",
		category: "",
		status: "available",
		location: "",
		purchase_date: "",
		last_maintenance_date: "",
	});

	// Get token from your auth context or localStorage
	const { token } = useAuth();
	const api = createApiClient(token);

	useEffect(() => {
		fetchEquipment();
	}, []);

	const fetchEquipment = async () => {
		setLoading(true);
		try {
			const response = await api.get("/admin/equipment/");
			setEquipment(response.data);
			setError(null);
		} catch (err) {
			console.error("Error fetching equipment:", err);
			setError("Failed to load equipment. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleCreateEquipment = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await api.post("/admin/equipment/", newEquipment);
			setShowAddModal(false);
			setNewEquipment({
				name: "",
				description: "",
				category: "",
				status: "available",
				location: "",
				purchase_date: "",
				last_maintenance_date: "",
			});
			fetchEquipment();
		} catch (err) {
			console.error("Error creating equipment:", err);
			alert("Failed to create equipment. Please try again.");
		}
	};

	const handleUpdateEquipment = async (equipmentId: number, data: any) => {
		try {
			await api.put(`/admin/equipment/${equipmentId}`, data);
			fetchEquipment();
		} catch (err) {
			console.error("Error updating equipment:", err);
			alert("Failed to update equipment. Please try again.");
		}
	};

	const handleDeleteEquipment = async (equipmentId: number) => {
		if (window.confirm("Are you sure you want to delete this equipment?")) {
			try {
				await api.delete(`/admin/equipment/${equipmentId}`);
				fetchEquipment();
			} catch (err) {
				console.error("Error deleting equipment:", err);
				alert("Failed to delete equipment. Please try again.");
			}
		}
	};

	if (loading)
		return (
			<div className={styles.loadingIndicator}>Loading equipment...</div>
		);
	if (error) return <div className={styles.error}>{error}</div>;

	return (
		<div className={styles.listContainer}>
			<div className={styles.listHeader}>
				<h2>Equipment Management</h2>
				<button
					className={styles.addButton}
					onClick={() => setShowAddModal(true)}
				>
					Add New Equipment
				</button>
			</div>

			<table className={styles.dataTable}>
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Category</th>
						<th>Location</th>
						<th>Status</th>
						<th>Purchase Date</th>
						<th>Last Maintenance</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{equipment.map((item) => (
						<tr key={item.id}>
							<td>{item.id}</td>
							<td>
								{item.name}
								<div className={styles.itemDescription}>
									{item.description}
								</div>
							</td>
							<td>{item.category}</td>
							<td>{item.location}</td>
							<td>
								<span
									className={`${styles.statusBadge} ${
										styles[item.status]
									}`}
								>
									{item.status
										.replace(/-/g, " ")
										.replace(/\b\w/g, (l) =>
											l.toUpperCase()
										)}
								</span>
							</td>
							<td>
								{new Date(
									item.purchase_date
								).toLocaleDateString()}
							</td>
							<td>
								{item.last_maintenance_date
									? new Date(
											item.last_maintenance_date
									  ).toLocaleDateString()
									: "Never"}
							</td>
							<td>
								<select
									className={styles.statusSelect}
									value={item.status}
									onChange={(e) =>
										handleUpdateEquipment(item.id, {
											status: e.target.value,
										})
									}
								>
									<option value="available">Available</option>
									<option value="in-use">In Use</option>
									<option value="maintenance">
										Maintenance
									</option>
									<option value="out-of-order">
										Out of Order
									</option>
								</select>
								<button
									className={styles.actionButton}
									onClick={() => {
										const today = new Date()
											.toISOString()
											.split("T")[0];
										handleUpdateEquipment(item.id, {
											last_maintenance_date: today,
										});
									}}
								>
									Mark Maintained
								</button>
								<button
									className={`${styles.actionButton} ${styles.deleteButton}`}
									onClick={() =>
										handleDeleteEquipment(item.id)
									}
								>
									Delete
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{equipment.length === 0 && !loading && (
				<div className={styles.emptyMessage}>No equipment found.</div>
			)}

			{/* Add Equipment Modal */}
			{showAddModal && (
				<div className={styles.modalBackdrop}>
					<div className={styles.modal}>
						<h3>Add New Equipment</h3>
						<form onSubmit={handleCreateEquipment}>
							<div className={styles.formGroup}>
								<label htmlFor="name">Name</label>
								<input
									type="text"
									id="name"
									value={newEquipment.name}
									onChange={(e) =>
										setNewEquipment({
											...newEquipment,
											name: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="description">Description</label>
								<textarea
									id="description"
									value={newEquipment.description}
									onChange={(e) =>
										setNewEquipment({
											...newEquipment,
											description: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="category">Category</label>
								<select
									id="category"
									value={newEquipment.category}
									onChange={(e) =>
										setNewEquipment({
											...newEquipment,
											category: e.target.value,
										})
									}
									required
								>
									<option value="">Select a category</option>
									<option value="Cardio">Cardio</option>
									<option value="Strength">Strength</option>
									<option value="Weights">Weights</option>
									<option value="Accessories">
										Accessories
									</option>
									<option value="Machines">Machines</option>
								</select>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="status">Status</label>
								<select
									id="status"
									value={newEquipment.status}
									onChange={(e) =>
										setNewEquipment({
											...newEquipment,
											status: e.target.value as any,
										})
									}
									required
								>
									<option value="available">Available</option>
									<option value="in-use">In Use</option>
									<option value="maintenance">
										Maintenance
									</option>
									<option value="out-of-order">
										Out of Order
									</option>
								</select>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="location">Location</label>
								<input
									type="text"
									id="location"
									value={newEquipment.location}
									onChange={(e) =>
										setNewEquipment({
											...newEquipment,
											location: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="purchase_date">
									Purchase Date
								</label>
								<input
									type="date"
									id="purchase_date"
									value={newEquipment.purchase_date}
									onChange={(e) =>
										setNewEquipment({
											...newEquipment,
											purchase_date: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="last_maintenance_date">
									Last Maintenance Date (optional)
								</label>
								<input
									type="date"
									id="last_maintenance_date"
									value={newEquipment.last_maintenance_date}
									onChange={(e) =>
										setNewEquipment({
											...newEquipment,
											last_maintenance_date:
												e.target.value,
										})
									}
								/>
							</div>
							<div className={styles.modalActions}>
								<button
									type="button"
									onClick={() => setShowAddModal(false)}
								>
									Cancel
								</button>
								<button type="submit">Create Equipment</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default EquipmentList;
