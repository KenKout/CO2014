// app/booking/components/BookingForm.tsx
"use client";

import { useState, useEffect } from "react";
import styles from "@/styles/Booking.module.css";

// Define an interface for the booking data
interface BookingData {
    date?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    // Add courtId if you want to pass it up
    // courtId?: number | null; 
}

// Define props interface - UPDATED for selected court data
export interface CourtData { // <-- EXPORTED: Define a type for the court data we need
    id: number;
    hourRate: number;
    isPremium: boolean;
}
interface BookingFormProps {
    bookingData?: BookingData;
    onBookingChange: (data: BookingData) => void;
    selectedCourtData: CourtData | null; // <-- UPDATED: Pass court data object
}

// UPDATE props destructuring
const BookingForm = ({ bookingData, onBookingChange, selectedCourtData }: BookingFormProps) => {
    const [date, setDate] = useState(bookingData?.date || "");
    const [startTime, setStartTime] = useState(bookingData?.startTime || "");
    const [endTime, setEndTime] = useState(bookingData?.endTime || "");
    const [duration, setDuration] = useState(bookingData?.duration || 0);
    const [estimatedPrice, setEstimatedPrice] = useState("0"); // <-- ADDED: State for price

    const today = new Date().toISOString().split("T")[0];

    const generateTimeOptions = () => {
        const options = [];
        for (let hour = 7; hour <= 22; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const formattedHour = hour.toString().padStart(2, "0");
                const formattedMinute = minute.toString().padStart(2, "0");
                options.push(`${formattedHour}:${formattedMinute}`);
            }
        }
        return options;
    };

    const timeOptions = generateTimeOptions();

    // Effect to calculate duration
    useEffect(() => {
        // Reset end time if start time changes and becomes invalid
        if (startTime && endTime && endTime <= startTime) {
            setEndTime("");
            setDuration(0);
            onBookingChange({ date, startTime, endTime: "", duration: 0 });
        } else if (startTime && endTime) {
            const start = new Date(`2000-01-01T${startTime}`);
            const end = new Date(`2000-01-01T${endTime}`);

            if (end > start) {
                const durationMs = end.getTime() - start.getTime();
                const durationHours = durationMs / (1000 * 60 * 60);
                setDuration(durationHours);
                onBookingChange({
                    date,
                    startTime,
                    endTime,
                    duration: durationHours,
                });
            } else {
                setDuration(0); // End time is not after start time
                onBookingChange({ date, startTime, endTime, duration: 0 });
            }
        } else {
             // If startTime or endTime is cleared, reset duration
             setDuration(0);
             onBookingChange({ date, startTime, endTime, duration: 0 });
        }
    }, [date, startTime, endTime, onBookingChange]);

    // Effect to calculate price when duration, date, time, or court data changes
    useEffect(() => {
        // Use selectedCourtData instead of selectedCourt ID
        if (duration > 0 && date && startTime && selectedCourtData) {
            // Pass the necessary court data to calculatePrice
            const price = calculatePrice(duration, date, startTime, selectedCourtData);
            setEstimatedPrice(price);
        } else {
            setEstimatedPrice("0"); // Reset price if conditions aren't met
        }
    }, [duration, date, startTime, selectedCourtData]); // Depend on selectedCourtData


    return (
        <section className={styles.bookingFormSection}>
            <h2 className={styles.sectionTitle}>Book Your Court</h2>

            <div className={styles.formContainer}>
                {/* ... (Date input remains the same) ... */}
                <div className={styles.formGroup}>
                    <label htmlFor="date">Select Date</label>
                    <input
                        type="date"
                        id="date"
                        min={today}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={styles.formControl}
                        required
                    />
                </div>


                <div className={styles.timeSelectionContainer}>
                    <div className={styles.formGroup}>
                        <label htmlFor="startTime">Start Time</label>
                        <select
                            id="startTime"
                            value={startTime}
                            onChange={(e) => {
                                setStartTime(e.target.value);
                                // Optional: Reset end time if start time changes
                                // setEndTime(""); 
                            }}
                            className={styles.formControl}
                            required
                        >
                            <option value="">Select start time</option>
                            {timeOptions.map((time, index) => (
                                <option key={`start-${index}`} value={time}>
                                    {time}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="endTime">End Time</label>
                        <select
                            id="endTime"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className={styles.formControl}
                            required
                            disabled={!startTime} // Keep disabled if no start time
                        >
                            <option value="">Select end time</option>
                            {timeOptions
                                // Filter out times less than or equal to startTime
                                .filter((time) => !startTime || time > startTime) 
                                .map((time, index) => (
                                    <option key={`end-${index}`} value={time}>
                                        {time}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>

                {/* --- MODIFICATION START --- */}
                {duration > 0 && (
                    <div className={styles.durationInfo}>
                        <p>
                            <strong>Duration:</strong> {duration}{" "}
                            {duration === 1 ? "hour" : "hours"}
                        </p>
                        <p>
                            <strong>Estimated Price:</strong> {estimatedPrice} VND
                        </p>
                    </div>
                )}
                {/* --- MODIFICATION END --- */}
            </div>
        </section>
    );
};

// --- MODIFICATION START ---
// Helper function to calculate price - Refactored to use fetched court data
const calculatePrice = (
    duration: number,
    date: string,
    startTime: string,
    courtData: CourtData | null // Use the selected court data object
): string => {
    // Ensure we have valid duration and court data
    if (!date || !startTime || duration <= 0 || !courtData) return "0";

    // --- Use fetched HourRate as the base rate ---
    const baseHourlyRate = courtData.hourRate; // Use the rate from the selected court

    const bookingDate = new Date(date);
    // Adjust getDay for timezone if necessary, might be safer to parse date as UTC
    const dayOfWeek = bookingDate.getUTCDay(); // 0 is Sunday, 6 is Saturday (using UTC day)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const hour = parseInt(startTime.split(":")[0]);
    // Peak hour definition for base rate selection (if keeping existing logic)
    // const isBasePeakHour = hour >= 17 && hour < 21; // 5 PM to 9 PM

    // --- NEW SURCHARGE LOGIC ---
    let timeSurcharge = 0;
    const isWeekdayPeakSurchargeHour = !isWeekend && hour >= 17 && hour < 21; // 5 PM to 9 PM on weekdays

    if (isWeekdayPeakSurchargeHour) {
        timeSurcharge = 30000;
    } else if (isWeekend) {
        timeSurcharge = 50000;
    }

    // --- REMOVED HARDCODED BASE RATE LOGIC ---
    // --- REMOVED HARDCODED PREMIUM CHECK AND SURCHARGE ---
    // The baseHourlyRate is now directly from courtData.hourRate

    // Calculate final hourly rate including time surcharge
    const finalHourlyRate = baseHourlyRate + timeSurcharge; // Apply time surcharge on top of fetched rate

    // Calculate total price
    const totalPrice = finalHourlyRate * duration;

    // Format as VND string (no decimals, use commas)
    return totalPrice.toLocaleString("vi-VN");
};
// --- MODIFICATION END ---

export default BookingForm;