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

// Define props interface - ADD selectedCourt
interface BookingFormProps {
    bookingData?: BookingData;
    onBookingChange: (data: BookingData) => void;
    selectedCourt: number | null; // <-- ADDED: To know which court is selected for pricing
}

// UPDATE props destructuring
const BookingForm = ({ bookingData, onBookingChange, selectedCourt }: BookingFormProps) => { 
    const [date, setDate] = useState(bookingData?.date || "");
    const [startTime, setStartTime] = useState(bookingData?.startTime || "");
    const [endTime, setEndTime] = useState(bookingData?.endTime || "");
    const [duration, setDuration] = useState(bookingData?.duration || 0);

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

    useEffect(() => {
        // Reset end time if start time changes and becomes invalid
        if (startTime && endTime && endTime <= startTime) {
            setEndTime("");
            setDuration(0);
            // Also notify parent about the reset state if necessary
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
                    // courtId: selectedCourt // Optionally pass courtId up if needed elsewhere
                });
            } else {
                // This case should ideally be handled by the reset above
                setDuration(0);
            }
        } else {
             // If startTime or endTime is cleared, reset duration
             setDuration(0);
        }
    // Ensure selectedCourt is included if calculatePrice depends on it inside useEffect
    }, [date, startTime, endTime, onBookingChange/*, selectedCourt - add if needed above*/ ]); 


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
                            <strong>Estimated Price:</strong>{" "}
                            {/* Pass selectedCourt here */}
                            {calculatePrice(duration, date, startTime, selectedCourt)}{" "}
                            VND 
                        </p>
                    </div>
                )}
                {/* --- MODIFICATION END --- */}
            </div>
        </section>
    );
};

// --- MODIFICATION START ---
// Helper function to calculate price - updated for VND and premium courts
const calculatePrice = (
    duration: number,
    date: string,
    startTime: string,
    courtId: number | null // Added courtId parameter
): string => {
    if (!date || !startTime || duration <= 0) return "0";

    // Define base rates in VND
	const offPeakRate = 90000; 
	const peakRate = 120000;    
	const weekendRate = 140000; 
	const premiumSurcharge = 50000;

    const bookingDate = new Date(date);
    // Adjust getDay for timezone if necessary, might be safer to parse date as UTC
    const dayOfWeek = bookingDate.getUTCDay(); // 0 is Sunday, 6 is Saturday (using UTC day)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const hour = parseInt(startTime.split(":")[0]);
    const isPeakHour = hour >= 17 && hour < 21; // 5 PM to 9 PM

    // Determine base hourly rate
    let hourlyRate;
    if (isWeekend) {
        hourlyRate = weekendRate;
    } else if (isPeakHour) {
        hourlyRate = peakRate;
    } else {
        hourlyRate = offPeakRate;
    }

    // Add premium surcharge if applicable
    const isPremiumCourt = courtId === 1 || courtId === 4;
    if (isPremiumCourt) {
        hourlyRate += premiumSurcharge;
    }

    // Calculate total price
    const totalPrice = hourlyRate * duration;

    // Format as VND string (no decimals, use commas)
    return totalPrice.toLocaleString("vi-VN"); 
};
// --- MODIFICATION END ---

export default BookingForm;