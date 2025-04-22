// app/booking/components/Total.tsx
"use client";

import styles from "../Booking.module.css";
import { EquipmentItem } from "./Equipments";
import { FoodDrinkItem } from "./FoodAndDrink";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter for navigation
import ConfirmationModal from './ConfirmationModal'; // Import the modal component

// Define possible payment methods
type PaymentMethod = 'momo' | 'zalopay' | 'bank-transfer';

// Define structure for confirmation details
interface ConfirmationDetails {
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    courtNumber: number;
    courtType: string;
    courtPrice: number;
    equipmentTotal: number;
    foodDrinkTotal: number;
    grandTotal: number;
    // Add items if needed
    // equipmentItems: EquipmentItem[];
    // foodDrinkItems: FoodDrinkItem[];
}


interface TotalProps {
    bookingData: {
        date?: string;
        startTime?: string;
        endTime?: string;
        duration?: number;
        selectedCourt: number | null;
    };
    equipmentItems: EquipmentItem[];
    foodDrinkItems: FoodDrinkItem[];
}

const Total = ({ bookingData, equipmentItems, foodDrinkItems }: TotalProps) => {
    const router = useRouter(); // Initialize router

    // --- State ---
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false); // State for modal visibility
    const [confirmationDetails, setConfirmationDetails] = useState<ConfirmationDetails | null>(null); // State for modal data

    // --- Calculation Logic (remains the same) ---
    const calculateCourtPrice = (): number => {
        if (!bookingData.date || !bookingData.startTime || !bookingData.duration || bookingData.duration <= 0 || bookingData.selectedCourt === null) {
            return 0;
        }
        const offPeakRate = 90000;
        const peakRate = 120000;
        const weekendRate = 140000;
        const premiumSurcharge = 50000;
        const bookingDate = new Date(bookingData.date);
        const dayOfWeek = bookingDate.getUTCDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const hour = parseInt(bookingData.startTime.split(":")[0]);
        const isPeakHour = hour >= 17 && hour < 21;
        let hourlyRate;
        if (isWeekend) hourlyRate = weekendRate;
        else if (isPeakHour) hourlyRate = peakRate;
        else hourlyRate = offPeakRate;
        const isPremiumCourt = bookingData.selectedCourt === 1 || bookingData.selectedCourt === 4;
        if (isPremiumCourt) hourlyRate += premiumSurcharge;
        return hourlyRate * bookingData.duration;
    };
    const calculateEquipmentTotal = (): number => {
        return equipmentItems.reduce((total, item) => total + item.price * Math.max(0, item.quantity), 0);
    };
    const calculateFoodDrinkTotal = (): number => {
        return foodDrinkItems.reduce((total, item) => total + item.price * Math.max(0, item.quantity), 0);
    };

    const courtPrice = calculateCourtPrice();
    const equipmentTotal = calculateEquipmentTotal();
    const foodDrinkTotal = calculateFoodDrinkTotal();
    const grandTotal = courtPrice + equipmentTotal + foodDrinkTotal;

    // Determine if payment should be disabled
    const isPaymentDisabled =
        !bookingData.selectedCourt ||
        !bookingData.duration ||
        bookingData.duration <= 0 ||
        grandTotal <= 0 ||
        !selectedPaymentMethod ||
        isProcessing;

    // --- Handler for Payment Form Submission ---
    const handlePaymentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isPaymentDisabled || !selectedPaymentMethod || !bookingData.date || !bookingData.startTime || !bookingData.endTime || !bookingData.duration || !bookingData.selectedCourt) return; // Added more guards

        setIsProcessing(true);
        console.log(`Processing payment for ${grandTotal.toLocaleString("vi-VN")} VND via ${selectedPaymentMethod}`);

        // Simulate API call / Payment Gateway Interaction
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay

        // --- PAYMENT SUCCESS ---
        console.log("Payment simulation complete.");
        setIsProcessing(false);

        // Determine Court Type
        const isPremiumCourt = bookingData.selectedCourt === 1 || bookingData.selectedCourt === 4;
        const courtType = isPremiumCourt ? "Premium" : "Standard";

        // Prepare details for the confirmation modal
        const details: ConfirmationDetails = {
            date: bookingData.date,
            startTime: bookingData.startTime,
            endTime: bookingData.endTime,
            duration: bookingData.duration,
            courtNumber: bookingData.selectedCourt,
            courtType: courtType,
            courtPrice: courtPrice,
            equipmentTotal: equipmentTotal,
            foodDrinkTotal: foodDrinkTotal,
            grandTotal: grandTotal,
            // Optional: Add filtered items
            // equipmentItems: equipmentItems.filter(item => item.quantity > 0),
            // foodDrinkItems: foodDrinkItems.filter(item => item.quantity > 0),
        };

        setConfirmationDetails(details); // Store details in state
        setShowConfirmationModal(true); // Show the modal

        // No more alerts here, modal handles confirmation
        // TODO: In a real app, handle actual success/failure response from the backend/payment gateway
    };

    // --- Handler to Close Modal and Navigate Home ---
    const handleCloseModal = () => {
        setShowConfirmationModal(false);
        setConfirmationDetails(null);
        router.push('/'); // Navigate to the home page
    };


    // --- Helper to get Button Text ---
    const getButtonText = () => {
        // ... (button text logic remains the same) ...
        if (isProcessing) return 'Processing...';
        const amountText = grandTotal > 0 ? `${grandTotal.toLocaleString("vi-VN")} VND` : '';
        switch (selectedPaymentMethod) {
            case 'momo':
                return `Pay ${amountText} with Momo`;
            case 'zalopay':
                return `Pay ${amountText} with ZaloPay`;
            case 'bank-transfer':
                return `Confirm Bank Transfer Booking`;
            default:
                return 'Select Payment Method Above';
        }
    };

    return (
        <>
            {/* --- ORDER SUMMARY SECTION (Unchanged) --- */}
            <section className={styles.totalSection}>
                 <h2 className={styles.sectionTitle}>Order Summary</h2>
                 <div className={styles.totalContainer}>
                     {/* ... summary items ... */}
                     {courtPrice > 0 && (
                         <div className={styles.summaryItem}>
                            <span>Court Booking ({bookingData.duration || 0}h):</span>
                            <span className={styles.summaryPrice}>{courtPrice.toLocaleString("vi-VN")} VND</span>
                        </div>
                     )}
                     {equipmentTotal > 0 && (
                         <div className={styles.summaryItem}>
                            <span>Equipment Rental:</span>
                            <span className={styles.summaryPrice}>{equipmentTotal.toLocaleString("vi-VN")} VND</span>
                        </div>
                     )}
                     {foodDrinkTotal > 0 && (
                         <div className={styles.summaryItem}>
                            <span>Food & Drinks:</span>
                            <span className={styles.summaryPrice}>{foodDrinkTotal.toLocaleString("vi-VN")} VND</span>
                        </div>
                     )}
                     <div className={`${styles.summaryItem} ${styles.grandTotal}`}>
                         <span className={styles.grandTotalLabel}>Total Amount:</span>
                        <span className={styles.grandTotalPrice}>{grandTotal.toLocaleString("vi-VN")} VND</span>
                     </div>
                 </div>
             </section>

            {/* --- PAYMENT SECTION (Unchanged UI, updated submit handler) --- */}
            <section className={styles.paymentSection}>
                 <h2 className={styles.sectionTitle}>Payment Details</h2>
                {/* ... Payment Method Selector ... */}
                <div className={styles.paymentMethodSelector}>
                    <h4 className={styles.paymentMethodTitle}>Choose Payment Method:</h4>
                    <div className={styles.paymentOptionsContainer}>
                         {/* Option 1: Momo */}
                        <label className={`${styles.paymentMethodOption} ${selectedPaymentMethod === 'momo' ? styles.selected : ''}`}>
                            <input type="radio" name="paymentMethod" value="momo" checked={selectedPaymentMethod === 'momo'} onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)} disabled={isProcessing} />
                             <img src="https://developers.momo.vn/v3/assets/images/square-logo-f8712a4d5be38f389e6bc94c70a33bf4.png" alt="Momo" className={styles.paymentLogo} />
                            <span>Momo</span>
                        </label>
                         {/* Option 2: ZaloPay */}
                         <label className={`${styles.paymentMethodOption} ${selectedPaymentMethod === 'zalopay' ? styles.selected : ''}`}>
                            <input type="radio" name="paymentMethod" value="zalopay" checked={selectedPaymentMethod === 'zalopay'} onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)} disabled={isProcessing} />
                            <img src="https://img.icons8.com/ios-filled/50/zalo.png" alt="ZaloPay" className={styles.paymentLogo} />
                            <span>ZaloPay</span>
                        </label>
                         {/* Option 3: Bank Transfer */}
                        <label className={`${styles.paymentMethodOption} ${selectedPaymentMethod === 'bank-transfer' ? styles.selected : ''}`}>
                             <input type="radio" name="paymentMethod" value="bank-transfer" checked={selectedPaymentMethod === 'bank-transfer'} onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)} disabled={isProcessing} />
                             <svg className={styles.paymentLogo} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor" height="20" width="20"><path d="M256 0c-17.7 0-32 14.3-32 32V67.4C132.2 88.7 64 169.1 64 264v88H448V264c0-94.9-68.2-175.3-160-196.6V32c0-17.7-14.3-32-32-32zM64 384H448c17.7 0 32 14.3 32 32v32c0 17.7-14.3 32-32 32H64c-17.7 0-32-14.3-32-32V416c0-17.7 14.3-32 32-32zM288 288a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/></svg>
                            <span>Bank Transfer</span>
                        </label>
                    </div>
                </div>

                 <form onSubmit={handlePaymentSubmit} className={styles.paymentFormContainer}>
                    {/* ... Conditionally Rendered Info ... */}
                     {selectedPaymentMethod === 'momo' && (
                         <div className={styles.digitalWalletInfo}>
                            <p>You will be prompted to complete the payment using the Momo app (either via redirect or QR code).</p>
                         </div>
                    )}
                     {selectedPaymentMethod === 'zalopay' && (
                         <div className={styles.digitalWalletInfo}>
                            <p>You will be prompted to complete the payment using the ZaloPay app (either via redirect or QR code).</p>
                         </div>
                    )}
                    {selectedPaymentMethod === 'bank-transfer' && (
                         <div className={styles.digitalWalletInfo}>
                         <p>You will be prompted to complete the payment using bank transition (either via redirect or QR code).</p>
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

                    {/* ... Disabled Messages ... */}
                    {isPaymentDisabled && grandTotal > 0 && !isProcessing && !selectedPaymentMethod && (
                         <p className={styles.paymentDisabledMessage}>Please select a payment method.</p>
                    )}
                     {isPaymentDisabled && grandTotal > 0 && !isProcessing && (!bookingData.selectedCourt || !bookingData.duration || bookingData.duration <= 0) && (
                         <p className={styles.paymentDisabledMessage}>Please ensure booking details (date, time, court) are complete in the summary above.</p>
                    )}
                </form>
            </section>

            {/* --- RENDER THE MODAL --- */}
            <ConfirmationModal
                isOpen={showConfirmationModal}
                onClose={handleCloseModal}
                details={confirmationDetails}
            />
        </>
    );
};

export default Total;