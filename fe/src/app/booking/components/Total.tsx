// app/booking/components/Total.tsx
"use client";

import styles from "@/styles/Booking.module.css";
import { EquipmentItem } from "./Equipments";
import { FoodDrinkItem } from "./FoodAndDrink";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ConfirmationModal from "./ConfirmationModal";
import { TrainingSession } from "./TrainingSessionForm"; // Import TrainingSession type
import { createApiClient } from '@/utils/api';

// Define possible payment methods
type PaymentMethod = "momo" | "zalopay" | "bank-transfer";
type BookingMode = "court" | "training"; // Add BookingMode type

// Define structure for confirmation details - might need adjustment later if needed
interface ConfirmationDetails {
	mode: BookingMode; // Track which type of booking it was
	// Court details (if applicable)
	date?: string;
	startTime?: string;
	endTime?: string;
	duration?: number;
	courtNumber?: number;
	courtType?: string;
	courtPrice?: number;
	// Training details (if applicable)
	sessionName?: string;
	sessionCoach?: string;
	sessionSchedule?: string;
	sessionPrice?: number;
	// Common details
	equipmentTotal: number;
	foodDrinkTotal: number;
	grandTotal: number;
}

interface TotalProps {
	mode: BookingMode; // Receive the current mode
	bookingData: {
		// For court booking
		date?: string;
		startTime?: string;
		endTime?: string;
		duration?: number;
		selectedCourt: number | null;
	};
	selectedTrainingSession: TrainingSession | null; // For training booking
	equipmentItems: EquipmentItem[];
	foodDrinkItems: FoodDrinkItem[];
}

