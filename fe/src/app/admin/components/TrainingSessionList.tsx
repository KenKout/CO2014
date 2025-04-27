// src/app/admin/components/TrainingSessionList.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

// --- Interfaces (Keep ScheduleSlot if you manage slots in the form) ---
interface ScheduleSlot {
    StartTime: string;
    EndTime: string;
}

// Interface for data received from GET /admin/training-sessions/
interface TrainingSession extends TrainingSessionAdminResponseBase {
    // Fields specific to the GET list/detail response (already in base)
}

// Interface for the base structure matching backend AdminTrainingSessionResponse
// Useful for defining form state structure
interface TrainingSessionAdminResponseBase {
    SessionID: number;
    StartDate: string;
    EndDate: string;
    CoachID: number;
    CourtID: number;
    Schedule?: string | null;
    Type: "Beginner" | "Intermediate" | "Advanced"; // Match backend enum values
    Status: "Available" | "Unavailable"; // Match backend enum values
    Price: number;
    Max_Students: number;
    Rating?: number | null;
    CoachName?: string | null;
    coach_image_url?: string | null;
    CourtInfo?: string | null;
    schedule_slots?: ScheduleSlot[] | null;
}

// Interface for the form data (strings for inputs, matching base structure)
// Handles both create and edit modes
interface SessionFormData {
    SessionID: string; // Required for create, used as key but not sent in PUT body
    StartDate: string; // Format: yyyy-MM-ddTHH:mm
    EndDate: string;   // Format: yyyy-MM-ddTHH:mm
    CoachID: string;
    CourtID: string;
    Type: "Beginner" | "Intermediate" | "Advanced"; // Match backend enum values
    Status: "Available" | "Unavailable"; // Match backend enum values
    Price: string;
    Max_Students: string;
    Schedule: string;
    Rating: string; // Keep as string for input
    // Add schedule_slots management if needed for form
    schedule_slots: ScheduleSlotFormData[];
}

// Interface for schedule slots within the form data (strings for inputs)
interface ScheduleSlotFormData {
    StartTime: string; // Format: yyyy-MM-ddTHH:mm
    EndTime: string;   // Format: yyyy-MM-ddTHH:mm
}

// --- Initial state for the form (create/edit) ---
const initialFormData: SessionFormData = {
    SessionID: "",
    StartDate: "",
    EndDate: "",
    CoachID: "",
    CourtID: "",
    Type: "Beginner", // Updated to match backend enum
    Status: "Available", // Updated to match backend enum
    Price: "0",
    Max_Students: "10",
    Schedule: "",
    Rating: "",
    schedule_slots: [],
};

// Helper function to format ISO date string for datetime-local input
const formatDateTimeLocal = (isoString?: string | null): string => {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        // Check if date is valid
        if (isNaN(date.getTime())) return '';
        // Adjust for timezone offset to display correctly in local time input
        const timezoneOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
        const localISOTime = new Date(date.getTime() - timezoneOffset)
            .toISOString()
            .slice(0, 16);
        return localISOTime;
    } catch (e) {
        console.error("Error formatting date:", isoString, e);
        return '';
    }
};

const formatVND = (price: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
};

// Helper function to format slot data for the form
const formatSlotsForForm = (slots?: ScheduleSlot[] | null): ScheduleSlotFormData[] => {
     return (slots || []).map(slot => ({
        StartTime: formatDateTimeLocal(slot.StartTime),
        EndTime: formatDateTimeLocal(slot.EndTime)
    }));
};

// Helper function to format form date string back to ISO string for backend
const formatFormDateTimeISO = (formDateTime: string): string | null => {
     if (!formDateTime) return null;
    try {
        return new Date(formDateTime).toISOString();
    } catch (e) {
        console.error("Error formatting form date to ISO:", formDateTime, e);
        return null; // Indicate error or handle appropriately
    }
};

