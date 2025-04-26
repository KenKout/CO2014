// src/app/admin/components/CoachList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

// Update interface to match backend response model
interface Coach {
    StaffID: number;
    Username: string;
    Name: string;
    Description: string | null;
    url: string | null; // image_url from backend
    Phone: string | null;
    JoinDate: string | null;
}

const CoachList: React.FC = () => {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [debugInfo, setDebugInfo] = useState<string>("");

    // Get token from your auth context or localStorage
    const { token } = useAuth();
    const api = createApiClient(token);

    useEffect(() => {
        fetchCoaches();
    }, []);

    const fetchCoaches = async () => {
        setLoading(true);
        setError(null);
        try {
            // Check if the API endpoint matches the backend route
            const response = await api.get("/admin/coaches");
            console.log("Coach data response:", response.data);
            setDebugInfo(JSON.stringify(response.data, null, 2).substring(0, 200) + "...");
            
            if (Array.isArray(response.data)) {
                setCoaches(response.data);
            } else {
                setError("Unexpected data format received from server");
                console.error("Unexpected data format:", response.data);
            }
        } catch (err: any) {
            console.error("Error fetching coaches:", err);
            setError(`Failed to load coach data: ${err.message || "Unknown error"}. 
                      Status: ${err.response?.status || "N/A"}. 
                      Details: ${err.response?.data?.detail || "No details"}`);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async (staffId: number) => {
        try {
            const response = await api.get(`/admin/coaches/${staffId}`);
            console.log("Coach detail response:", response.data);
            setSelectedCoach(response.data);
            setShowEditModal(true);
        } catch (err: any) {
            console.error("Error fetching coach details:", err);
            alert(`Failed to load coach details: ${err.message || "Please try again."}`);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCoach) return;

        try {
            // Only send fields that can be updated according to backend
            const updateData = {
                description: selectedCoach.Description,
                url: selectedCoach.url, // Use url as per backend requirement
            };
            console.log("Sending update with data:", updateData);
            
            const response = await api.put(`/admin/coaches/${selectedCoach.StaffID}`, updateData);
            console.log("Update response:", response.data);
            
            setShowEditModal(false);
            fetchCoaches(); // Refresh the list
        } catch (err: any) {
            console.error("Error updating coach:", err);
            alert(`Failed to update coach: ${err.message || "Please try again."}`);
        }
    };

    return (
        <div className={styles.listContainer}>
            <h2>Coaches</h2>
            
            {/* Debug information - remove in production */}
            {debugInfo && (
                <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5', fontSize: '12px' }}>
                    <strong>Debug Info:</strong>
                    <pre>{debugInfo}</pre>
                    <button onClick={fetchCoaches}>Retry Loading</button>
                </div>
            )}
            
            {loading && (
                <div className={styles.loadingIndicator}>Loading coach data...</div>
            )}
            
            {error && (
                <div className={styles.error}>
                    <p>{error}</p>
                    <button onClick={fetchCoaches}>Retry</button>
                </div>
            )}

            {!loading && !error && (
                <>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Username</th>
                                <th>Phone</th>
                                <th>Join Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coaches.map((coach) => (
                                <tr key={coach.StaffID}>
                                    <td>{coach.StaffID}</td>
                                    <td>{coach.Name}</td>
                                    <td>{coach.Username}</td>
                                    <td>{coach.Phone || "N/A"}</td>
                                    <td>{coach.JoinDate || "N/A"}</td>
                                    <td>
                                        <button
                                            className={styles.actionButton}
                                            onClick={() => handleEdit(coach.StaffID)}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {coaches.length === 0 && (
                        <div className={styles.emptyMessage}>No coaches found.</div>
                    )}
                </>
            )}

            {/* Edit Coach Modal */}
            {showEditModal && selectedCoach && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modal}>
                        <h3>Edit Coach: {selectedCoach.Name}</h3>
                        <form onSubmit={handleUpdate}>
                            {/* Only include editable fields according to backend */}
                            <div className={styles.formGroup}>
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    value={selectedCoach.Description || ""}
                                    onChange={(e) =>
                                        setSelectedCoach({
                                            ...selectedCoach,
                                            Description: e.target.value,
                                        })
                                    }
                                    rows={4}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="imageUrl">Image URL</label>
                                <input
                                    type="text"
                                    id="imageUrl"
                                    value={selectedCoach.url || ""}
                                    onChange={(e) =>
                                        setSelectedCoach({
                                            ...selectedCoach,
                                            url: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            {/* Display other fields as read-only */}
                            <div className={styles.formGroup}>
                                <label>Username</label>
                                <input
                                    type="text"
                                    value={selectedCoach.Username}
                                    disabled
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Phone</label>
                                <input
                                    type="text"
                                    value={selectedCoach.Phone || "N/A"}
                                    disabled
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Join Date</label>
                                <input
                                    type="text"
                                    value={selectedCoach.JoinDate || "N/A"}
                                    disabled
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