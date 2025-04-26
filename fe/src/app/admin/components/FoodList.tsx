// src/app/admin/components/FoodList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

interface FoodItem {
	id: number;
	name: string;
	description: string;
	price: number;
	calories: number;
	category: string;
	is_available: boolean;
	image_url?: string;
}

const FoodList: React.FC = () => {
	const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [newFoodItem, setNewFoodItem] = useState({
		name: "",
		description: "",
		price: 0,
		calories: 0,
		category: "",
		is_available: true,
		image_url: "",
	});

	// Get token from your auth context or localStorage
	const { token } = useAuth();
	const api = createApiClient(token);

	useEffect(() => {
		fetchFoodItems();
	}, []);

	const fetchFoodItems = async () => {
		setLoading(true);
		try {
			const response = await api.get("/admin/food/");
			setFoodItems(response.data);
			setError(null);
		} catch (err) {
			console.error("Error fetching food items:", err);
			setError("Failed to load food items. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleCreateFoodItem = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await api.post("/admin/food/", {
				...newFoodItem,
				price: parseFloat(newFoodItem.price.toString()),
				calories: parseInt(newFoodItem.calories.toString()),
			});
			setShowAddModal(false);
			setNewFoodItem({
				name: "",
				description: "",
				price: 0,
				calories: 0,
				category: "",
				is_available: true,
				image_url: "",
			});
			fetchFoodItems();
		} catch (err) {
			console.error("Error creating food item:", err);
			alert("Failed to create food item. Please try again.");
		}
	};

	const handleUpdateFoodItem = async (foodId: number, data: any) => {
		try {
			await api.put(`/admin/food/${foodId}`, data);
			fetchFoodItems();
		} catch (err) {
			console.error("Error updating food item:", err);
			alert("Failed to update food item. Please try again.");
		}
	};

	const handleDeleteFoodItem = async (foodId: number) => {
		if (window.confirm("Are you sure you want to delete this food item?")) {
			try {
				await api.delete(`/admin/food/${foodId}`);
				fetchFoodItems();
			} catch (err) {
				console.error("Error deleting food item:", err);
				alert("Failed to delete food item. Please try again.");
			}
		}
	};

	if (loading)
		return (
			<div className={styles.loadingIndicator}>Loading food items...</div>
		);
	if (error) return <div className={styles.error}>{error}</div>;

	return (
		<div className={styles.listContainer}>
			<div className={styles.listHeader}>
				<h2>Cafeteria Food Management</h2>
				<button
					className={styles.addButton}
					onClick={() => setShowAddModal(true)}
				>
					Add New Food Item
				</button>
			</div>

			<table className={styles.dataTable}>
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Category</th>
						<th>Price</th>
						<th>Calories</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{foodItems.map((item) => (
						<tr key={item.id}>
							<td>{item.id}</td>
							<td>
								{item.name}
								<div className={styles.itemDescription}>
									{item.description}
								</div>
							</td>
							<td>{item.category}</td>
							<td>${item.price.toFixed(2)}</td>
							<td>{item.calories} cal</td>
							<td>
								<span
									className={
										item.is_available
											? styles.statusActive
											: styles.statusInactive
									}
								>
									{item.is_available
										? "Available"
										: "Unavailable"}
								</span>
							</td>
							<td>
								<button
									className={styles.actionButton}
									onClick={() =>
										handleUpdateFoodItem(item.id, {
											is_available: !item.is_available,
										})
									}
								>
									{item.is_available
										? "Mark Unavailable"
										: "Mark Available"}
								</button>
								<button
									className={`${styles.actionButton} ${styles.deleteButton}`}
									onClick={() =>
										handleDeleteFoodItem(item.id)
									}
								>
									Delete
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{foodItems.length === 0 && !loading && (
				<div className={styles.emptyMessage}>No food items found.</div>
			)}

			{/* Add Food Item Modal */}
			{showAddModal && (
				<div className={styles.modalBackdrop}>
					<div className={styles.modal}>
						<h3>Add New Food Item</h3>
						<form onSubmit={handleCreateFoodItem}>
							<div className={styles.formGroup}>
								<label htmlFor="name">Name</label>
								<input
									type="text"
									id="name"
									value={newFoodItem.name}
									onChange={(e) =>
										setNewFoodItem({
											...newFoodItem,
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
									value={newFoodItem.description}
									onChange={(e) =>
										setNewFoodItem({
											...newFoodItem,
											description: e.target.value,
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="price">Price ($)</label>
								<input
									type="number"
									id="price"
									step="0.01"
									min="0"
									value={newFoodItem.price}
									onChange={(e) =>
										setNewFoodItem({
											...newFoodItem,
											price: parseFloat(e.target.value),
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="calories">Calories</label>
								<input
									type="number"
									id="calories"
									min="0"
									value={newFoodItem.calories}
									onChange={(e) =>
										setNewFoodItem({
											...newFoodItem,
											calories: parseInt(e.target.value),
										})
									}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="category">Category</label>
								<select
									id="category"
									value={newFoodItem.category}
									onChange={(e) =>
										setNewFoodItem({
											...newFoodItem,
											category: e.target.value,
										})
									}
									required
								>
									<option value="">Select a category</option>
									<option value="Breakfast">Breakfast</option>
									<option value="Lunch">Lunch</option>
									<option value="Dinner">Dinner</option>
									<option value="Snacks">Snacks</option>
									<option value="Beverages">Beverages</option>
									<option value="Protein">Protein</option>
									<option value="Supplements">
										Supplements
									</option>
								</select>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="image_url">
									Image URL (optional)
								</label>
								<input
									type="url"
									id="image_url"
									value={newFoodItem.image_url}
									onChange={(e) =>
										setNewFoodItem({
											...newFoodItem,
											image_url: e.target.value,
										})
									}
								/>
							</div>
							<div className={styles.formGroup}>
								<label>
									<input
										type="checkbox"
										checked={newFoodItem.is_available}
										onChange={(e) =>
											setNewFoodItem({
												...newFoodItem,
												is_available: e.target.checked,
											})
										}
									/>
									Available for order
								</label>
							</div>
							<div className={styles.modalActions}>
								<button
									type="button"
									onClick={() => setShowAddModal(false)}
								>
									Cancel
								</button>
								<button type="submit">Create Food Item</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default FoodList;
