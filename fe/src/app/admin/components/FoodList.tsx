// src/app/admin/components/FoodList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from "@/context/AuthContext";

// Matches Backend AdminFoodResponse and relevant parts of FoodBase/AdminFoodCreateRequest
interface FoodItem {
	FoodID: number;
	Name: string;
	// Description is missing in the backend model provided
	Price: number; // Assuming backend stores price in cents as integer
	// Calories is missing in the backend model provided
	Category: string; // Should match values in backend FoodCategory enum
	Stock: number;
	url?: string; // Optional image URL
}

// For the Create form state (matches AdminFoodCreateRequest structure)
interface NewFoodItemState {
	Name: string;
	Category: string;
	Price: string; // Input as string (dollars/euros), converted to cents later
	Stock: string; // Input as string, parsed later
	url: string;
}

// For the Edit form state (matches AdminFoodUpdateRequest structure)
interface EditFoodItemState {
	Name?: string;
	Category?: string;
	Price?: string; // Input as string (dollars/euros), converted to cents later
	Stock?: string; // Input as string, parsed later
	url?: string;
}

const FoodList: React.FC = () => {
	const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Add Modal State
	const [showAddModal, setShowAddModal] = useState(false);
	const initialNewFoodItemState: NewFoodItemState = {
		Name: "",
		Category: "",
		Price: "0.00",
		Stock: "0",
		url: "",
	  };
	const [newFoodItem, setNewFoodItem] = useState<NewFoodItemState>(
		initialNewFoodItemState
	);

	// Edit Modal State
	const [showEditModal, setShowEditModal] = useState(false);
	const [editingFoodItem, setEditingFoodItem] = useState<FoodItem | null>(
		null
	);
	const [editFormData, setEditFormData] = useState<EditFoodItemState>({});

	// Detail Modal State
	const [showDetailModal, setShowDetailModal] = useState(false);
	const [selectedFoodItem, setSelectedFoodItem] = useState<FoodItem | null>(null);

	const { token } = useAuth();
	const api = createApiClient(token);

	useEffect(() => {
		fetchFoodItems();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps
	// Added eslint-disable-line as fetchFoodItems is defined below but stable

	const fetchFoodItems = async () => {
		setLoading(true);
		try {
			// GET /admin/food/ - Matches backend
			const response = await api.get("/admin/food/");
			// Map response data (AdminFoodResponse[]) to frontend FoodItem[]
			const items: FoodItem[] = response.data.map((item: any) => ({
				FoodID: item.FoodID,
				Name: item.Name,
				Price: item.Price, // Assuming backend sends cents
				Category: item.Category,
				Stock: item.Stock,
				url: item.url,
			}));
			setFoodItems(items);
			setError(null);
		} catch (err) {
			console.error("Error fetching food items:", err);
			setError("Failed to load food items. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	// --- Add Item Logic ---

	const handleAddNewClick = () => {
		setNewFoodItem(initialNewFoodItemState); // Reset form
		setShowAddModal(true);
	};

	const handleNewFoodInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value } = e.target;
		setNewFoodItem((prev) => ({ ...prev, [name]: value }));
	};

const handleCreateFoodItem = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
		  // Prepare data matching AdminFoodCreateRequest
		  const payload = {
			Name: newFoodItem.Name,
			Category: newFoodItem.Category,
			// Convert dollars/euros string to integer cents
			Price: Math.round(parseFloat(newFoodItem.Price) * 100),
			Stock: parseInt(newFoodItem.Stock, 10),
			url: newFoodItem.url || null, // Send null if empty
		  };
	  
		  if (
			isNaN(payload.Price) ||
			isNaN(payload.Stock)
		  ) {
			alert(
			  "Please ensure Price and Stock are valid numbers."
			);
			return;
		  }
		  if (!payload.Category) {
			alert("Please select a category.");
			return;
		  }
	  
		  // POST /admin/food/ - Matches backend
		  await api.post("/admin/food/", payload);
	  
		  setShowAddModal(false);
		  fetchFoodItems(); // Refresh list
		} catch (err: any) {
		  console.error("Error creating food item:", err);
		  const errorMsg =
			err.response?.data?.detail ||
			"Failed to create food item. Check console for details.";
		  alert(`Error: ${errorMsg}`);
		}
	  };

	// --- Edit Item Logic ---

	const handleEditClick = (item: FoodItem) => {
	    setEditingFoodItem(item);
	    // Pre-fill edit form data, converting price back to dollars/euros string
	    setEditFormData({
	        Name: item.Name,
	        Category: item.Category,
	        Price: (item.Price / 100).toFixed(2), // Convert cents to dollars string
	        Stock: item.Stock.toString(),
	        url: item.url || "",
	    });
	    setShowEditModal(true);
	};

	// --- Detail Item Logic ---
	const handleDetailClick = async (item: FoodItem) => {
	    setLoading(true);
	    setError(null);
	    try {
	        const response = await api.get(`/admin/food/${item.FoodID}`);
	        setSelectedFoodItem(response.data);
	        setShowDetailModal(true);
	    } catch (err: any) {
	        console.error("Error fetching food item details:", err);
	        setError(`Failed to load food item details: ${err?.response?.data?.detail || err.message || 'Please try again.'}`);
	        alert("Failed to get food item details. Please try again.");
	    } finally {
	        setLoading(false);
	    }
	};

	const handleEditInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value } = e.target;
		setEditFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingFoodItem) return;

		try {
			// Prepare data matching AdminFoodUpdateRequest
			const payload: { [key: string]: any } = {};
			if (
				editFormData.Name !== undefined &&
				editFormData.Name !== editingFoodItem.Name
			)
				payload.Name = editFormData.Name;
			if (
				editFormData.Category !== undefined &&
				editFormData.Category !== editingFoodItem.Category
			)
				payload.Category = editFormData.Category;
			if (
				editFormData.Stock !== undefined &&
				editFormData.Stock !== editingFoodItem.Stock.toString()
			)
				payload.Stock = parseInt(editFormData.Stock, 10);
			if (
				editFormData.url !== undefined &&
				editFormData.url !== (editingFoodItem.url || "")
			)
				payload.url = editFormData.url || null;

			// Handle price conversion carefully
			if (editFormData.Price !== undefined) {
				const newPriceCents = Math.round(
					parseFloat(editFormData.Price) * 100
				);
				if (newPriceCents !== editingFoodItem.Price) {
					payload.Price = newPriceCents;
				}
				if (isNaN(newPriceCents)) {
					alert("Please ensure Price is a valid number.");
					return;
				}
			}
			if (payload.Stock !== undefined && isNaN(payload.Stock)) {
				alert("Please ensure Stock is a valid number.");
				return;
			}

			if (Object.keys(payload).length === 0) {
				setShowEditModal(false); // Nothing changed
				return;
			}

			// PUT /admin/food/{foodId} - Matches backend
			await api.put(`/admin/food/${editingFoodItem.FoodID}`, payload);

			setShowEditModal(false);
			setEditingFoodItem(null);
			fetchFoodItems(); // Refresh list
		} catch (err: any) {
			console.error("Error updating food item:", err);
			const errorMsg =
				err.response?.data?.detail ||
				"Failed to update food item. Check console for details.";
			alert(`Error: ${errorMsg}`);
		}
	};

	// --- Toggle Stock Logic ---
	const handleToggleStock = async (item: FoodItem) => {
		const newStock = item.Stock > 0 ? 0 : 1; // Set to 0 if available, else set to 1
		try {
			// Use PUT for update, sending only the Stock field
			await api.put(`/admin/food/${item.FoodID}`, { Stock: newStock });
			fetchFoodItems(); // Refresh the list
		} catch (err) {
			console.error("Error toggling stock:", err);
			alert("Failed to update stock status. Please try again.");
		}
	};

	// --- Delete Item Logic ---

	const handleDeleteFoodItem = async (foodId: number) => {
		if (
			window.confirm(
				"Are you sure you want to delete this food item? This might fail if the item is part of existing orders."
			)
		) {
			try {
				// DELETE /admin/food/{foodId} - Matches backend
				await api.delete(`/admin/food/${foodId}`);
				fetchFoodItems(); // Refresh list
			} catch (err: any) {
				console.error("Error deleting food item:", err);
				const errorMsg =
					err.response?.data?.detail ||
					"Failed to delete food item. Check console for details.";
				alert(`Error: ${errorMsg}`);
			}
		}
	};

	// --- Render Logic ---

	if (loading)
		return (
			<div className={styles.loadingIndicator}>Loading food items...</div>
		);
	if (error) return <div className={styles.error}>{error}</div>;

	// Change in the formatPrice helper function
	const formatPrice = (cents: number) => {
		return `${(cents / 100).toLocaleString("vi-VN")}₫`;
	};
	return (
		<div className={styles.listContainer}>
			<div className={styles.listHeader}>
				<h2>Cafeteria Food Management</h2>
				<button
					className={styles.addButton}
					onClick={handleAddNewClick} // Use specific handler
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
						{/* <th>Price</th> */}
						<th>Stock</th>
						{/* <th>Status</th> */}
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{foodItems.map((item) => (
					    <tr key={item.FoodID}>
					        <td>{item.FoodID}</td>
					        <td>
					            {item.Name}
					            {item.url && (
					                <div className={styles.itemDescription} style={{ display: 'none' }}>
					                    <a
					                        href={item.url}
					                        target="_blank"
					                        rel="noopener noreferrer"
					                    >
					                        Image Link
					                    </a>
					                </div>
					            )}
					        </td>
					        <td>{item.Category}</td>
					        <td style={{ display: 'none' }}>{formatPrice(item.Price)}</td>
					        <td style={{ display: 'none' }}>{item.Stock}</td>
					        <td>
								<span
									className={
										item.Stock > 0
											? styles.statusActive
											: styles.statusInactive
									}
								>
									{item.Stock > 0
										? "In Stock"
										: "Out of Stock"}
								</span>
							</td>
							<td>
								<button
								    className={styles.actionButton}
								    onClick={() => handleEditClick(item)}
								>
								    Edit
								</button>
								<button
								    className={styles.actionButton}
								    onClick={() => handleDetailClick(item)}
								>
								    Detail
								</button>
								<button
								    className={styles.actionButton}
								    onClick={() => handleToggleStock(item)} // Updated handler
								>
								    {item.Stock > 0
								        ? "Set OOS" // Out Of Stock
								        : "Set In Stock (1)"}
								</button>
								<button
								    className={`${styles.actionButton} ${styles.deleteButton}`}
								    onClick={() =>
								        handleDeleteFoodItem(item.FoodID)
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

			{showAddModal && (
				<div className={styles.modalBackdrop}>
					<div className={styles.modal}>
						<h3>Add New Food Item</h3>
						<form onSubmit={handleCreateFoodItem}>
							<div className={styles.formGroup}>
								<label htmlFor="add-Name">Name *</label>
								<input
									type="text"
									id="add-Name"
									name="Name" // Matches state key
									value={newFoodItem.Name}
									onChange={handleNewFoodInputChange}
									required
									maxLength={255}
								/>
							</div>

							<div className={styles.formGroup}>
								<label htmlFor="add-Price">Price (VND) *</label>
								<input
									type="number"
									id="add-Price"
									name="Price" // Matches state key
									step="0.01"
									min="0"
									value={newFoodItem.Price}
									onChange={handleNewFoodInputChange}
									required
								/>
							</div>

							<div className={styles.formGroup}>
								<label htmlFor="add-Stock">Stock *</label>
								<input
									type="number"
									id="add-Stock"
									name="Stock" // Matches state key
									min="0"
									step="1"
									value={newFoodItem.Stock}
									onChange={handleNewFoodInputChange}
									required
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="add-Category">Category *</label>
								<select
									id="add-Category"
									name="Category" // Matches state key
									value={newFoodItem.Category}
									onChange={handleNewFoodInputChange}
									required
								>
									<option value="Snack">Snack</option>
									<option value="Meal">Meal</option>
									<option value="Drink">Drink</option>
								</select>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="add-url">
									Image URL (optional)
								</label>
								<input
									type="url"
									id="add-url"
									name="url" // Matches state key
									value={newFoodItem.url}
									onChange={handleNewFoodInputChange}
								/>
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

			{showEditModal && editingFoodItem && (
				<div className={styles.modalBackdrop}>
					<div className={styles.modal}>
						<h3>Edit Food Item (ID: {editingFoodItem.FoodID})</h3>
						<form onSubmit={handleEditSubmit}>
							<div className={styles.formGroup}>
								<label htmlFor="edit-Name">Name</label>
								<input
									type="text"
									id="edit-Name"
									name="Name" // Matches state key
									value={editFormData.Name || ""}
									onChange={handleEditInputChange}
									maxLength={255}
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="edit-Price">Price (VND)</label>
								<input
									type="number"
									id="edit-Price"
									name="Price" // Matches state key
									step="0.01"
									min="0"
									value={editFormData.Price || "0.00"}
									onChange={handleEditInputChange}
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="edit-Stock">Stock</label>
								<input
									type="number"
									id="edit-Stock"
									name="Stock" // Matches state key
									min="0"
									step="1"
									value={editFormData.Stock || "0"}
									onChange={handleEditInputChange}
								/>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="edit-Category">Category</label>
								<select
									id="edit-Category"
									name="Category" // Matches state key
									value={editFormData.Category || ""}
									onChange={handleEditInputChange}
								>
									<option value="">Select a category</option>
									<option value="Snack">Snack</option>
									<option value="Dinner">Milk</option>
									<option value="Drink">Drink</option>
								</select>
							</div>
							<div className={styles.formGroup}>
								<label htmlFor="edit-url">Image URL</label>
								<input
									type="url"
									id="edit-url"
									name="url" // Matches state key
									value={editFormData.url || ""}
									onChange={handleEditInputChange}
								/>
							</div>
							<div className={styles.modalActions}>
								<button
									type="button"
									onClick={() => setShowEditModal(false)}
								>
									Cancel
								</button>
								<button type="submit">Save Changes</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{showDetailModal && selectedFoodItem && (
				<div className={styles.modalBackdrop}>
					<div className={styles.modal}>
						<h3>Food Item Details (ID: {selectedFoodItem.FoodID})</h3>
						<div className={styles.detailView}>
							<div className={styles.detailItem}>
								<label><strong>Name:</strong></label>
								<p>{selectedFoodItem.Name}</p>
							</div>
							<div className={styles.detailItem}>
								<label><strong>Category:</strong></label>
								<p>{selectedFoodItem.Category}</p>
							</div>
							<div className={styles.detailItem}>
								<label><strong>Price (VND):</strong></label>
								<p>{formatPrice(selectedFoodItem.Price)}</p>
							</div>
							<div className={styles.detailItem}>
								<label><strong>Stock:</strong></label>
								<p>{selectedFoodItem.Stock}</p>
							</div>
							<div className={styles.detailItem}>
								<label><strong>Image URL:</strong></label>
								<p>{selectedFoodItem.url ? <a href={String(selectedFoodItem.url)} target="_blank" rel="noopener noreferrer">Link</a> : 'No URL'}</p>
							</div>
						</div>
						<div className={styles.modalActions}>
							<button type="button" onClick={() => { setShowDetailModal(false); setSelectedFoodItem(null); }}>Close</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default FoodList;
