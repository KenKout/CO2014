// app/booking/components/BookingForm.tsx
"use client";

import { useState, useEffect } from "react";
import styles from "../Booking.module.css";

// Define an interface for the booking data
interface BookingData {
	date?: string;
	startTime?: string;
	endTime?: string;
	duration?: number;
}

// Define props interface
interface BookingFormProps {
	bookingData?: BookingData;
	onBookingChange: (data: BookingData) => void;
}

const BookingForm = ({ bookingData, onBookingChange }: BookingFormProps) => {
	const [date, setDate] = useState(bookingData?.date || "");
	const [startTime, setStartTime] = useState(bookingData?.startTime || "");
	const [endTime, setEndTime] = useState(bookingData?.endTime || "");
	const [duration, setDuration] = useState(bookingData?.duration || 0);

	// Get today's date in YYYY-MM-DD format for min date attribute
	const today = new Date().toISOString().split("T")[0];

	// Generate time options from 7:00 AM to 10:00 PM
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
		if (startTime && endTime) {
			const start = new Date(`2000-01-01T${startTime}`);
			const end = new Date(`2000-01-01T${endTime}`);

			if (end > start) {
				// Calculate duration in hours
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
				setDuration(0);
			}
		}
	}, [date, startTime, endTime, onBookingChange]);

	return (
		<section className={styles.bookingFormSection}>
			<h2 className={styles.sectionTitle}>Book Your Court</h2>

			<div className={styles.formContainer}>
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
							onChange={(e) => setStartTime(e.target.value)}
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
							disabled={!startTime}
						>
							<option value="">Select end time</option>
							{timeOptions
								.filter((time) => time > startTime)
								.map((time, index) => (
									<option key={`end-${index}`} value={time}>
										{time}
									</option>
								))}
						</select>
					</div>
				</div>

				{duration > 0 && (
					<div className={styles.durationInfo}>
						<p>
							<strong>Duration:</strong> {duration}{" "}
							{duration === 1 ? "hour" : "hours"}
						</p>
						<p>
							<strong>Estimated Price:</strong> $
							{calculatePrice(duration, date, startTime)}
						</p>
					</div>
				)}
			</div>
		</section>
	);
};

// Helper function to calculate price based on time and day
const calculatePrice = (
	duration: number,
	date: string,
	startTime: string
): string => {
	if (!date || !startTime) return "0.00";

	const bookingDate = new Date(date);
	const dayOfWeek = bookingDate.getDay(); // 0 is Sunday, 6 is Saturday
	const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

	const hour = parseInt(startTime.split(":")[0]);
	const isPeakHour = hour >= 17 && hour < 21; // 5 PM to 9 PM

	let hourlyRate;
	if (isWeekend) {
		hourlyRate = 25; // Weekend rate
	} else if (isPeakHour) {
		hourlyRate = 20; // Peak hours
	} else {
		hourlyRate = 15; // Off-peak
	}

	return (hourlyRate * duration).toFixed(2);
};

export default BookingForm;
