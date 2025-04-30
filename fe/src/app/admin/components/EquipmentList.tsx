// src/app/admin/components/EquipmentList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

// Define EquipmentType enum matching the backend
type EquipmentType = 'Racket' | 'Shuttlecock' | 'Shoes';

// 1. CHANGE: Update Interface to match Backend Response (AdminEquipmentResponse)
interface Equipment {
    EquipmentID: number;
    Name: string;
    Type: EquipmentType;
    Brand?: string | null; // Allow null if backend might return null
    Price: number;
    Stock: number;
    url?: string | null;   // Allow null
}

// Define structure for creating equipment, matching AdminEquipmentCreateRequest
interface NewEquipmentData {
    EquipmentID: string; // Input as string initially, parse to number on submit
    Name: string;
    Type: EquipmentType | ''; // Allow empty string for initial select state
    Brand?: string;
    Price: string; // Input as string
    Stock: string; // Input as string
    url?: string;
}

// Define structure for updating equipment, matching AdminEquipmentUpdateRequest
interface UpdateEquipmentData {
    Name?: string;
    Type?: EquipmentType;
    Brand?: string | null;
    Price?: number;
    Stock?: number;
    url?: string | null;
}


const EquipmentList: React.FC = () => {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

    // 2. CHANGE: Update newEquipment state to match backend create request
    const [newEquipmentData, setNewEquipmentData] = useState<NewEquipmentData>({
        EquipmentID: "",
        Name: "",
        Type: "", // Default to empty, force selection
        Brand: "",
        Price: "",
        Stock: "",
        url: "",
    });

    const { token } = useAuth();
    const api = createApiClient(token);

    useEffect(() => {
        fetchEquipment();
    }, []);

    const fetchEquipment = async () => {
        setLoading(true);
        try {
            // GET /admin/equipment/ (No change needed here, API call is correct)
            const response = await api.get("/admin/equipment/");
            // Ensure response structure matches expected { data: [...] } if your api client wraps it
            // If api.get directly returns the array, use: setEquipment(response.data);
            // Assuming api.get returns { data: [...] } based on original code pattern
            if (response.data && Array.isArray(response.data)) {
                 setEquipment(response.data);
            } else if (Array.isArray(response)) {
                 // Handle cases where api client returns the array directly
                 setEquipment(response);
            }
             else {
                console.error("Unexpected response structure:", response);
                setError("Failed to parse equipment data.");
                setEquipment([]); // Set to empty array on unexpected structure
            }
            setError(null);
        } catch (err: any) {
            console.error("Error fetching equipment:", err);
            setError(`Failed to load equipment: ${err?.response?.data?.detail || err.message || 'Please try again.'}`);
        } finally {
            setLoading(false);
        }
    };

    // 3. CHANGE: Update Create handler to send correct payload
    const handleCreateEquipment = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!newEquipmentData.Type) {
            alert("Please select an equipment type.");
            return;
        }
         if (isNaN(parseInt(newEquipmentData.EquipmentID, 10))) {
            alert("Equipment ID must be a number.");
            return;
        }
        if (isNaN(parseInt(newEquipmentData.Price, 10))) {
            alert("Price must be a number.");
            return;
        }
         if (isNaN(parseInt(newEquipmentData.Stock, 10))) {
            alert("Stock must be a number.");
            return;
        }


        const payload = {
            EquipmentID: parseInt(newEquipmentData.EquipmentID, 10),
            Name: newEquipmentData.Name,
            Type: newEquipmentData.Type,
            Brand: newEquipmentData.Brand || null, // Send null if empty
            Price: parseInt(newEquipmentData.Price, 10),
            Stock: parseInt(newEquipmentData.Stock, 10),
            url: newEquipmentData.url || null, // Send null if empty
        };

        try {
            // POST /admin/equipment/ with AdminEquipmentCreateRequest payload
            await api.post("/admin/equipment/", payload);
            setShowAddModal(false);
            setNewEquipmentData({ // Reset form
                EquipmentID: "", Name: "", Type: "", Brand: "", Price: "", Stock: "", url: "",
            });
            fetchEquipment(); // Refresh list
        } catch (err: any) {
            console.error("Error creating equipment:", err);
            alert(`Failed to create equipment: ${err?.response?.data?.detail || err.message || 'Please try again.'}`);
        }
    };

     // 4. ADD: Function to open Edit Modal and fetch current data (using currently unused GET /id)
     const handleEditClick = async (item: Equipment) => {
         setLoading(true); // Show loading indicator while fetching details
         setError(null);
         try {
              // GET /admin/equipment/{id} - Using the endpoint not previously used by FE
             const response = await api.get(`/admin/equipment/${item.EquipmentID}`);
              // Assuming response.data is the Equipment object
             setEditingEquipment(response.data);
              setShowEditModal(true);
         } catch (err: any) {
              console.error("Error fetching equipment details for edit:", err);
             setError(`Failed to load equipment details: ${err?.response?.data?.detail || err.message || 'Please try again.'}`);
             setEditingEquipment(null); // Clear editing state on error
         } finally {
             setLoading(false);
         }
     };
 
     // 5. ADD: Function to fetch and display equipment details
     const handleDetailClick = async (item: Equipment) => {
         setLoading(true);
         setError(null);
         try {
             const response = await api.get(`/admin/equipment/${item.EquipmentID}`);
             setSelectedEquipment(response.data);
             setShowDetailModal(true);
         } catch (err: any) {
             console.error("Error fetching equipment details:", err);
             setError(`Failed to load equipment details: ${err?.response?.data?.detail || err.message || 'Please try again.'}`);
             alert("Failed to get equipment details. Please try again.");
         } finally {
             setLoading(false);
         }
     };

    // 5. CHANGE/ADD: Update handler for submitting edits
    const handleUpdateEquipment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEquipment) return;

        // Prepare payload matching AdminEquipmentUpdateRequest
        // Send only changed fields (though sending all is also acceptable if backend handles it)
        const updatePayload: UpdateEquipmentData = {
            Name: editingEquipment.Name,
            Type: editingEquipment.Type,
            Brand: editingEquipment.Brand || null,
            Price: editingEquipment.Price,
            Stock: editingEquipment.Stock,
            url: editingEquipment.url || null,
        };

        // Basic validation for numeric fields in edit form
        if (isNaN(Number(updatePayload.Price))) {
             alert("Price must be a number.");
             return;
         }
          if (isNaN(Number(updatePayload.Stock))) {
             alert("Stock must be a number.");
             return;
         }
         // Convert valid numeric strings back to numbers
         updatePayload.Price = Number(updatePayload.Price);
         updatePayload.Stock = Number(updatePayload.Stock);


        try {
            // PUT /admin/equipment/{id} with AdminEquipmentUpdateRequest payload
            await api.put(`/admin/equipment/${editingEquipment.EquipmentID}`, updatePayload);
            setShowEditModal(false);
            setEditingEquipment(null);
            fetchEquipment(); // Refresh list
        } catch (err: any) {
            console.error("Error updating equipment:", err);
            alert(`Failed to update equipment: ${err?.response?.data?.detail || err.message || 'Please try again.'}`);
        }
    };

    // 6. CHANGE: Update Delete handler to use correct ID field
    const handleDeleteEquipment = async (equipmentId: number) => {
        if (window.confirm(`Are you sure you want to delete equipment ID ${equipmentId}?`)) {
            try {
                // DELETE /admin/equipment/{id} (No change needed here, API call is correct)
                await api.delete(`/admin/equipment/${equipmentId}`);
                fetchEquipment(); // Refresh list
            } catch (err: any) {
                console.error("Error deleting equipment:", err);
                alert(`Failed to delete equipment: ${err?.response?.data?.detail || err.message || 'Please try again.'}`);
            }
        }
    };

    // Helper function to handle input changes in the edit modal
    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!editingEquipment) return;
        const { name, value } = e.target;
        setEditingEquipment({
            ...editingEquipment,
            [name]: value, // Keep as string temporarily for input fields
        });
    };


    if (loading && !showEditModal) // Don't show main loading if edit modal is loading its own data
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
                    onClick={() => {
                        setNewEquipmentData({ EquipmentID: "", Name: "", Type: "", Brand: "", Price: "", Stock: "", url: "" }); // Reset form state
                        setShowAddModal(true);
                    }}
                >
                    Add New Equipment
                </button>
            </div>

            {/* 7. CHANGE: Update Table Headers and Data Cells */}
            <table className={styles.dataTable}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Type</th>
                        {/* <th>Brand</th>
                        <th>Price (VND)</th>
                        <th>Stock</th>
                        <th>Image URL</th> */}
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {equipment.map((item) => (
                        <tr key={item.EquipmentID}>
                            <td>{item.EquipmentID}</td>
                            <td>{item.Name}</td>
                            <td>{item.Type}</td>
                            <td style={{ display: 'none' }}>{item.Brand || 'N/A'}</td>
                            <td style={{ display: 'none' }}>{item.Price}</td>
                            <td style={{ display: 'none' }}>{item.Stock}</td>
                            <td style={{ display: 'none' }}>{item.url ? <a href={String(item.url)} target="_blank" rel="noopener noreferrer">Link</a> : 'No URL'}</td>
                            <td>
                                {/* Add Edit Button */}
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
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    onClick={() => handleDeleteEquipment(item.EquipmentID)} // Use correct ID
                                >
                                    Delete
                                </button>
                                {/* Remove status dropdown and Mark Maintained button as they don't match BE */}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {equipment.length === 0 && !loading && (
                <div className={styles.emptyMessage}>No equipment found.</div>
            )}

            {/* 8. CHANGE: Update Add Equipment Modal Form Fields */}
            {showAddModal && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modal}>
                        <h3>Add New Equipment</h3>
                        <form onSubmit={handleCreateEquipment}>
                            {/* Add EquipmentID field as it's required by backend */}
                             <div className={styles.formGroup}>
                                <label htmlFor="add-equipmentId">Equipment ID</label>
                                <input
                                    type="number"
                                    id="add-equipmentId"
                                    value={newEquipmentData.EquipmentID}
                                    onChange={(e) => setNewEquipmentData({ ...newEquipmentData, EquipmentID: e.target.value })}
                                    required
                                    min="1" // Assuming positive IDs
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="add-name">Name</label>
                                <input
                                    type="text"
                                    id="add-name"
                                    value={newEquipmentData.Name}
                                    onChange={(e) => setNewEquipmentData({ ...newEquipmentData, Name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="add-type">Type</label>
                                <select
                                    id="add-type"
                                    value={newEquipmentData.Type}
                                    onChange={(e) => setNewEquipmentData({ ...newEquipmentData, Type: e.target.value as EquipmentType })}
                                    required
                                >
                                    <option value="" disabled>Select Type</option>
                                    <option value="Racket">Racket</option>
                                    <option value="Shuttlecock">Shuttlecock</option>
                                    <option value="Shoes">Shoes</option>
                                </select>
                            </div>
                             <div className={styles.formGroup}>
                                <label htmlFor="add-brand">Brand (Optional)</label>
                                <input
                                    type="text"
                                    id="add-brand"
                                    value={newEquipmentData.Brand}
                                    onChange={(e) => setNewEquipmentData({ ...newEquipmentData, Brand: e.target.value })}
                                />
                            </div>
                             <div className={styles.formGroup}>
                                <label htmlFor="add-price">Price (VND)</label>
                                <input
                                    type="number"
                                    id="add-price"
                                    value={newEquipmentData.Price}
                                     min="0"
                                     step="1" // Assuming integer price based on BE model
                                    onChange={(e) => setNewEquipmentData({ ...newEquipmentData, Price: e.target.value })}
                                    required
                                />
                            </div>
                             <div className={styles.formGroup}>
                                <label htmlFor="add-stock">Stock</label>
                                <input
                                    type="number"
                                    id="add-stock"
                                    value={newEquipmentData.Stock}
                                    min="0"
                                    step="1"
                                    onChange={(e) => setNewEquipmentData({ ...newEquipmentData, Stock: e.target.value })}
                                    required
                                />
                            </div>
                              <div className={styles.formGroup}>
                                <label htmlFor="add-url">Image URL (Optional)</label>
                                <input
                                    type="url"
                                    id="add-url"
                                    value={newEquipmentData.url}
                                    onChange={(e) => setNewEquipmentData({ ...newEquipmentData, url: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            {/* Remove fields not in backend: description, category, status, location, purchase_date, last_maintenance_date */}

                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit">Create Equipment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

             {/* 9. ADD: Edit Equipment Modal */}
            {showEditModal && editingEquipment && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modal}>
                        <h3>Edit Equipment (ID: {editingEquipment.EquipmentID})</h3>
                         {loading && <div className={styles.loadingIndicator}>Loading details...</div>}
                         {error && <div className={styles.error}>{error}</div>}
                        {!loading && !error && (
                            <form onSubmit={handleUpdateEquipment}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="edit-name">Name</label>
                                    <input
                                        type="text"
                                        id="edit-name"
                                        name="Name" // Name attribute matches the state key
                                        value={editingEquipment.Name}
                                        onChange={handleEditInputChange}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="edit-type">Type</label>
                                    <select
                                        id="edit-type"
                                        name="Type"
                                        value={editingEquipment.Type}
                                        onChange={handleEditInputChange}
                                        required
                                    >
                                        {/* No disabled option needed here as it should always have a value */}
                                        <option value="Racket">Racket</option>
                                        <option value="Shuttlecock">Shuttlecock</option>
                                        <option value="Shoes">Shoes</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="edit-brand">Brand (Optional)</label>
                                    <input
                                        type="text"
                                        id="edit-brand"
                                        name="Brand"
                                        value={editingEquipment.Brand || ''} // Handle null value from backend
                                        onChange={handleEditInputChange}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="edit-price">Price (VND)</label>
                                    <input
                                        type="number"
                                        id="edit-price"
                                        name="Price"
                                        value={editingEquipment.Price}
                                        min="0"
                                        step="1"
                                        onChange={handleEditInputChange}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="edit-stock">Stock</label>
                                    <input
                                        type="number"
                                        id="edit-stock"
                                        name="Stock"
                                        value={editingEquipment.Stock}
                                        min="0"
                                        step="1"
                                        onChange={handleEditInputChange}
                                        required
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="edit-url">Image URL (Optional)</label>
                                    <input
                                        type="url"
                                        id="edit-url"
                                        name="url"
                                        value={editingEquipment.url || ''} // Handle null value
                                        onChange={handleEditInputChange}
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                                <div className={styles.modalActions}>
                                    <button type="button" onClick={() => { setShowEditModal(false); setEditingEquipment(null); }}>Cancel</button>
                                    <button type="submit">Update Equipment</button>
                                </div>
                            </form>
                         )}
                    </div>
                </div>
            )}

            {showDetailModal && selectedEquipment && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modal}>
                        <h3>Equipment Details (ID: {selectedEquipment.EquipmentID})</h3>
                        <div className={styles.detailView}>
                            <div className={styles.detailItem}>
                                <label><strong>Name:</strong></label>
                                <p>{selectedEquipment.Name}</p>
                            </div>
                            <div className={styles.detailItem}>
                                <label><strong>Type:</strong></label>
                                <p>{selectedEquipment.Type}</p>
                            </div>
                            <div className={styles.detailItem}>
                                <label><strong>Brand:</strong></label>
                                <p>{selectedEquipment.Brand || 'N/A'}</p>
                            </div>
                            <div className={styles.detailItem}>
                                <label><strong>Price (VND):</strong></label>
                                <p>{selectedEquipment.Price}</p>
                            </div>
                            <div className={styles.detailItem}>
                                <label><strong>Stock:</strong></label>
                                <p>{selectedEquipment.Stock}</p>
                            </div>
                            <div className={styles.detailItem}>
                                <label><strong>Image URL:</strong></label>
                                <p>{selectedEquipment.url ? <a href={String(selectedEquipment.url)} target="_blank" rel="noopener noreferrer">Link</a> : 'No URL'}</p>
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <button type="button" onClick={() => { setShowDetailModal(false); setSelectedEquipment(null); }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default EquipmentList;