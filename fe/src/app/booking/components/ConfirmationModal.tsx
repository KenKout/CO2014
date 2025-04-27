// app/booking/components/ConfirmationModal.tsx
import React from "react";
import styles from "@/styles/Booking.module.css";
// Removed Link import as it wasn't used in the provided snippet, can be added back if needed

// Define possible booking modes
type BookingMode = "court" | "training";

// Update interface to include fields for both modes (make irrelevant fields optional)
interface ConfirmationDetails {
	mode: BookingMode;
	// Court booking specific (optional)
	date?: string;
	startTime?: string;
	endTime?: string;
	duration?: number;
	courtNumber?: number;
	courtType?: string;
	courtPrice?: number;
	// Training booking specific (optional)
	sessionName?: string;
	sessionCoach?: string;
	sessionSchedule?: string;
	sessionPrice?: number; // Renamed from courtPrice for clarity if needed, or use a generic bookingPrice
	// Common fields
	equipmentTotal: number; // Will be 0 for training mode based on current setup
	foodDrinkTotal: number; // Will be 0 for training mode based on current setup
	grandTotal: number;
}

interface ConfirmationModalProps {
	isOpen: boolean;
	onClose: () => void; // Function to close the modal (e.g., navigate home)
	details: ConfirmationDetails | null;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
	isOpen,
	onClose,
	details,
}) => {
	if (!isOpen || !details) {
		return null; // Don't render anything if not open or no details
	}

	// Helper to format currency
	const formatCurrency = (amount: number) => {
		// Use 0 if amount is undefined/null (e.g., price fields might be optional)
		return (amount ?? 0).toLocaleString("vi-VN", {
			style: "currency",
			currency: "VND",
		});
	};

	// Determine the primary booking item cost
	const bookingItemPrice =
		details.mode === "court" ? details.courtPrice : details.sessionPrice;

	return (
		<div className={styles.modalOverlay}>
			<div className={styles.modalContent}>
				<h2 className={styles.modalTitle}>Booking Confirmed!</h2>

				{/* --- Booking Details Section (Conditional Rendering) --- */}
				<div className={styles.modalSection}>
					<h4 className={styles.modalSectionTitle}>
						Booking Details
					</h4>
					{details.mode === "court" &&
						details.date &&
						details.startTime &&
						details.endTime &&
						details.duration &&
						details.courtNumber &&
						details.courtType && (
							<>
								<p>
									<strong>Type:</strong> Court Booking
								</p>
								<p>
									<strong>Date:</strong>{" "}
									{new Date(details.date).toLocaleDateString(
										"en-GB"
									)}
								</p>
								<p>
									<strong>Time:</strong> {details.startTime} -{" "}
									{details.endTime} ({details.duration} hour
									{details.duration > 1 ? "s" : ""})
								</p>
								<p>
									<strong>Court:</strong>{" "}
									{details.courtNumber} ({details.courtType})
								</p>
							</>
						)}
					{details.mode === "training" &&
						details.sessionName &&
						details.sessionCoach &&
						details.sessionSchedule && (
							<>
								<p>
									<strong>Type:</strong> Training Session
								</p>
								<p>
									<strong>Session:</strong>{" "}
									{details.sessionName}
								</p>
								<p>
									<strong>Coach:</strong>{" "}
									{details.sessionCoach}
								</p>
								<p>
									<strong>Schedule:</strong>{" "}
									{details.sessionSchedule}
								</p>
							</>
						)}
				</div>

				{/* --- Order Summary Section --- */}
				<div className={styles.modalSection}>
					<h4 className={styles.modalSectionTitle}>Order Summary</h4>
					{/* Display Court Booking or Training Session Price */}
					<div className={styles.modalSummaryItem}>
						<span>
							{details.mode === "court"
								? "Court Booking:"
								: "Training Session:"}
						</span>
						<span>{formatCurrency(bookingItemPrice ?? 0)}</span>
					</div>

					{/* Display Add-ons only if their total is greater than 0 */}
					{/* Note: These will typically be 0 in 'training' mode based on previous changes */}
					{details.equipmentTotal > 0 && (
						<div className={styles.modalSummaryItem}>
							<span>Equipment Rental:</span>
							<span>
								{formatCurrency(details.equipmentTotal)}
							</span>
						</div>
					)}
					{details.foodDrinkTotal > 0 && (
						<div className={styles.modalSummaryItem}>
							<span>Food & Drinks:</span>
							<span>
								{formatCurrency(details.foodDrinkTotal)}
							</span>
						</div>
					)}

					{/* Grand Total */}
					<div
						className={`${styles.modalSummaryItem} ${styles.modalGrandTotal}`}
					>
						<span>Total Paid:</span>
						<span>{formatCurrency(details.grandTotal)}</span>
					</div>
				</div>

				<button onClick={onClose} className={styles.modalHomeButton}>
					HOME
				</button>
			</div>
		</div>
	);
};

export default ConfirmationModal;
