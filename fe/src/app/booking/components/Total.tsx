// app/booking/components/Total.tsx
"use client";

import styles from "@/styles/Booking.module.css";
import { EquipmentItem } from "./Equipments";
import { FoodDrinkItem } from "./FoodAndDrink";
import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { TrainingSession } from "./TrainingSessionForm";
import { createApiClient } from '@/utils/api';
import { useAuth } from '@/context/AuthContext';
// Import CourtData type from BookingForm
import { CourtData } from './BookingForm';

// Define frontend payment methods
type FrontendPaymentMethod = "momo" | "zalopay" | "bank-transfer";
// Backend expects specific enum values
type BackendPaymentMethod = "Credit Card" | "Cash";
type BookingMode = "court" | "training"; // Add BookingMode type

// Remove ConfirmationDetails interface - no longer needed

interface TotalProps {
    mode: BookingMode;
    bookingData: {
        date?: string;
        startTime?: string;
        endTime?: string;
        duration?: number;
        selectedCourt: number | null;
    };
    selectedTrainingSession: TrainingSession | null;
    equipmentItems: EquipmentItem[];
    foodDrinkItems: FoodDrinkItem[];
    // Add selectedCourtData prop
    selectedCourtData: CourtData | null;
}

// Remove fixed hourly rates and type identifier
// const NORMAL_COURT_RATE = 90000;
// const PREMIUM_COURT_RATE = 140000;
// const PREMIUM_COURT_TYPE_IDENTIFIER = 'Air-conditioner';

// Destructure props including selectedCourtData
const Total = ({
    mode,
    bookingData,
    selectedTrainingSession,
    equipmentItems,
    foodDrinkItems,
    selectedCourtData, // Destructure the new prop
}: TotalProps) => {
    const router = useRouter();

    // --- State ---
    const { token, logout } = useAuth(); // Get auth token and logout function
    const [selectedPaymentMethod, setSelectedPaymentMethod] =
        useState<FrontendPaymentMethod | null>(null); // Use FrontendPaymentMethod type
    const [isProcessing, setIsProcessing] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [apiSuccess, setApiSuccess] = useState<string | null>(null);
    const [showQRCode, setShowQRCode] = useState(false);
    const [qrCodeUrl, setQRCodeUrl] = useState<string | null>(null);

    // --- Calculation Logic (Updated for Mode) ---
    // Remove internal state and useEffect for fetching court data (lines 64-125)

    // --- REFACTORED calculateCourtPrice ---
    const calculateCourtPrice = (): number => {
        // Use selectedCourtData prop instead of internal state
        if (
            !bookingData.duration ||
            bookingData.duration <= 0 ||
            !selectedCourtData // Check if selectedCourtData object exists
        ) {
            return 0; // Return 0 if duration or court data is missing
        }

        // Use the hourRate directly from the selectedCourtData prop
        const hourlyRate = selectedCourtData.hourRate;

        // Removed hardcoded rates and type checks
        // Removed time-based surcharge logic (assuming BookingForm handles this now)

        // Final price is fetched rate * duration
        return hourlyRate * bookingData.duration;
    };
    // --- END REFACTOR ---

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
            selectedCourtData !== null && // Check if court data object is present
            bookingData.duration &&
            bookingData.duration > 0
            ) ||
        (mode === "training" && selectedTrainingSession !== null);

    const isPaymentDisabled =
        (!token) || // Disable if not logged in
        (mode === 'training' && 
          (!selectedTrainingSession || !selectedPaymentMethod || isProcessing)) ||
        (mode === 'court' && 
          (!isBookingSelectionValid || grandTotal <= 0 || !selectedPaymentMethod || isProcessing));

    // --- Handler for Order Submission ---
    const handleOrderSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setApiError(null);
        setApiSuccess(null);

        // Basic validation and checks
        if (isPaymentDisabled || !selectedPaymentMethod || !token) {
            setApiError("Cannot proceed. Please ensure you are logged in, have selected items, and chosen a payment method.");
            return;
        }
        if (mode !== 'court') {
             setApiError("Training session booking is handled separately."); // Or implement training booking logic
             return;
        }
        if (!bookingData.selectedCourt || !bookingData.date || !bookingData.startTime || !bookingData.endTime) {
            setApiError("Please select a court and valid time slot.");
            return;
        }

        setIsProcessing(true);

        // --- Map Frontend Payment Method to Backend Enum ---
        // TODO: Backend currently only supports 'Credit Card' and 'Cash'.
        // Mapping all frontend options to 'Credit Card' for now.
        // This needs alignment between frontend options and backend capabilities.
        const backendPaymentMethod: BackendPaymentMethod = "Credit Card";

        // --- Prepare Order Payload ---
        const courtOrders = [{
            court_id: bookingData.selectedCourt,
            // Fix timezone issue by explicitly handling the GMT+7 offset
            start_time: createUTCDate(bookingData.date, bookingData.startTime),
            end_time: createUTCDate(bookingData.date, bookingData.endTime),

        }];

        const equipmentOrders = equipmentItems
            .filter(item => item.quantity > 0)
            // Backend model currently doesn't support quantity, just send IDs
            .map(item => ({ equipment_id: item.id }));
            // If quantity needed later: .map(item => ({ equipment_id: item.id, quantity: item.quantity }));

        const foodOrders = foodDrinkItems
            .filter(item => item.quantity > 0)
            // Backend model currently doesn't support quantity, just send IDs
            .map(item => ({ food_id: item.id }));
            // If quantity needed later: .map(item => ({ food_id: item.id, quantity: item.quantity }));

        // Ensure at least one type of order exists
        if (courtOrders.length === 0 && equipmentOrders.length === 0 && foodOrders.length === 0) {
            setApiError("Your order is empty. Please select a court, equipment, or food/drink items.");
            setIsProcessing(false);
            return;
        }

        const orderPayload = {
            court_orders: courtOrders.length > 0 ? courtOrders : null,
            equipment_orders: equipmentOrders.length > 0 ? equipmentOrders : null,
            food_orders: foodOrders.length > 0 ? foodOrders : null,
            payment_method: backendPaymentMethod,
        };

        // --- API Call ---
        try {
            const apiClient = createApiClient(token, logout); // Pass token and logout
            const response = await apiClient.post('/user/order/', orderPayload);

            // Handle Success
            setApiSuccess(`Order #${response.data.order_id} placed successfully! Total: ${response.data.total_amount.toFixed(2)} VND. Payment ID: ${response.data.payment_id}`);
            console.log("Order Response:", response.data);

            // Optionally clear booking state here
            // e.g., resetBookingState(); // You'd need to pass a reset function from the parent page

            // Set QR code based on payment method
            let qrUrl = '';
            if (selectedPaymentMethod === 'momo') {
                qrUrl = '/images/momo.jpg'; // Replace with actual QR code URL for Momo
            } else if (selectedPaymentMethod === 'zalopay') {
                qrUrl = '/images/zalo.jpg'; // Replace with actual QR code URL for ZaloPay
            } else if (selectedPaymentMethod === 'bank-transfer') {
                qrUrl = '/images/bank.jpg'; // Replace with actual QR code URL for Bank Transfer
            }
            setQRCodeUrl(qrUrl);
            setShowQRCode(true);
            // Do not redirect to order history

        } catch (err: any) {
            console.error("Order submission failed:", err);
            const errorDetail = err.response?.data?.detail || err.message || "An unknown error occurred while placing the order.";
            setApiError(`Order failed: ${errorDetail}`);
        } finally {
            setIsProcessing(false);
        }
    };