const TrainingSessionList: React.FC = () => {
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Modal and Form State ---
    const [showModal, setShowModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState<SessionFormData>(initialFormData);
    const [currentSessionId, setCurrentSessionId] = useState<number | null>(null); // Track ID being edited

    const { token } = useAuth();
    const api = createApiClient(token);

    const fetchSessions = useCallback(async () => { // Wrap in useCallback
        setLoading(true);
        setError(null); // Clear previous errors
        try {
            const response = await api.get("/admin/training-sessions/");
            console.log("Fetched sessions:", response.data);
            setSessions(response.data || []);
        } catch (err) {
            console.error("Error fetching training sessions:", err);
            setError("Failed to load training sessions. Please try again.");
            setSessions([]);
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [api]); // Dependency: api instance (if it can change based on token)

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]); // Fetch on initial mount and when fetchSessions changes

    // --- Modal Open/Close Handlers ---
    const handleOpenCreateModal = () => {
        setIsEditMode(false);
        setFormData(initialFormData); // Reset form for create
        setCurrentSessionId(null);
        setShowModal(true);
    };

    const handleOpenEditModal = (session: TrainingSession) => {
        setIsEditMode(true);
        setCurrentSessionId(session.SessionID);
        // Populate form data from the session, formatting dates and slots
        setFormData({
            SessionID: session.SessionID.toString(), // Keep SessionID for reference if needed, but don't send in PUT body
            StartDate: formatDateTimeLocal(session.StartDate),
            EndDate: formatDateTimeLocal(session.EndDate),
            CoachID: session.CoachID.toString(),
            CourtID: session.CourtID.toString(),
            Type: session.Type, // This will now correctly match the backend enum
            Status: session.Status, // This will now correctly match the backend enum
            Price: session.Price.toString(),
            Max_Students: session.Max_Students.toString(),
            Schedule: session.Schedule || "",
            Rating: session.Rating?.toString() || "",
            schedule_slots: formatSlotsForForm(session.schedule_slots),
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        // Consider resetting form state here if desired when modal closes unexpectedly
        // setFormData(initialFormData);
    };

    // --- Form Input Change Handler ---
    const handleFormChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

     // --- Schedule Slot Handlers ---
    const handleSlotChange = (index: number, field: keyof ScheduleSlotFormData, value: string) => {
        setFormData(prev => {
            const newSlots = [...prev.schedule_slots];
            newSlots[index] = { ...newSlots[index], [field]: value };
            return { ...prev, schedule_slots: newSlots };
        });
    };

    const addSlot = () => {
        setFormData(prev => ({
            ...prev,
            schedule_slots: [...prev.schedule_slots, { StartTime: '', EndTime: '' }]
        }));
    };

    const removeSlot = (index: number) => {
        setFormData(prev => ({
            ...prev,
            schedule_slots: prev.schedule_slots.filter((_, i) => i !== index)
        }));
    };


    // --- Form Submission (Create or Update) ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // --- Prepare Payload ---
        // Base payload structure, adjust fields based on edit/create
        const basePayload = {
            StartDate: formatFormDateTimeISO(formData.StartDate),
            EndDate: formatFormDateTimeISO(formData.EndDate),
            CoachID: parseInt(formData.CoachID, 10),
            CourtID: parseInt(formData.CourtID, 10),
            Type: formData.Type,
            Status: formData.Status,
            Price: parseInt(formData.Price, 10),
            Max_Students: parseInt(formData.Max_Students, 10),
            Schedule: formData.Schedule.trim() || null, // Send null if empty/whitespace only
            Rating: formData.Rating === "" ? null : parseFloat(formData.Rating), // Allow null rating
             // Format slots for backend
            schedule_slots: formData.schedule_slots.map(slot => ({
                    StartTime: formatFormDateTimeISO(slot.StartTime),
                    EndTime: formatFormDateTimeISO(slot.EndTime)
            })).filter(slot => slot.StartTime && slot.EndTime), // Ensure both dates are valid after formatting
        };

        // --- Validation (Example) ---
        if (isNaN(basePayload.CoachID) || basePayload.CoachID <= 0) return alert("Invalid Coach ID.");
        if (isNaN(basePayload.CourtID) || basePayload.CourtID <= 0) return alert("Invalid Court ID.");
        if (isNaN(basePayload.Price) || basePayload.Price < 0) return alert("Invalid Price.");
        if (isNaN(basePayload.Max_Students) || basePayload.Max_Students <= 0) return alert("Invalid Max Capacity.");
        if (!basePayload.StartDate || !basePayload.EndDate) return alert("Start and End Date/Time are required.");
        if (new Date(basePayload.EndDate) <= new Date(basePayload.StartDate)) return alert("End Date/Time must be after Start Date/Time.");
        if (basePayload.Rating !== null && (isNaN(basePayload.Rating) || basePayload.Rating < 0 || basePayload.Rating > 5)) return alert("Invalid Rating (must be 0-5 or empty).");
        // Validate schedule slots are within session bounds (complex, do on backend or add FE logic)


        try {
            if (isEditMode && currentSessionId) {
                // --- UPDATE (PUT) ---
                // Backend expects only fields to update, but sending all is often fine
                // if the Pydantic model handles exclude_unset=True or similar.
                // Let's send all fields compatible with AdminTrainingSessionUpdateRequest.
                await api.put(`/admin/training-sessions/${currentSessionId}`, basePayload);
                alert("Session updated successfully!");
            } else {
                // --- CREATE (POST) ---
                const sessionIdNum = parseInt(formData.SessionID, 10);
                if (isNaN(sessionIdNum) || sessionIdNum <= 0) return alert("Valid Session ID is required for creation.");

                const createPayload = {
                    ...basePayload,
                    SessionID: sessionIdNum, // Add SessionID only for create
                };
                await api.post("/admin/training-sessions/", createPayload);
                 alert("Session created successfully!");
            }
            handleCloseModal();
            fetchSessions(); // Refresh list
        } catch (err: any) {
            console.error(`Error ${isEditMode ? 'updating' : 'creating'} session:`, err);
            const errorMsg = err.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'create'} session.`;
            alert(`Error: ${errorMsg}`);
        }
    };


    // --- Delete Handler ---
    const handleDeleteSession = async (sessionId: number) => {
        if (window.confirm(`Are you sure you want to delete training session ID: ${sessionId}?`)) {
            // Optional: Indicate loading specific to delete if needed
            try {
                await api.delete(`/admin/training-sessions/${sessionId}`);
                alert(`Training session ${sessionId} deleted successfully.`);
                fetchSessions(); // Refresh list from server
            } catch (err: any) {
                console.error("Error deleting training session:", err);
                const errorMsg = err.response?.data?.detail || "Failed to delete session.";
                alert(`Error: ${errorMsg}`);
            }
        }
    };

    // --- Loading and Error States ---
    if (loading && sessions.length === 0) // Show loading only on initial load or full refresh
        return <div className={styles.loadingIndicator}>Loading training sessions...</div>;
    if (error) return <div className={styles.error}>{error}</div>;

    // --- Main Component Render ---
    return (
        <div className={styles.listContainer}>
            {/* --- Header --- */}
            <div className={styles.listHeader}>
                <h2>Training Session Management</h2>
                <button className={styles.addButton} onClick={handleOpenCreateModal}>
                    Add New Session
                </button>
            </div>

            {/* --- Sessions Table --- */}
            <table className={styles.dataTable}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Coach</th>
                        <th>Court</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Capacity</th>
                        <th>Price</th>
                        <th>Status</th>
                         <th>Slots</th> {/* Added Schedule Slots column */}
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.map((session) => (
                        <tr key={session.SessionID}>
                            <td>{session.SessionID}</td>
                            <td>{session.Type}</td>
                            <td>{session.CoachName || `ID: ${session.CoachID}`}</td>
                            <td>{session.CourtInfo || `ID: ${session.CourtID}`}</td>
                            <td>{new Date(session.StartDate).toLocaleString()}</td>
                            <td>{new Date(session.EndDate).toLocaleString()}</td>
                            <td>{session.Max_Students}</td>
                            <td>{formatVND(session.Price)}</td>
                            <td>
                                <span className={`${styles.statusBadge} ${styles[session.Status.toLowerCase()] || ''}`}>
                                    {session.Status}
                                </span>
                            </td>
                             {/* Display number of schedule slots */}
                             <td>{session.schedule_slots?.length || 0}</td>
                            <td>
                                {/* EDIT Button */}
                                <button
                                    className={styles.actionButton}
                                    onClick={() => handleOpenEditModal(session)}
                                >
                                    Edit
                                </button>
                                {/* DELETE Button */}
                                <button
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    onClick={() => handleDeleteSession(session.SessionID)}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* --- Empty State --- */}
            {sessions.length === 0 && !loading && (
                <div className={styles.emptyMessage}>
                    No training sessions found.
                </div>
            )}

             {/* --- Add/Edit Modal --- */}
            {showModal && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modal}>
                        <h3>{isEditMode ? 'Edit Training Session' : 'Add New Training Session'}</h3>
                        <form onSubmit={handleSubmit}>
                            {/* --- Form Fields --- */}
                            {/* SessionID (only for create, maybe show disabled for edit) */}
                            {!isEditMode ? (
                                <div className={styles.formGroup}>
                                    <label htmlFor="SessionID">Session ID*</label>
                                    <input type="number" id="SessionID" name="SessionID" value={formData.SessionID} onChange={handleFormChange} min="1" required={!isEditMode}/>
                                </div>
                            ) : (
                                 <p>Editing Session ID: <strong>{currentSessionId}</strong></p>
                            )}

                            {/* Other fields reuse the same structure */}
                            <div className={styles.formGroup}>
                                <label htmlFor="Type">Type*</label>
                                <select id="Type" name="Type" value={formData.Type} onChange={handleFormChange} required>
                                    <option value="Beginner">Beginner</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="CoachID">Coach ID*</label>
                                <input type="number" id="CoachID" name="CoachID" value={formData.CoachID} onChange={handleFormChange} min="1" required/>
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="CourtID">Court ID*</label>
                                <input type="number" id="CourtID" name="CourtID" value={formData.CourtID} onChange={handleFormChange} min="1" required/>
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="StartDate">Start Date/Time*</label>
                                <input type="datetime-local" id="StartDate" name="StartDate" value={formData.StartDate} onChange={handleFormChange} required/>
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="EndDate">End Date/Time*</label>
                                <input type="datetime-local" id="EndDate" name="EndDate" value={formData.EndDate} onChange={handleFormChange} required/>
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="Max_Students">Max Capacity*</label>
                                <input type="number" id="Max_Students" name="Max_Students" value={formData.Max_Students} onChange={handleFormChange} min="1" required/>
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="Price">Price (VND)*</label>
                                <input type="number" id="Price" name="Price" value={formData.Price} onChange={handleFormChange} min="0" step="1" required/> {/* Backend expects int */}
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="Status">Status*</label>
                                <select id="Status" name="Status" value={formData.Price} onChange={handleFormChange} required>
                                    <option value="Available">Available</option>
                                    <option value="Unavailable">Unavailable</option>
                                </select>
                            </div>
                             <div className={styles.formGroup}>
                                <label htmlFor="Rating">Rating (0-5, Optional)</label>
                                <input type="number" id="Rating" name="Rating" value={formData.Rating} onChange={handleFormChange} min="0" max="5" step="0.1" />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="Schedule">Schedule Info (Optional)</label>
                                <textarea id="Schedule" name="Schedule" value={formData.Schedule} onChange={handleFormChange} rows={2}/>
                            </div>

                           {/* --- Schedule Slots Input --- */}
                           <div className={styles.formGroup}>
                                <label>Schedule Slots (Optional)</label>
                                {formData.schedule_slots.map((slot, index) => (
                                    <div key={index} className={styles.slotInputGroup}>
                                        <input
                                            type="datetime-local"
                                            aria-label={`Start Time ${index + 1}`}
                                            value={slot.StartTime}
                                            onChange={(e) => handleSlotChange(index, 'StartTime', e.target.value)}
                                        />
                                        <input
                                            type="datetime-local"
                                            aria-label={`End Time ${index + 1}`}
                                            value={slot.EndTime}
                                            onChange={(e) => handleSlotChange(index, 'EndTime', e.target.value)}
                                        />
                                        <button type="button" onClick={() => removeSlot(index)} className={styles.removeSlotButton}>Remove</button>
                                    </div>
                                ))}
                                <button type="button" onClick={addSlot} className={styles.addSlotButton}>Add Time Slot</button>
                           </div>


                            {/* --- Modal Actions --- */}
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelButton} onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.confirmButton}>
                                    {isEditMode ? 'Update Session' : 'Create Session'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrainingSessionList;