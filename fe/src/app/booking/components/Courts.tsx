"use client";
// app/booking/components/Courts.tsx
import { useState, useEffect } from 'react';
import styles from "@/styles/Booking.module.css";
import { createApiClient } from '@/utils/api';

interface CourtResponse {
	Court_ID: number;
	Status: string;
	Type: string;
	HourRate: number;
}

interface AvailabilityResponse {
    available_slots: { start_time: string; end_time: string }[];
}

// Define the Court type (ensure it matches the one in page.tsx)
interface Court {
    id: number;
    hourRate: number; // Added hourRate if needed directly here, though features covers it
    isPremium: boolean;
    name: string;
    features: string[];
}

// Define props interface for the Courts component - UPDATED
interface CourtsProps {
    selectedCourt: number | null;
    onCourtSelect: (courtId: number) => void;
    bookingData: {
        date: string;
        startTime: string;
        endTime: string;
        duration: number;
        selectedCourt: number | null;
    };
    // Add props passed from parent
    courts: Court[];
    loading: boolean;
    error: string | null;
}

// Update props destructuring
const Courts = ({
    selectedCourt,
    onCourtSelect,
    bookingData,
    courts, // Use passed courts
    loading, // Use passed loading state
    error // Use passed error state
}: CourtsProps) => {
    // Remove internal state for courts, loading, error
    // const [courts, setCourts] = useState<Court[]>([]);
    // const [loading, setLoading] = useState(true);
    // const [error, setError] = useState<string | null>(null);
    
    // Keep state for availability as it's fetched here based on selection
    const [availability, setAvailability] = useState<{ start_time: string; end_time: string }[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    // Remove useEffect for fetching courts (lines 46-74)

    useEffect(() => {
        const fetchAvailability = async () => {
            if (!selectedCourt || !bookingData.date) return;

            try {
                setLoadingAvailability(true);
                const apiClient = createApiClient(null);
                // Corrected API path: removed extra /v1
                let query = `/public/court/${selectedCourt}`;
                const params: { start_time?: string; end_time?: string } = {};
                
                if (bookingData.startTime) {
                    const startDateTime = new Date(`${bookingData.date}T${bookingData.startTime}`).toISOString();
                    params.start_time = startDateTime;
                }
                if (bookingData.endTime) {
                    const endDateTime = new Date(`${bookingData.date}T${bookingData.endTime}`).toISOString();
                    params.end_time = endDateTime;
                }
                
                const response = await apiClient.get(query, { params });
                setAvailability(response.data.available_slots || []);
                setLoadingAvailability(false);
            } catch (err) {
                console.error('Error fetching availability:', err);
                setAvailability([]);
                setLoadingAvailability(false);
            }
        };

        fetchAvailability();
    }, [selectedCourt, bookingData.date, bookingData.startTime, bookingData.endTime]);

    if (loading) {
        return <section className={styles.courtsSection}><h2 className={styles.sectionTitle}>Select a Court</h2><p>Loading courts...</p></section>;
    }

    if (error) {
        return <section className={styles.courtsSection}><h2 className={styles.sectionTitle}>Select a Court</h2><p>{error}</p></section>;
    }

    return (
        <section className={styles.courtsSection}>
            <h2 className={styles.sectionTitle}>Select a Court</h2>

            <div className={styles.courtsGrid}>
                {courts.map((court) => (
                    <div
                        key={court.id}
                        className={`${styles.courtCard} ${
                            selectedCourt === court.id ? styles.selected : ""
                        } ${court.isPremium ? styles.premium : ""}`}
                        onClick={() => onCourtSelect(court.id)}
                    >
                        <div className={styles.courtImage}>
                            <BadmintonCourtSVG />
                        </div>
                        <div className={styles.courtInfo}>
                            <h3>
                                {court.name}
                                {court.isPremium && (
                                    <span className={styles.premiumBadge}>
                                        Premium
                                    </span>
                                )}
                            </h3>
                            <ul>
                                {court.features.map((feature, index) => (
                                    <li key={index}>{feature}</li>
                                ))}
                            </ul>
                        </div>
                        <div className={styles.selectButton}>
                            {selectedCourt === court.id
                                ? "Selected"
                                : "Select Court"}
                        </div>
                    </div>
                ))}
            </div>

            {selectedCourt && (
                <div className={styles.availabilitySection}>
                    <h3>Available Time Slots for Court {selectedCourt}</h3>
                    {loadingAvailability ? (
                        <p>Loading availability...</p>
                    ) : availability.length > 0 ? (
                        <div className={styles.timeSlots}>
                            {availability.map((slot, index) => (
                                <div key={index} className={styles.timeSlot}>
                                    {new Date(slot.start_time).toLocaleTimeString()} - {new Date(slot.end_time).toLocaleTimeString()}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No available slots for the selected time range.</p>
                    )}
                </div>
            )}
        </section>
    );
};

// SVG Component for Badminton Court (Horizontal with benches)
const BadmintonCourtSVG = () => {
    return (
        <svg viewBox="0 0 240 120" className={styles.courtSvg}>
            {/* Background */}
            <rect x="0" y="0" width="240" height="120" fill="#f5f5f5" />

            {/* Court outline - green with white lines */}
            <rect
                x="30"
                y="15"
                width="180"
                height="90"
                fill="#4CAF50"
                stroke="white"
                strokeWidth="2"
            />

            {/* Center line */}
            <line
                x1="120"
                y1="15"
                x2="120"
                y2="105"
                stroke="white"
                strokeWidth="1.5"
            />

            {/* Service courts */}
            <line
                x1="30"
                y1="45"
                x2="210"
                y2="45"
                stroke="white"
                strokeWidth="1.5"
            />
            <line
                x1="30"
                y1="75"
                x2="210"
                y2="75"
                stroke="white"
                strokeWidth="1.5"
            />

            {/* Service line center dividers */}
            <line
                x1="75"
                y1="45"
                x2="75"
                y2="75"
                stroke="white"
                strokeWidth="1.5"
            />
            <line
                x1="165"
                y1="45"
                x2="165"
                y2="75"
                stroke="white"
                strokeWidth="1.5"
            />

            {/* Net - more visible */}
            <rect x="118" y="15" width="4" height="90" fill="#333" />
            <line
                x1="118"
                y1="15"
                x2="118"
                y2="105"
                stroke="white"
                strokeWidth="0.5"
                strokeDasharray="2,2"
            />
            <line
                x1="122"
                y1="15"
                x2="122"
                y2="105"
                stroke="white"
                strokeWidth="0.5"
                strokeDasharray="2,2"
            />

            {/* Benches on each side */}
            {/* Left bench */}
            <rect
                x="5"
                y="45"
                width="15"
                height="30"
                fill="#8B4513"
                rx="2"
                ry="2"
            />
            <rect
                x="5"
                y="42"
                width="15"
                height="3"
                fill="#A0522D"
                rx="1"
                ry="1"
            />
            <line
                x1="7"
                y1="75"
                x2="7"
                y2="85"
                stroke="#8B4513"
                strokeWidth="2"
            />
            <line
                x1="18"
                y1="75"
                x2="18"
                y2="85"
                stroke="#8B4513"
                strokeWidth="2"
            />

            {/* Right bench */}
            <rect
                x="220"
                y="45"
                width="15"
                height="30"
                fill="#8B4513"
                rx="2"
                ry="2"
            />
            <rect
                x="220"
                y="42"
                width="15"
                height="3"
                fill="#A0522D"
                rx="1"
                ry="1"
            />
            <line
                x1="222"
                y1="75"
                x2="222"
                y2="85"
                stroke="#8B4513"
                strokeWidth="2"
            />
            <line
                x1="233"
                y1="75"
                x2="233"
                y2="85"
                stroke="#8B4513"
                strokeWidth="2"
            />
        </svg>
    );
};

export default Courts;