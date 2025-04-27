// src/app/admin/components/EnrollmentList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

// Updated interface to match backend's EnrollmentDetailResponse
interface Enrollment {
    CustomerID: number;
    SessionID: number;
    CustomerName?: string | null; // Optional as per backend model
    SessionDetails?: string | null; // Optional as per backend model
    // Removed: id, user_id, username, session_id, session_title, enrollment_date, status
}

const EnrollmentList: React.FC = () => {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    // Updated state to match backend request model
    const [newEnrollment, setNewEnrollment] = useState({
        CustomerID: "",
        SessionID: "",
    });

    // Get token from your auth context or localStorage
    const { token } = useAuth();
    const api = createApiClient(token); // Assumes createApiClient sets the auth header

    useEffect(() => {
        fetchEnrollments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Dependency array includes api if it can change, otherwise leave empty

    const fetchEnrollments = async () => {
        setLoading(true);
        try {
            // GET path matches backend
            const response = await api.get("/admin/enrollments/");
            // Assuming response.data directly contains the array of enrollments
            setEnrollments(response.data);
            setError(null);
        } catch (err: any) {
            console.error("Error fetching enrollments:", err);
            const errorMsg = err.response?.data?.detail || "Failed to load enrollments. Please try again.";
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEnrollment = async (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validation for numeric input
        if (isNaN(parseInt(newEnrollment.CustomerID)) || isNaN(parseInt(newEnrollment.SessionID))) {
            alert("Customer ID and Session ID must be valid numbers.");
            return;
        }

        try {
            // POST path and body match backend
            await api.post("/admin/enrollments/", {
                CustomerID: parseInt(newEnrollment.CustomerID),
                SessionID: parseInt(newEnrollment.SessionID),
            });
            setShowAddModal(false);
            // Reset state with correct field names
            setNewEnrollment({
                CustomerID: "",
                SessionID: "",
            });
            fetchEnrollments(); // Refresh the list
        } catch (err: any) {
            console.error("Error creating enrollment:", err);
            const errorMsg = err.response?.data?.detail || "Failed to create enrollment. Please try again.";
            alert(`Failed to create enrollment: ${errorMsg}`);
        }
    };

    // Updated function signature and API call for delete
    const handleDeleteEnrollment = async (customerId: number, sessionId: number) => {
        if (
            window.confirm(`Are you sure you want to delete the enrollment for Customer ID ${customerId} in Session ID ${sessionId}?`)
        ) {
            try {
                // DELETE path and body match backend
                await api.delete(`/admin/enrollments/`, {
                    data: { CustomerID: customerId, SessionID: sessionId },
                });
                fetchEnrollments(); // Refresh the list
            } catch (err: any) {
                console.error("Error deleting enrollment:", err);
                const errorMsg = err.response?.data?.detail || "Failed to delete enrollment. Please try again.";
                alert(`Failed to delete enrollment: ${errorMsg}`);
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

            {/* Updated Table Structure */}
            <table className={styles.dataTable}>
                <thead>
                    <tr>
                        <th>Customer ID</th>
                        <th>Customer Name</th>
                        <th>Session ID</th>
                        <th>Session Details</th>
                        {/* Removed Enrollment Date and Status */}
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {enrollments.map((enrollment) => (
                        // Use composite key
                        <tr key={`${enrollment.CustomerID}-${enrollment.SessionID}`}>
                            <td>{enrollment.CustomerID}</td>
                            <td>{enrollment.CustomerName ?? 'N/A'}</td> {/* Handle optional field */}
                            <td>{enrollment.SessionID}</td>
                            <td>{enrollment.SessionDetails ?? 'N/A'}</td> {/* Handle optional field */}
                            {/* Removed date and status cells */}
                            <td>
                                <button
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    // Pass CustomerID and SessionID to delete handler
                                    onClick={() =>
                                        handleDeleteEnrollment(enrollment.CustomerID, enrollment.SessionID)
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

            {/* Add Enrollment Modal - Updated Form */}
            {showAddModal && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modal}>
                        <h3>Add New Enrollment</h3>
                        <form onSubmit={handleCreateEnrollment}>
                            {/* Updated Customer ID input */}
                            <div className={styles.formGroup}>
                                <label htmlFor="CustomerID">Customer ID</label>
                                <input
                                    type="number"
                                    id="CustomerID"
                                    value={newEnrollment.CustomerID}
                                    onChange={(e) =>
                                        setNewEnrollment({
                                            ...newEnrollment,
                                            CustomerID: e.target.value,
                                        })
                                    }
                                    required
                                    min="1"
                                />
                            </div>
                            {/* Updated Session ID input */}
                            <div className={styles.formGroup}>
                                <label htmlFor="SessionID">Session ID</label>
                                <input
                                    type="number"
                                    id="SessionID"
                                    value={newEnrollment.SessionID}
                                    onChange={(e) =>
                                        setNewEnrollment({
                                            ...newEnrollment,
                                            SessionID: e.target.value,
                                        })
                                    }
                                    required
                                    min="1"
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    className={styles.cancelButton} // Assuming a style for cancel
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className={styles.confirmButton}> {/* Assuming a style for confirm */}
                                    Create Enrollment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnrollmentList;