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

// Define the fixed hourly rates
const NORMAL_COURT_RATE = 90000;
const PREMIUM_COURT_RATE = 140000;
// Define what type string signifies a premium court from your API
const PREMIUM_COURT_TYPE_IDENTIFIER = 'Air-conditioner'; // Adjust if your API uses a different type name

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
    // State to store court data (only need type now, HourRate from API is ignored for pricing)
    const [courtData, setCourtData] = useState<{ [key: number]: { type: string } } | null>(null);
    const [loadingCourtData, setLoadingCourtData] = useState(false);

    // Fetch court data when component mounts or selectedCourt changes
    useEffect(() => {
        const fetchCourtData = async () => {
            // Only fetch if mode is court and a court is selected
            if (mode !== "court" || bookingData.selectedCourt === null) {
                // If selection changes away from court, clear old court data to avoid miscalculations
                if (courtData && bookingData.selectedCourt === null) {
                    setCourtData(null);
                }
                return;
            };

            // Avoid refetching if data for this court already exists
            if (courtData && courtData[bookingData.selectedCourt]) {
                return;
            }

            try {
                setLoadingCourtData(true);
                const apiClient = createApiClient(null); // Assuming no auth needed for public court info
                const response = await apiClient.get(`/public/court/${bookingData.selectedCourt}`);

                if (response.data && response.data.court) {
                    // Store only the type, as pricing is now fixed based on type
                    setCourtData(prevData => ({ // Use functional update for safety
                        ...prevData,
                        [bookingData.selectedCourt!]: { // Non-null assertion safe here due to outer check
                            type: response.data.court.Type
                        }
                    }));
                } else {
                    console.warn(`Court data not found for court ${bookingData.selectedCourt}`);
                    // Optionally clear data for this court if fetch fails
                    setCourtData(prevData => {
                        const newData = {...prevData};
                        if (bookingData.selectedCourt !== null) {
                             delete newData[bookingData.selectedCourt];
                        }
                        return newData;
                    });
                }
                setLoadingCourtData(false);
            } catch (err) {
                console.error(`Error fetching court data for court ${bookingData.selectedCourt}:`, err);
                setLoadingCourtData(false);
                 // Optionally clear data for this court on error
                setCourtData(prevData => {
                     const newData = {...prevData};
                     if (bookingData.selectedCourt !== null) {
                          delete newData[bookingData.selectedCourt];
                     }
                     return newData;
                 });
            }
        };

        fetchCourtData();
    // Depend on mode and selectedCourt
    }, [mode, bookingData.selectedCourt]); // Removed courtData from dependency array to prevent loops if structure changes

    // --- MODIFIED calculateCourtPrice ---
    const calculateCourtPrice = (): number => {
        if (
            !bookingData.date || // Still need date/time for booking validity, but not price
            !bookingData.startTime ||
            !bookingData.duration ||
            bookingData.duration <= 0 ||
            bookingData.selectedCourt === null ||
            !courtData || // Need court data object
            !courtData[bookingData.selectedCourt] || // Need data for the *specific* court
            loadingCourtData // Don't calculate if still loading type info
        ) {
            return 0; // Return 0 if essential info is missing
        }

        // Determine the rate based *only* on the court type from fetched data
        const courtType = courtData[bookingData.selectedCourt].type;
        const hourlyRate = courtType === PREMIUM_COURT_TYPE_IDENTIFIER
                            ? PREMIUM_COURT_RATE
                            : NORMAL_COURT_RATE;

        // Removed all time-based surcharge logic (peak, weekend)

        // Final price is rate * duration
        return hourlyRate * bookingData.duration;
    };
    // --- END MODIFICATION ---

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
            bookingData.duration > 0 &&
            !loadingCourtData && // Also wait for court type data to load
            courtData && courtData[bookingData.selectedCourt] // Ensure type data is present
            ) ||
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
                !bookingData.selectedCourt ||
                !courtData || !courtData[bookingData.selectedCourt]) // Ensure court type loaded
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
            bookingData.duration &&
            courtData && // Ensure courtData exists before accessing
            courtData[bookingData.selectedCourt] // Ensure data for the specific court exists
        ) {
            // Get court type from fetched data
            const courtType = courtData[bookingData.selectedCourt].type;

            details = {
                mode: "court",
                date: bookingData.date,
                startTime: bookingData.startTime,
                endTime: bookingData.endTime,
                duration: bookingData.duration,
                courtNumber: bookingData.selectedCourt,
                courtType: courtType, // Use the fetched type
                courtPrice: bookingPrice, // Use the price calculated with the new logic
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
                "Error creating confirmation details: Invalid state or missing data."
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
        // Consider resetting booking state here if needed before navigating
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

    // --- JSX Structure (Mostly unchanged, relies on correct calculations above) ---
    return (
        <>
            {/* --- ORDER SUMMARY SECTION (Updated for Mode) --- */}
            <section className={styles.totalSection}>
                <h2 className={styles.sectionTitle}>Order Summary</h2>
                <div className={styles.totalContainer}>
                    {/* Conditionally display Court or Training details */}
                    {mode === "court" &&
                        bookingPrice > 0 &&
                        bookingData.selectedCourt && courtData && courtData[bookingData.selectedCourt] && ( // Check if courtData is loaded
                            <div className={styles.summaryItem}>
                                <span>
                                    Court {bookingData.selectedCourt}
                                    ({courtData[bookingData.selectedCourt].type}) {/* Display type */}
                                    ({bookingData.duration || 0}h):
                                </span>
                                <span className={styles.summaryPrice}>
                                    {bookingPrice.toLocaleString("vi-VN")} VND
                                </span>
                            </div>
                        )}
                    {/* Loading indicator while court type is fetched */}
                    {mode === 'court' && loadingCourtData && bookingData.selectedCourt && (
                        <div className={styles.summaryItem}>
                            <span>Loading court details...</span>
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
                            {/* Show 0 or loading if price isn't calculated yet */}
                            {loadingCourtData && mode === 'court'
                                ? "Calculating..."
                                : `${grandTotal.toLocaleString("vi-VN")} VND`}
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
                            <p>You will be redirected to Momo to complete the payment.</p>
                        </div>
                    )}
                    {selectedPaymentMethod === "zalopay" && (
                        <div className={styles.digitalWalletInfo}>
                             <p>You will be redirected to ZaloPay to complete the payment.</p>
                        </div>
                    )}
                    {selectedPaymentMethod === "bank-transfer" && (
                        <div className={styles.digitalWalletInfo}>
                            <p>Please transfer the total amount to the account details shown after confirming the booking.</p>
                        </div>
                    )}

                    {/* Payment Button */}
                    {selectedPaymentMethod && ( // Only show button if a method is selected
                        <button
                            type="submit"
                            className={styles.payButton}
                            disabled={isPaymentDisabled}
                        >
                            {getButtonText()}
                        </button>
                    )}

                    {/* Disabled Messages (Updated for Mode and loading state) */}
                    {isPaymentDisabled &&
                        grandTotal > 0 &&
                        !isProcessing &&
                        !selectedPaymentMethod && ( // Check added: only show if no method selected
                            <p className={styles.paymentDisabledMessage}>
                                Please select a payment method.
                            </p>
                        )}
                    {/* Specific message if court details are still loading */}
                    {mode === 'court' && loadingCourtData && !isProcessing && bookingData.selectedCourt && (
                         <p className={styles.paymentDisabledMessage}>
                             Loading court details... Please wait.
                         </p>
                    )}
                    {isPaymentDisabled &&
                        grandTotal > 0 &&
                        !isProcessing &&
                        !loadingCourtData && // Only show if not loading
                        !isBookingSelectionValid && ( // This check now includes loading state implicitly
                            <p className={styles.paymentDisabledMessage}>
                                {mode === "court"
                                    ? "Please ensure court booking details (date, time, duration, court) are complete."
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