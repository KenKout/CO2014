// app/booking/components/Total.tsx
"use client";

import styles from "../Booking.module.css";
import { EquipmentItem } from "./Equipments";
import { FoodDrinkItem } from "./FoodAndDrink";

interface TotalProps {
	bookingData: {
		date: string;
		startTime: string;
		endTime: string;
		duration: number;
		selectedCourt: number | null;
	};
	equipmentItems: EquipmentItem[];
	foodDrinkItems: FoodDrinkItem[];
}

const Total = ({ bookingData, equipmentItems, foodDrinkItems }: TotalProps) => {
	// Calculate court booking price
	const calculateCourtPrice = (): number => {
		if (
			!bookingData.date ||
			!bookingData.startTime ||
			!bookingData.duration
		)
			return 0;

		const bookingDate = new Date(bookingData.date);
		const dayOfWeek = bookingDate.getDay();
		const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

		const hour = parseInt(bookingData.startTime.split(":")[0]);
		const isPeakHour = hour >= 17 && hour < 21;

		let hourlyRate;
		if (isWeekend) {
			hourlyRate = 25;
		} else if (isPeakHour) {
			hourlyRate = 20;
		} else {
			hourlyRate = 15;
		}

		return hourlyRate * bookingData.duration;
	};

	// Calculate equipment total
	const calculateEquipmentTotal = (): number => {
		return equipmentItems.reduce((total, item) => {
			return total + item.price * item.quantity;
		}, 0);
	};

	// Calculate food and drink total
	const calculateFoodDrinkTotal = (): number => {
		return foodDrinkItems.reduce((total, item) => {
			return total + item.price * item.quantity;
		}, 0);
	};

	// Calculate grand total
	const courtPrice = calculateCourtPrice();
	const equipmentTotal = calculateEquipmentTotal();
	const foodDrinkTotal = calculateFoodDrinkTotal();
	const grandTotal = courtPrice + equipmentTotal + foodDrinkTotal;

	return (
		<section className={styles.totalSection}>
			<h2 className={styles.sectionTitle}>Order Summary</h2>
			<div className={styles.totalContainer}>
				<div className={styles.summaryItem}>
					<span>Court Booking:</span>
					<span>${courtPrice.toFixed(2)}</span>
				</div>

				{equipmentTotal > 0 && (
					<div className={styles.summaryItem}>
						<span>Equipment Rental:</span>
						<span>${equipmentTotal.toFixed(2)}</span>
					</div>
				)}

				{foodDrinkTotal > 0 && (
					<div className={styles.summaryItem}>
						<span>Food & Drinks:</span>
						<span>${foodDrinkTotal.toFixed(2)}</span>
					</div>
				)}

				<div className={`${styles.summaryItem} ${styles.grandTotal}`}>
					<span>Total:</span>
					<span>${grandTotal.toFixed(2)}</span>
				</div>

				<button
					className={styles.checkoutButton}
					disabled={!bookingData.selectedCourt || grandTotal === 0}
				>
					Proceed to Checkout
				</button>
			</div>
		</section>
	);
};

export default Total;
