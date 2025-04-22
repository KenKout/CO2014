// app/booking/components/Total.tsx
"use client";

import styles from "../Booking.module.css";
import { EquipmentItem } from "./Equipments";
import { FoodDrinkItem } from "./FoodAndDrink";

interface TotalProps {
    // Ensure the parent component passes all required data
    bookingData: {
        date?: string; // Make optional if they might not be selected yet
        startTime?: string; // Make optional
        endTime?: string; // Make optional
        duration?: number; // Make optional
        selectedCourt: number | null;
    };
    equipmentItems: EquipmentItem[];
    foodDrinkItems: FoodDrinkItem[];
}

const Total = ({ bookingData, equipmentItems, foodDrinkItems }: TotalProps) => {

    // --- MODIFICATION START ---
    // Calculate court booking price in VND, including premium logic
    const calculateCourtPrice = (): number => {
        // Guard clause: ensure necessary data is present
        if (!bookingData.date || !bookingData.startTime || !bookingData.duration || bookingData.duration <= 0) {
            return 0;
        }

        // Define base rates in VND (same as in BookingForm)
        const offPeakRate = 90000; 
        const peakRate = 120000;    
        const weekendRate = 140000; 
        const premiumSurcharge = 50000;

        const bookingDate = new Date(bookingData.date);
        // Use getUTCDay for consistency if needed, otherwise getDay is fine if timezone isn't an issue server/client side
        const dayOfWeek = bookingDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        const hour = parseInt(bookingData.startTime.split(":")[0]);
        const isPeakHour = hour >= 17 && hour < 21; // 5 PM to < 9 PM

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
        const isPremiumCourt = bookingData.selectedCourt === 1 || bookingData.selectedCourt === 4;
        if (isPremiumCourt) {
            hourlyRate += premiumSurcharge;
        }

        // Calculate total price
        const totalPrice = hourlyRate * bookingData.duration;
        return totalPrice;
    };
    // --- MODIFICATION END ---


    // Calculate equipment total (logic remains the same, prices are now VND)
    const calculateEquipmentTotal = (): number => {
        return equipmentItems.reduce((total, item) => {
            // Ensure quantity is positive
            return total + item.price * Math.max(0, item.quantity);
        }, 0);
    };

    // Calculate food and drink total (logic remains the same, prices are now VND)
    const calculateFoodDrinkTotal = (): number => {
        return foodDrinkItems.reduce((total, item) => {
            // Ensure quantity is positive
            return total + item.price * Math.max(0, item.quantity);
        }, 0);
    };

    // Calculate grand total
    const courtPrice = calculateCourtPrice();
    const equipmentTotal = calculateEquipmentTotal();
    const foodDrinkTotal = calculateFoodDrinkTotal();
    const grandTotal = courtPrice + equipmentTotal + foodDrinkTotal;

    // Determine if checkout should be disabled
    const isCheckoutDisabled = !bookingData.selectedCourt || !bookingData.duration || bookingData.duration <= 0 || grandTotal <= 0;


    return (
        <section className={styles.totalSection}>
            <h2 className={styles.sectionTitle}>Order Summary</h2>
            <div className={styles.totalContainer}>
                {/* --- MODIFICATION START --- */}
                {/* Update price displays to use VND formatting */}
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

                <button
                    className={styles.checkoutButton}
                    disabled={isCheckoutDisabled} // Updated disabled logic
                    title={isCheckoutDisabled ? "Please select a court and time slot" : "Proceed to Payment"}
                >
                    Proceed to Checkout
                </button>
                {/* --- MODIFICATION END --- */}
            </div>
        </section>
    );
};

export default Total;