// Add debugging to see what API endpoints are available
const handleTrainingSessionOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApiError(null);
    setApiSuccess(null);
  
    if (!selectedPaymentMethod || !token || !selectedTrainingSession) {
      setApiError("Cannot proceed. Please ensure you are logged in, have selected a training session, and chosen a payment method.");
      return;
    }
  
    setIsProcessing(true);
  
    try {
      const apiClient = createApiClient(token, logout);
      
      // Debug: Log the training session object to see its structure
      console.log("Selected training session:", selectedTrainingSession);
      
      // Try to get the session ID from the training session object
      const sessionId = selectedTrainingSession.id 

      console.log("Session ID to be used:", sessionId);
      
      // Let's try a different API endpoint structure
      // Based on your router code, the correct path might be:
      const response = await apiClient.post(
        `/user/training-sessions/${sessionId}/enroll`, 
        { payment_method: "Credit Card" }
      );
  
      // Handle Success
      setApiSuccess(`Successfully enrolled in training session! Order #${response.data.order_id} placed. Total: ${selectedTrainingSession.price.toLocaleString("vi-VN")} VND. Payment ID: ${response.data.payment_id}`);
      
      // Set QR code based on payment method
      let qrUrl = '';
      if (selectedPaymentMethod === 'momo') {
          qrUrl = 'https://example.com/momo-qr-code.png'; // Replace with actual QR code URL for Momo
      } else if (selectedPaymentMethod === 'zalopay') {
          qrUrl = 'https://example.com/zalopay-qr-code.png'; // Replace with actual QR code URL for ZaloPay
      } else if (selectedPaymentMethod === 'bank-transfer') {
          qrUrl = 'https://example.com/bank-transfer-qr-code.png'; // Replace with actual QR code URL for Bank Transfer
      }
      setQRCodeUrl(qrUrl);
      setShowQRCode(true);
      // Do not redirect to order history
    } catch (err: any) {
      console.error("Training session enrollment failed:", err);
      
      // Add more detailed error logging
      if (err.response) {
        console.error("Error response data:", err.response.data);
        console.error("Error response status:", err.response.status);
        console.error("Error response headers:", err.response.headers);
      } else if (err.request) {
        console.error("Error request:", err.request);
      }
      
      const errorDetail = err.response?.data?.detail || err.message || "An unknown error occurred while enrolling in the training session.";
      setApiError(`Enrollment failed: ${errorDetail}`);
    } finally {
      setIsProcessing(false);
    }
  };
    // --- Helper to get Button Text ---
    const getButtonText = () => {
        if (!token) return "Please Login to Book";
        if (isProcessing) return "Processing...";
        
        if (mode === 'training') {
          if (!selectedTrainingSession) return "Select a Training Session";
          if (!selectedPaymentMethod) return "Select Payment Method";
          
          const amountText = `${selectedTrainingSession.price.toLocaleString("vi-VN")} VND`;
          return `Book Training Session (${amountText})`;
        } else { // court mode
          if (!isBookingSelectionValid || grandTotal <= 0) return "Select Items to Order";
          if (!selectedPaymentMethod) return "Select Payment Method";
      
          const amountText = `${grandTotal.toLocaleString("vi-VN")} VND`;
          return `Place Order (${amountText})`;
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
                        selectedCourtData && ( // Check if selectedCourtData is loaded
                            <div className={styles.summaryItem}>
                                <span>
                                    Court {selectedCourtData.id}
                                    {selectedCourtData.isPremium ? " (Premium)" : ""} {/* Display premium status */}
                                    ({bookingData.duration || 0}h):
                                </span>
                                <span className={styles.summaryPrice}>
                                    {bookingPrice.toLocaleString("vi-VN")} VND
                                </span>
                            </div>
                        )}
                    {/* Remove loading indicator for court type */}
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
                            {/* Remove loading state check */}
                            {`${grandTotal.toLocaleString("vi-VN")} VND`}
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
                                        e.target.value as FrontendPaymentMethod // Use correct type
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
                                        e.target.value as FrontendPaymentMethod // Use correct type
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
                                        e.target.value as FrontendPaymentMethod // Use correct type
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

                {/* Submit Button */}
                {/* Use handleOrderSubmit */}
                <form 
                    onSubmit={mode === "court" ? handleOrderSubmit : handleTrainingSessionOrder} 
                    className={styles.paymentFormContainer}
                >
                     {/* Conditional Info */}
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
                         // Note: Bank transfer info might need adjustment based on actual order flow
                         <div className={styles.digitalWalletInfo}>
                             <p>Please transfer the total amount after placing the order. Details will be shown on the order confirmation.</p>
                         </div>
                     )}

                    {/* Display API Success/Error Messages */}
                    {apiError && <p className={`${styles.apiMessage} ${styles.error}`}>{apiError}</p>}
                    {apiSuccess && <p className={`${styles.apiMessage} ${styles.success}`}>{apiSuccess}</p>}
                    
                    {/* QR Code Modal */}
                    {showQRCode && qrCodeUrl && (
                        <div className={styles.qrCodeModal}>
                            <div className={styles.qrCodeContent}>
                                <h3>Scan to Pay</h3>
                                <img src={qrCodeUrl} alt="Payment QR Code" className={styles.qrCodeImage} />
                                <button
                                    className={styles.closeButton}
                                    onClick={() => {
                                        setShowQRCode(false);
                                        router.push('/orders');
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Payment Button - Simplified structure */}
                    <button
                        type="submit"
                        className={styles.paymentButton} // Use consistent class name if defined, or payButton
                        disabled={isPaymentDisabled}
                    >
                        {getButtonText()}
                    </button>

                    {/* Display message if disabled (simplified) */}
                    {isPaymentDisabled && !isProcessing && !token && (
                         <p className={styles.disabledReason}>Please log in to place an order.</p>
                    )}
                     {isPaymentDisabled && !isProcessing && token && mode === 'training' && (
                         <p className={styles.disabledReason}>Training booking is handled separately.</p>
                    )}
                    {isPaymentDisabled && !isProcessing && token && mode === 'court' && grandTotal <= 0 && (
                         <p className={styles.disabledReason}>Please select items to order.</p>
                    )}
                     {isPaymentDisabled && !isProcessing && token && mode === 'court' && grandTotal > 0 && !selectedPaymentMethod && (
                         <p className={styles.disabledReason}>Please select a payment method.</p>
                    )}
                     {/* Specific message if court details are still loading */}
                     {/* Remove loadingCourtData check */}
                     {/* {mode === 'court' && !isProcessing && bookingData.selectedCourt && ( ... )} */}
                     {/* This specific message might no longer be needed if loading is handled elsewhere or is very fast */}
                     {/* Remove !loadingCourtData check */}
                     {isPaymentDisabled && !isProcessing && token && mode === 'court' && grandTotal > 0 && selectedPaymentMethod && !isBookingSelectionValid && (
                          <p className={styles.disabledReason}>Please select a valid court and time slot.</p>
                     )}
                </form>
            </section>

            {/* Remove Confirmation Modal section entirely */}
        </>
    );
};

export default Total;
function createUTCDate(date: string, time: string): string {
    // Combine date and time into a single string
    const localDateTime = new Date(`${date}T${time}:00`);

    // Convert the local date-time to UTC
    const utcDateTime = new Date(
        localDateTime.getTime() - localDateTime.getTimezoneOffset() * 60000
    );

    // Format the UTC date-time as an ISO string without milliseconds
    return utcDateTime.toISOString().replace(".000Z", "Z");
}
