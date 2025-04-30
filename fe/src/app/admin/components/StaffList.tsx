// src/app/admin/components/StaffList.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

// --- Interface matching backend StaffDetailResponse ---
// Ensure this matches exactly what GET /admin/staff/ returns
interface Staff {
    StaffID: number;
    Username: string;
    Name: string;
    Salary: number | null;
    Phone?: string | null;      // Included from User table via JOIN in get_all_staff_admin
    JoinDate?: string | null;   // Included from User table via JOIN in get_all_staff_admin
    // Optional: Add isCoach if backend provides it to disable promote button
    // This field IS NOT currently returned by get_all_staff_admin or get_staff_by_id_admin
    // You would need to modify the backend to include this if desired.
    // isCoach?: boolean;
}

// --- Interface for Promote to Coach Request Body ---
// Matches the expected payload for PUT /admin/users/{username}/promote/coach
interface PromoteToCoachRequest {
  description: string;
  image_url: string;
}

// --- Component ---
const StaffList: React.FC = () => {
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for Modals
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [showPromoteCoachModal, setShowPromoteCoachModal] = useState(false);

    // State for selected item for actions
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null); // For Edit modal form state
    const [originalStaffData, setOriginalStaffData] = useState<Staff | null>(null); // Store original data when opening edit modal
    const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null); // For Delete confirm
    const [staffToPromote, setStaffToPromote] = useState<Staff | null>(null); // For Promote modal

    // State for form data in promote modal
    const [promoteFormData, setPromoteFormData] = useState<Partial<PromoteToCoachRequest>>({});

    const { token } = useAuth();

    // Memoize the API client creation
    const getApiClient = useCallback(() => {
        if (!token) return null;
        return createApiClient(token);
    }, [token]);

    // --- Fetch Staff Data (Connects to GET /admin/staff/) ---
    const fetchStaff = useCallback(async () => {
        const api = getApiClient();
        if (!api) {
            setError("Authentication token not found.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            // Connects to GET /admin/staff/ defined in admin_staff_router
            const response = await api.get("/admin/staff/");
            setStaff(response.data);
        } catch (err: any) {
            console.error("Error fetching staff:", err);
            const errorMsg = err.response?.data?.detail || "Failed to load staff data. Please try again.";
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [getApiClient]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    // --- Modal Open Handlers ---
    const handleOpenEditModal = (staffMember: Staff) => {
        // Fetch fresh details to ensure we have the latest data including phone/join date
        // Connects to GET /admin/staff/{staff_id} defined in admin_staff_router
        const api = getApiClient();
        if (!api) return;
        setLoading(true);
        setError(null); // Clear previous errors
        api.get(`/admin/staff/${staffMember.StaffID}`)
            .then(response => {
                setSelectedStaff(response.data); // Set data for the modal form
                setOriginalStaffData(response.data); // Store original data for comparison on save
                setShowEditModal(true);
            })
            .catch(err => {
                console.error("Error fetching staff details:", err);
                setError(err.response?.data?.detail || "Failed to load staff details.");
            })
            .finally(() => setLoading(false));
    };

    const handleOpenDeleteModal = (staffMember: Staff) => {
        setStaffToDelete(staffMember);
        setShowDeleteConfirmModal(true);
    }

     const handleOpenPromoteModal = (staffMember: Staff) => {
        setStaffToPromote(staffMember);
        setPromoteFormData({ description: '', image_url: '' }); // Reset form
        setShowPromoteCoachModal(true);
        setError(null); // Clear previous errors
    }

    // --- Modal Close Handlers ---
    const handleCloseModals = () => {
        setShowEditModal(false);
        setShowDeleteConfirmModal(false);
        setShowPromoteCoachModal(false);
        setSelectedStaff(null);
        setOriginalStaffData(null);
        setStaffToDelete(null);
        setStaffToPromote(null);
        setError(null); // Clear error on close
    };


    // --- Action Handlers ---

    // EDIT/UPDATE Staff (Connects to PUT /admin/users/{username} and PUT /admin/staff/{staff_id})
    const handleUpdateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        const api = getApiClient();
        // Ensure we have the edited data (selectedStaff) and the original data for comparison
        if (!selectedStaff || !originalStaffData || !api) return;

        setLoading(true);
        setError(null);
        let userApiCalled = false;
        let staffApiCalled = false;

        // 1. Prepare Payloads based on changes
        const userUpdatePayload: { name?: string; phone?: string | null } = {}; // Allow null for phone
        const staffUpdatePayload: { salary?: number | null } = {}; // Allow null for salary if backend supports it

        // Compare edited data (selectedStaff) with original data (originalStaffData)
        if (selectedStaff.Name !== originalStaffData.Name) {
            userUpdatePayload.name = selectedStaff.Name;
        }
        // Handle phone potentially being null or empty string vs original
        const currentPhone = selectedStaff.Phone || null; // Treat empty string as null for comparison/payload
        const originalPhone = originalStaffData.Phone || null;
        if (currentPhone !== originalPhone) {
            userUpdatePayload.phone = currentPhone; // Send null if cleared, or the new value
        }

        // Handle salary potentially being null or empty string vs original
        // Backend StaffUpdateRequest expects Optional[int], so null is valid if clearing, number if setting.
        const currentSalary = selectedStaff.Salary // Can be number or null from input handler
        const originalSalary = originalStaffData.Salary;
        if (currentSalary !== originalSalary) {
            // Ensure salary is a positive integer or null if allowed by backend logic/DB
            if (currentSalary !== null && currentSalary <= 0) {
                 setError("Salary must be a positive number.");
                 setLoading(false);
                 return;
            }
            staffUpdatePayload.salary = currentSalary;
        }


        try {
            // 2. Call User Update API if needed
            // Connects to PUT /admin/users/{username} (defined in user.py, likely via an admin_user_router)
            if (Object.keys(userUpdatePayload).length > 0) {
                console.log(`Updating user ${selectedStaff.Username}:`, userUpdatePayload);
                await api.put(`/admin/users/${selectedStaff.Username}`, userUpdatePayload);
                userApiCalled = true;
            }

            // 3. Call Staff Update API if needed
            // Connects to PUT /admin/staff/{staff_id} (defined in admin_staff_router)
            if (Object.keys(staffUpdatePayload).length > 0) {
                 console.log(`Updating staff ${selectedStaff.StaffID}:`, staffUpdatePayload);
                // The StaffUpdateRequest Pydantic model only contains 'salary'
                await api.put(`/admin/staff/${selectedStaff.StaffID}`, staffUpdatePayload);
                staffApiCalled = true;
            }

            // 4. Close modal and refresh list if any update occurred
            if (userApiCalled || staffApiCalled) {
                handleCloseModals();
                await fetchStaff(); // Refresh the list
            } else {
                 // No changes detected, just close modal
                 handleCloseModals();
            }

        } catch (err: any) {
            console.error("Error updating staff:", err);
            const updateError = err.response?.data?.detail || "Failed to update staff. Please check details and try again.";
            setError(updateError); // Show error to user within the modal
        } finally {
            setLoading(false);
        }
    };

    // DELETE Staff (Connects to DELETE /admin/users/{username})
    const handleDeleteStaff = async () => {
        const api = getApiClient();
        if (!staffToDelete || !api) return;

        setLoading(true);
        setError(null);
        try {
            console.log(`Deleting user ${staffToDelete.Username}`);
            // Connects to DELETE /admin/users/{username} defined in user.py (likely via admin_user_router)
            await api.delete(`/admin/users/${staffToDelete.Username}`);
            handleCloseModals();
            await fetchStaff(); // Refresh list
        } catch (err: any) {
             console.error("Error deleting staff:", err);
             const errorMsg = err.response?.data?.detail || "Failed to delete staff. They might be referenced elsewhere (e.g., bookings, sessions).";
             // Show error in main view after closing modal
             setShowDeleteConfirmModal(false); // Close modal first
             setStaffToDelete(null)
             setError(errorMsg); // Show error in main view
        } finally {
            setLoading(false);
        }
    }

    // PROMOTE Staff to Coach (Connects to PUT /admin/users/{username}/promote/coach)
    const handlePromoteStaffToCoach = async (e: React.FormEvent) => {
        e.preventDefault();
        const api = getApiClient();
        if (!staffToPromote || !promoteFormData.description || !promoteFormData.image_url || !api) {
             setError("Description and Image URL are required to promote to coach.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
             const payload: PromoteToCoachRequest = {
                description: promoteFormData.description,
                image_url: promoteFormData.image_url,
            };
            console.log(`Promoting user ${staffToPromote.Username} to coach with payload:`, payload);
             // Connects to PUT /admin/users/{username}/promote/coach defined in user.py (likely via admin_user_router)
            await api.put(`/admin/users/${staffToPromote.Username}/promote/coach`, payload);
            handleCloseModals();
            await fetchStaff(); // Refresh list
            // Optional: Add a success message state if needed
        } catch (err: any) {
             console.error("Error promoting staff to coach:", err);
             const errorMsg = err.response?.data?.detail || "Failed to promote staff.";
             // Show error within the promote modal
             setError(errorMsg);
        } finally {
            setLoading(false);
        }
    }

    // --- Input Change Handlers ---
    const handleEditModalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedStaff) return;
        const { id, value, type } = e.target;

        // Use functional update form of setState with explicit type for 'prev'
        setSelectedStaff((prev: Staff | null): Staff | null => {
            if (!prev) return null; // Should not happen if modal is open, but type safety
            return {
                ...prev,
                // Use id directly as key, assuming id matches Staff interface keys (Name, Phone, Salary)
                [id]: type === 'number'
                    ? (value === '' ? null : parseInt(value, 10)) // Store null if empty, otherwise parse int
                    : value,
            };
        });
    };

     const handlePromoteModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
         // Use functional update form of setState with explicit type for 'prev'
        setPromoteFormData((prev: Partial<PromoteToCoachRequest>): Partial<PromoteToCoachRequest> => ({
            ...prev,
            [name]: value // name should be 'description' or 'image_url'
        }));
    };

    // --- Render Logic ---
    if (loading && staff.length === 0)
        return <div className={styles.loadingIndicator}>Loading staff data...</div>;

    return (
        <div className={styles.listContainer}>
            <div className={styles.listHeader}>
                <h2>Staff Management</h2>
            </div>
            {/* Persistent error display at the top */}
            {error && !showEditModal && !showDeleteConfirmModal && !showPromoteCoachModal && (
                 <div className={`${styles.error} ${styles.persistentError}`}>
                    {error}
                    <button onClick={() => setError(null)} className={styles.closeButton}>X</button>
                 </div>
            )}
            {/* Show subtle loading indicator during actions */}
            {loading && <div className={styles.loadingIndicatorSmall}>Processing...</div>}

            {/* No "Add New Staff" button as admin creates users via general user management */}

            <table className={styles.dataTable}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Salary</th>
                        <th>Join Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {staff.map((member) => (
                        <tr key={member.StaffID}>
                            <td>{member.StaffID ?? 'N/A'}</td>
                            <td>{member.Username || 'N/A'}</td>
                            <td>{member.Name || 'Name Missing'}</td>
                            <td>{member.Phone || 'N/A'}</td>
                            <td>
                                {typeof member.Salary === 'number'
                                ? member.Salary.toLocaleString('vi-VN') + ' VND' // Example using Vietnamese locale for currency
                                : 'N/A'}
                            </td>
                            <td>
                                {member.JoinDate && !isNaN(new Date(member.JoinDate).getTime())
                                ? new Date(member.JoinDate).toLocaleDateString() // Or use a more specific format
                                : member.JoinDate ? 'Invalid Date' : 'N/A'}
                            </td>
                            <td className={styles.actionCell}>
                                <button
                                    title="Edit Staff Details"
                                    className={`${styles.actionButton} ${styles.editButton}`}
                                    onClick={() => handleOpenEditModal(member)}
                                    disabled={loading}
                                >
                                    Edit
                                </button>
                                <button
                                    title="Promote to Coach"
                                    className={`${styles.actionButton} ${styles.promoteButton}`}
                                    onClick={() => handleOpenPromoteModal(member)}
                                    // Disable if already a coach (requires backend to send 'isCoach' flag)
                                    // disabled={loading || member.isCoach}
                                    disabled={loading}
                                >
                                    Promote
                                </button>
                                <button
                                    title="Delete Staff"
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    onClick={() => handleOpenDeleteModal(member)}
                                    disabled={loading}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {staff.length === 0 && !loading && !error && (
                <div className={styles.emptyMessage}>
                    No staff members found.
                </div>
            )}

            {/* --- Modals --- */}

            {/* Edit Staff Modal */}
            {showEditModal && selectedStaff && (
                <div className={styles.modalBackdrop} onClick={handleCloseModals}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3>Edit Staff: {selectedStaff.Username}</h3>
                        {/* Display error specific to this modal */}
                        {error && <p className={`${styles.error} ${styles.modalError}`}>{error}</p>}
                        <form onSubmit={handleUpdateStaff}>
                            {/* Edit Name (uses PUT /admin/users/{username}) */}
                            <div className={styles.formGroup}>
                                <label htmlFor="Name">Name</label>
                                <input type="text" id="Name" value={selectedStaff.Name ?? ''} onChange={handleEditModalInputChange} required />
                            </div>
                             {/* Edit Phone (uses PUT /admin/users/{username}) */}
                             <div className={styles.formGroup}>
                                <label htmlFor="Phone">Phone</label>
                                <input type="tel" id="Phone" value={selectedStaff.Phone ?? ''} onChange={handleEditModalInputChange} placeholder="Optional phone number"/>
                            </div>
                            {/* Edit Salary (uses PUT /admin/staff/{staff_id}) */}
                            <div className={styles.formGroup}>
                                <label htmlFor="Salary">Salary (VND)</label>
                                {/* Using text type allows empty string for null, handle parsing in change handler */}
                                <input type="number" id="Salary" value={selectedStaff.Salary ?? ''} onChange={handleEditModalInputChange} placeholder="Optional salary" min="0" step="1000" />
                            </div>
                            {/* Display Username and ID (read-only) */}
                            <div className={styles.formGroup}>
                                <label>Username</label>
                                <input type="text" value={selectedStaff.Username} readOnly disabled />
                            </div>
                             <div className={styles.formGroup}>
                                <label>Staff ID</label>
                                <input type="text" value={selectedStaff.StaffID} readOnly disabled />
                            </div>

                            <div className={styles.modalActions}>
                                <button type="button" onClick={handleCloseModals} disabled={loading}>Cancel</button>
                                <button type="submit" disabled={loading}>
                                    {loading ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmModal && staffToDelete && (
                 <div className={styles.modalBackdrop} onClick={handleCloseModals}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3>Confirm Deletion</h3>
                        <p>Are you sure you want to delete staff member <strong>{staffToDelete.Name}</strong> ({staffToDelete.Username})?</p>
                        <p className={styles.warningText}>This action is permanent and cannot be undone. Related records (e.g., coach details) will also be removed. Ensure this user has no active dependencies (bookings, etc.) if constraints exist.</p>
                         <div className={styles.modalActions}>
                            <button type="button" onClick={handleCloseModals} disabled={loading}>Cancel</button>
                            <button type="button" onClick={handleDeleteStaff} className={styles.deleteButton} disabled={loading}>
                                {loading ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                         {/* Error display specific to delete confirmation can be added here if needed */}
                    </div>
                </div>
            )}

             {/* Promote to Coach Modal */}
            {showPromoteCoachModal && staffToPromote && (
                 <div className={styles.modalBackdrop} onClick={handleCloseModals}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3>Promote {staffToPromote.Name} to Coach</h3>
                         {/* Display error specific to this modal */}
                        {error && <p className={`${styles.error} ${styles.modalError}`}>{error}</p>}
                        <form onSubmit={handlePromoteStaffToCoach}>
                            <div className={styles.formGroup}>
                                <label htmlFor="promote-description">Coach Description*</label>
                                <textarea id="promote-description" name="description" rows={3} value={promoteFormData.description || ''} onChange={handlePromoteModalInputChange} required />
                            </div>
                             <div className={styles.formGroup}>
                                <label htmlFor="promote-image_url">Image URL*</label>
                                <input type="url" id="promote-image_url" name="image_url" value={promoteFormData.image_url || ''} onChange={handlePromoteModalInputChange} required placeholder="https://example.com/image.jpg"/>
                            </div>
                             <div className={styles.modalActions}>
                                <button type="button" onClick={handleCloseModals} disabled={loading}>Cancel</button>
                                <button type="submit" className={styles.promoteButton} disabled={loading}>
                                    {loading ? 'Promoting...' : 'Promote to Coach'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div> // End listContainer
    );
};

export default StaffList;