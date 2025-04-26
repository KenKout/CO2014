"use client";
// app/booking/components/TrainingSessionForm.tsx
import { useState, useEffect } from 'react';
import styles from "@/styles/Booking.module.css";
import { createApiClient } from '@/utils/api';

// Updated interface to match the API data
export interface TrainingSession {
    id: string;
    level: "Beginner" | "Intermediate" | "Advanced";
    coachID: number;
    courtAssigned: number;
    schedule: string;
    price: number;
    startDate: string;
    endDate: string;
    rating: number;
    maxStudents: number;
    // Add any additional fields needed for display
    coachName?: string;
    coachImageUrl?: string;
}

interface TrainingSessionFormProps {
    selectedSession: TrainingSession | null;
    onSessionSelect: (session: TrainingSession | null) => void;
}

const TrainingSessionForm = ({
    selectedSession,
    onSessionSelect,
}: TrainingSessionFormProps) => {
    const [availableSessions, setAvailableSessions] = useState<TrainingSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                setLoading(true);
                const apiClient = createApiClient(null);
                const response = await apiClient.get('/public/training-sessions/');
                
                // Transform the data to match our expected format
                const transformedData = response.data.map((session: any) => ({
                    id: session.SessionID.toString(),
                    level: session.Type,
                    coachID: session.CoachID,
                    courtAssigned: session.CourtID,
                    schedule: session.Schedule,
                    price: session.Price,
                    startDate: session.StartDate,
                    endDate: session.EndDate,
                    rating: session.Rating,
                    maxStudents: session.Max_Students,
                    coachName: session.CoachName,
                    coachImageUrl: session.coach_image_url
                }));
                
                setAvailableSessions(transformedData);
                setLoading(false);
            } catch (err) {
                setError('Failed to load training sessions. Please try again later.');
                setLoading(false);
                console.error('Error fetching training sessions:', err);
            }
        };

        fetchSessions();
    }, []);

    if (loading) {
        return <section className={styles.trainingSection}><h2 className={styles.sectionTitle}>Available Training Sessions</h2><p>Loading sessions...</p></section>;
    }

    if (error) {
        return <section className={styles.trainingSection}><h2 className={styles.sectionTitle}>Available Training Sessions</h2><p>{error}</p></section>;
    }

    // Format dates for display
    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    return (
        <section className={styles.trainingSection}>
            <h2 className={styles.sectionTitle}>Available Training Sessions</h2>

            {availableSessions.length > 0 ? (
                <div className={styles.trainingGrid}>
                    {availableSessions.map((session) => (
                        <div
                            key={session.id}
                            className={`${styles.trainingCard} ${
                                selectedSession?.id === session.id
                                    ? styles.selected
                                    : ""
                            }`}
                            onClick={() => onSessionSelect(session)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ")
                                    onSessionSelect(session);
                            }}
                        >
                            <div className={styles.trainingInfo}>
                                <h3>
                                    <span className={styles.levelBadge}>
                                        {session.level}
                                    </span>
                                </h3>
                                {session.coachName && (
                                    <p>
                                        <strong>Coach:</strong>{" "}
                                        {session.coachName}
                                    </p>
                                )}
                                <p>
                                    <strong>Schedule:</strong>{" "}
                                    {session.schedule}
                                </p>
                                <p>
                                    <strong>Court:</strong>{" "}
                                    {session.courtAssigned}
                                </p>
                                <p>
                                    <strong>Duration:</strong>{" "}
                                    {formatDate(session.startDate)} - {formatDate(session.endDate)}
                                </p>
                                <p>
                                    <strong>Rating:</strong>{" "}
                                    {session.rating ? `${session.rating}/5` : "Not rated yet"}
                                </p>
                                <p>
                                    <strong>Capacity:</strong>{" "}
                                    {session.maxStudents} students
                                </p>
                                <p className={styles.trainingPrice}>
                                    {(session.price || 0).toLocaleString("vi-VN")} VND
                                </p>
                            </div>
                            <div className={styles.selectButton}>
                                {selectedSession?.id === session.id
                                    ? "Selected"
                                    : "Select Session"}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className={styles.noSessions}>
                    No training sessions currently available.
                </p>
            )}
        </section>
    );
};

export default TrainingSessionForm;