// Destructure props including mode and selectedTrainingSession
const Total = ({
	mode,
	bookingData,
	selectedTrainingSession,
	equipmentItems,
	foodDrinkItems,
}: TotalProps) => {
	const router = useRouter();

	// --- State (remains mostly the same) ---
	const [selectedPaymentMethod, setSelectedPaymentMethod] =
		useState<PaymentMethod | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [showConfirmationModal, setShowConfirmationModal] = useState(false);
	const [confirmationDetails, setConfirmationDetails] =
		useState<ConfirmationDetails | null>(null);

	// --- Calculation Logic (Updated for Mode) ---
	// State to store court data
	const [courtData, setCourtData] = useState<{[key: number]: {hourRate: number, type: string}} | null>(null);
	const [loadingCourtData, setLoadingCourtData] = useState(false);

	// Fetch court data when component mounts
	useEffect(() => {
		const fetchCourtData = async () => {
			if (!bookingData.selectedCourt) return;
			
			try {
				setLoadingCourtData(true);
				const apiClient = createApiClient(null);
				const response = await apiClient.get(`/public/court/${bookingData.selectedCourt}`);
				
				if (response.data && response.data.court) {
					setCourtData({
						...courtData,
						[bookingData.selectedCourt]: {
							hourRate: response.data.court.HourRate,
							type: response.data.court.Type
						}
					});
				}
				setLoadingCourtData(false);
			} catch (err) {
				console.error('Error fetching court data:', err);
				setLoadingCourtData(false);
			}
		};

		fetchCourtData();
	}, [bookingData.selectedCourt]);

	const calculateCourtPrice = (): number => {
		if (
			!bookingData.date ||
			!bookingData.startTime ||
			!bookingData.duration ||
			bookingData.duration <= 0 ||
			bookingData.selectedCourt === null ||
			!courtData ||
			!courtData[bookingData.selectedCourt] ||
	           loadingCourtData // Don't calculate if still loading
		) {
			return 0;
		}

		// Get the base hourly rate from the fetched court data
		const baseHourlyRate = courtData[bookingData.selectedCourt].hourRate;

		// Apply time-based SURCHARGES (additive)
		const bookingDate = new Date(bookingData.date);
		const dayOfWeek = bookingDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
		const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
		const hour = parseInt(bookingData.startTime.split(":")[0]);
		const isWeekdayPeakSurchargeHour = !isWeekend && hour >= 17 && hour < 21; // 5 PM to 9 PM weekdays

	       let timeSurcharge = 0;
	       if (isWeekdayPeakSurchargeHour) {
	           timeSurcharge = 30000; // Weekday peak surcharge
	       } else if (isWeekend) {
	           timeSurcharge = 50000; // Weekend surcharge
	       }

	       // Note: Premium surcharge logic might need to be added here too if not included in baseHourlyRate
	       // Example: Check courtData[bookingData.selectedCourt].type === 'Air-conditioner'
	       // const isPremium = courtData[bookingData.selectedCourt].type === 'Air-conditioner';
	       // const premiumSurcharge = isPremium ? 50000 : 0; // Assuming 50k for premium

		// Final hourly rate = base + time surcharge (+ premium if needed)
		const finalHourlyRate = baseHourlyRate + timeSurcharge; // + premiumSurcharge;

		return finalHourlyRate * bookingData.duration;
	};

	const calculateTrainingPrice = (): number => {
		return selectedTrainingSession?.price || 0;
	};

	const calculateEquipmentTotal = (): number => {
		return equipmentItems.reduce(
			(total, item) => total + item.price * Math.max(0, item.quantity),
			0
		);
	};
	const calculateFoodDrinkTotal = (): number => {
		return foodDrinkItems.reduce(
			(total, item) => total + item.price * Math.max(0, item.quantity),
			0
		);
	};

	// Calculate booking price based on mode
	const bookingPrice =
		mode === "court" ? calculateCourtPrice() : calculateTrainingPrice();
	const equipmentTotal = calculateEquipmentTotal();
	const foodDrinkTotal = calculateFoodDrinkTotal();
	const grandTotal = bookingPrice + equipmentTotal + foodDrinkTotal;

	// Determine if payment should be disabled (Updated for Mode)
	const isBookingSelectionValid =
		(mode === "court" &&
			bookingData.selectedCourt !== null &&
			bookingData.duration &&
			bookingData.duration > 0) ||
		(mode === "training" && selectedTrainingSession !== null);

	const isPaymentDisabled =
		!isBookingSelectionValid ||
		grandTotal <= 0 ||
		!selectedPaymentMethod ||
		isProcessing;

	// --- Handler for Payment Form Submission (Updated for Mode) ---
	const handlePaymentSubmit = async (
		event: React.FormEvent<HTMLFormElement>
	) => {
		event.preventDefault();
		// Add more specific guards based on mode
		if (isPaymentDisabled || !selectedPaymentMethod) return;
		if (
			mode === "court" &&
			(!bookingData.date ||
				!bookingData.startTime ||
				!bookingData.endTime ||
				!bookingData.duration ||
				!bookingData.selectedCourt)
		)
			return;
		if (mode === "training" && !selectedTrainingSession) return;

		setIsProcessing(true);
		console.log(
			`Processing payment for ${grandTotal.toLocaleString(
				"vi-VN"
			)} VND via ${selectedPaymentMethod} (Mode: ${mode})`
		);

		await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate delay

		console.log("Payment simulation complete.");
		setIsProcessing(false);

		// Prepare details for the confirmation modal (Updated for Mode)
		let details: ConfirmationDetails;

		if (
			mode === "court" &&
			bookingData.selectedCourt &&
			bookingData.date &&
			bookingData.startTime &&
			bookingData.endTime &&
			bookingData.duration
		) {
			// Get court type from fetched data
			const courtType = courtData && bookingData.selectedCourt && courtData[bookingData.selectedCourt]
				? courtData[bookingData.selectedCourt].type
				: "Standard";
			details = {
				mode: "court",
				date: bookingData.date,
				startTime: bookingData.startTime,
				endTime: bookingData.endTime,
				duration: bookingData.duration,
				courtNumber: bookingData.selectedCourt,
				courtType: courtType,
				courtPrice: bookingPrice,
				equipmentTotal: equipmentTotal,
				foodDrinkTotal: foodDrinkTotal,
				grandTotal: grandTotal,
			};
		} else if (mode === "training" && selectedTrainingSession) {
			details = {
				mode: "training",
				sessionName: `Level: ${selectedTrainingSession.level}`,
				sessionCoach: selectedTrainingSession.coachName
					? selectedTrainingSession.coachName
					: `Coach ID: ${selectedTrainingSession.coachID}`,
				sessionSchedule: selectedTrainingSession.schedule,
				sessionPrice: bookingPrice, // Use calculated bookingPrice
				equipmentTotal: equipmentTotal,
				foodDrinkTotal: foodDrinkTotal,
				grandTotal: grandTotal,
			};
		} else {
			console.error(
				"Error creating confirmation details: Invalid state."
			);
			// Handle error appropriately, maybe show a message to the user
			setIsProcessing(false);
			return; // Exit if details cannot be formed
		}

		setConfirmationDetails(details);
		setShowConfirmationModal(true);
	};

	// --- Handler to Close Modal and Navigate Home (No change needed) ---
	const handleCloseModal = () => {
		setShowConfirmationModal(false);
		setConfirmationDetails(null);
		router.push("/");
	};

	// --- Helper to get Button Text (No change needed) ---
	const getButtonText = () => {
		// ... (button text logic remains the same) ...
		if (isProcessing) return "Processing...";
		const amountText =
			grandTotal > 0 ? `${grandTotal.toLocaleString("vi-VN")} VND` : "";
		switch (selectedPaymentMethod) {
			case "momo":
				return `Pay ${amountText} with Momo`;
			case "zalopay":
				return `Pay ${amountText} with ZaloPay`;
			case "bank-transfer":
				return `Confirm Bank Transfer Booking`;
			default:
				return "Select Payment Method Above";
		}
	};

	return (
		<>
			{/* --- ORDER SUMMARY SECTION (Updated for Mode) --- */}
			<section className={styles.totalSection}>
				<h2 className={styles.sectionTitle}>Order Summary</h2>
				<div className={styles.totalContainer}>
					{/* Conditionally display Court or Training details */}
					{mode === "court" &&
						bookingPrice > 0 &&
						bookingData.selectedCourt && (
							<div className={styles.summaryItem}>
								<span>
									Court {bookingData.selectedCourt} (
									{bookingData.duration || 0}h):
								</span>
								<span className={styles.summaryPrice}>
									{bookingPrice.toLocaleString("vi-VN")} VND
								</span>
							</div>
						)}
					{mode === "training" &&
						selectedTrainingSession &&
						bookingPrice > 0 && (
							<div className={styles.summaryItem}>
								<span>
									Training: {selectedTrainingSession.coachName
										? `${selectedTrainingSession.level} with ${selectedTrainingSession.coachName}`
										: `Level ${selectedTrainingSession.level}`}
								</span>
								<span className={styles.summaryPrice}>
									{bookingPrice.toLocaleString("vi-VN")} VND
								</span>
							</div>
						)}

					{/* Add-ons remain the same */}
					{equipmentTotal > 0 && (
						<div className={styles.summaryItem}>
							<span>Equipment Rental:</span>
							<span className={styles.summaryPrice}>
								{equipmentTotal.toLocaleString("vi-VN")} VND
							</span>
						</div>
					)}
					{foodDrinkTotal > 0 && (
						<div className={styles.summaryItem}>
							<span>Food & Drinks:</span>
							<span className={styles.summaryPrice}>
								{foodDrinkTotal.toLocaleString("vi-VN")} VND
							</span>
						</div>
					)}

					{/* Grand Total remains the same */}
					<div
						className={`${styles.summaryItem} ${styles.grandTotal}`}
					>
						<span className={styles.grandTotalLabel}>
							Total Amount:
						</span>
						<span className={styles.grandTotalPrice}>
							{grandTotal.toLocaleString("vi-VN")} VND
						</span>
					</div>
				</div>
			</section>

			{/* --- PAYMENT SECTION (Updated disabled logic messages) --- */}
			<section className={styles.paymentSection}>
				<h2 className={styles.sectionTitle}>Payment Details</h2>
				{/* Payment Method Selector (No changes needed here) */}
				<div className={styles.paymentMethodSelector}>
					{/* ... existing payment options ... */}
					<h4 className={styles.paymentMethodTitle}>
						Choose Payment Method:
					</h4>
					<div className={styles.paymentOptionsContainer}>
						{/* Option 1: Momo */}
						<label
							className={`${styles.paymentMethodOption} ${
								selectedPaymentMethod === "momo"
									? styles.selected
									: ""
							}`}
						>
							<input
								type="radio"
								name="paymentMethod"
								value="momo"
								checked={selectedPaymentMethod === "momo"}
								onChange={(e) =>
									setSelectedPaymentMethod(
										e.target.value as PaymentMethod
									)
								}
								disabled={isProcessing}
							/>
							<img
								src="https://developers.momo.vn/v3/assets/images/square-logo-f8712a4d5be38f389e6bc94c70a33bf4.png"
								alt="Momo"
								className={styles.paymentLogo}
							/>
							<span>Momo</span>
						</label>
						{/* Option 2: ZaloPay */}
						<label
							className={`${styles.paymentMethodOption} ${
								selectedPaymentMethod === "zalopay"
									? styles.selected
									: ""
							}`}
						>
							<input
								type="radio"
								name="paymentMethod"
								value="zalopay"
								checked={selectedPaymentMethod === "zalopay"}
								onChange={(e) =>
									setSelectedPaymentMethod(
										e.target.value as PaymentMethod
									)
								}
								disabled={isProcessing}
							/>
							<img
								src="https://img.icons8.com/ios-filled/50/zalo.png"
								alt="ZaloPay"
								className={styles.paymentLogo}
							/>
							<span>ZaloPay</span>
						</label>
						{/* Option 3: Bank Transfer */}
						<label
							className={`${styles.paymentMethodOption} ${
								selectedPaymentMethod === "bank-transfer"
									? styles.selected
									: ""
							}`}
						>
							<input
								type="radio"
								name="paymentMethod"
								value="bank-transfer"
								checked={
									selectedPaymentMethod === "bank-transfer"
								}
								onChange={(e) =>
									setSelectedPaymentMethod(
										e.target.value as PaymentMethod
									)
								}
								disabled={isProcessing}
							/>
							<svg
								className={styles.paymentLogo}
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 512 512"
								fill="currentColor"
								height="20"
								width="20"
							>
								<path d="M256 0c-17.7 0-32 14.3-32 32V67.4C132.2 88.7 64 169.1 64 264v88H448V264c0-94.9-68.2-175.3-160-196.6V32c0-17.7-14.3-32-32-32zM64 384H448c17.7 0 32 14.3 32 32v32c0 17.7-14.3 32-32 32H64c-17.7 0-32-14.3-32-32V416c0-17.7 14.3-32 32-32zM288 288a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z" />
							</svg>
							<span>Bank Transfer</span>
						</label>
					</div>
				</div>

				<form
					onSubmit={handlePaymentSubmit}
					className={styles.paymentFormContainer}
				>
					{/* Conditional Info (No change needed) */}
					{selectedPaymentMethod === "momo" && (
						<div className={styles.digitalWalletInfo}>
							<p>You will be prompted...</p>
						</div>
					)}
					{selectedPaymentMethod === "zalopay" && (
						<div className={styles.digitalWalletInfo}>
							<p>You will be prompted...</p>
						</div>
					)}
					{selectedPaymentMethod === "bank-transfer" && (
						<div className={styles.digitalWalletInfo}>
							<p>Details for bank transfer...</p>
						</div>
					)}

					{/* Payment Button */}
					{selectedPaymentMethod && (
						<button
							type="submit"
							className={styles.payButton}
							disabled={isPaymentDisabled}
						>
							{getButtonText()}
						</button>
					)}

					{/* Disabled Messages (Updated for Mode) */}
					{isPaymentDisabled &&
						grandTotal > 0 &&
						!isProcessing &&
						!selectedPaymentMethod && (
							<p className={styles.paymentDisabledMessage}>
								Please select a payment method.
							</p>
						)}
					{isPaymentDisabled &&
						grandTotal > 0 &&
						!isProcessing &&
						!isBookingSelectionValid && (
							<p className={styles.paymentDisabledMessage}>
								{mode === "court"
									? "Please ensure court booking details (date, time, court) are selected above."
									: "Please select a training session above."}
							</p>
						)}
				</form>
			</section>

			{/* --- RENDER THE MODAL (ConfirmationModal might need internal updates to display training details) --- */}
			<ConfirmationModal
				isOpen={showConfirmationModal}
				onClose={handleCloseModal}
				details={confirmationDetails} // Pass the potentially modified details structure
			/>
		</>
	);
};

export default Total;
