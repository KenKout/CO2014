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

    // Effect to calculate price when duration, date, time, or court changes
    useEffect(() => {
        if (duration > 0 && date && startTime && selectedCourt !== null) {
            const price = calculatePrice(duration, date, startTime, selectedCourt);
            setEstimatedPrice(price);
        } else {
            setEstimatedPrice("0"); // Reset price if conditions aren't met
        }
    }, [duration, date, startTime, selectedCourt]);


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
// Helper function to calculate price - updated for VND and premium courts AND SURCHARGES
const calculatePrice = (
    duration: number,
    date: string,
    startTime: string,
    courtId: number | null // Keep courtId if needed for other logic like premium surcharge
): string => {
    if (!date || !startTime || duration <= 0) return "0";

    // --- BASE RATE LOGIC (Keep existing or replace with fetched rate later) ---
    // Define base rates in VND (These might represent the 'fetched' price for now)
    const offPeakRate = 90000;
    const peakRate = 120000; // Base rate during 5pm-9pm weekdays before surcharge
    const weekendBaseRate = 140000; // Base rate on weekends before surcharge
    const premiumSurcharge = 50000; // Keep premium surcharge if needed

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

    // --- DETERMINE BASE HOURLY RATE (Using existing logic for now) ---
    // This part needs review depending on whether we fetch the base rate or use these definitions
    let baseHourlyRate;
    if (isWeekend) {
        baseHourlyRate = weekendBaseRate;
    } else if (isWeekdayPeakSurchargeHour) { // Use the same peak hour definition for consistency if using these rates
        baseHourlyRate = peakRate;
    } else {
        baseHourlyRate = offPeakRate;
    }
    // --- END BASE RATE LOGIC ---


    // Add premium surcharge if applicable (Keep this if needed)
    const isPremiumCourt = courtId === 1 || courtId === 4; // Example premium courts
    if (isPremiumCourt) {
        baseHourlyRate += premiumSurcharge; // Add premium surcharge to the base rate
    }

    // Calculate final hourly rate including time surcharge
    const finalHourlyRate = baseHourlyRate + timeSurcharge;

    // Calculate total price
    const totalPrice = finalHourlyRate * duration;

    // Format as VND string (no decimals, use commas)
    return totalPrice.toLocaleString("vi-VN");
};
// --- MODIFICATION END ---

export default BookingForm;