// app/booking/components/FoodAndDrink.tsx
"use client";

import { useState } from "react";
import styles from "../Booking.module.css";

export interface FoodDrinkItem {
	id: string;
	name: string;
	price: number;
	quantity: number;
	category: "food" | "drink";
}

interface FoodAndDrinkProps {
	onFoodDrinkChange: (items: FoodDrinkItem[]) => void;
}

const FoodAndDrink = ({ onFoodDrinkChange }: FoodAndDrinkProps) => {
	const [foodDrinkItems, setFoodDrinkItems] = useState<FoodDrinkItem[]>([
		{
			id: "water",
			name: "Bottled Water",
			price: 1.5,
			quantity: 0,
			category: "drink",
		},
		{
			id: "sportsdrink",
			name: "Sports Drink",
			price: 3,
			quantity: 0,
			category: "drink",
		},
		{
			id: "energybar",
			name: "Energy Bar",
			price: 2.5,
			quantity: 0,
			category: "food",
		},
		{
			id: "sandwich",
			name: "Sandwich",
			price: 6,
			quantity: 0,
			category: "food",
		},
		{
			id: "fruit",
			name: "Fresh Fruit",
			price: 2,
			quantity: 0,
			category: "food",
		},
		{
			id: "chips",
			name: "Chips",
			price: 1.5,
			quantity: 0,
			category: "food",
		},
	]);

	const handleQuantityChange = (id: string, quantity: number) => {
		const updatedItems = foodDrinkItems.map((item) =>
			item.id === id ? { ...item, quantity } : item
		);
		setFoodDrinkItems(updatedItems);
		onFoodDrinkChange(updatedItems);
	};

	return (
		<section className={styles.foodDrinkSection}>
			<h2 className={styles.sectionTitle}>Food & Drinks</h2>
			<div className={styles.foodDrinkContainer}>
				<div className={styles.categoryContainer}>
					<h3 className={styles.categoryTitle}>Drinks</h3>
					<div className={styles.itemsGrid}>
						{foodDrinkItems
							.filter((item) => item.category === "drink")
							.map((item) => (
								<div
									key={item.id}
									className={styles.foodDrinkItem}
								>
									<div className={styles.itemInfo}>
										<h4>{item.name}</h4>
										<p className={styles.price}>
											${item.price.toFixed(2)}
										</p>
									</div>
									<div className={styles.quantityControl}>
										<button
											className={styles.quantityButton}
											onClick={() =>
												handleQuantityChange(
													item.id,
													Math.max(
														0,
														item.quantity - 1
													)
												)
											}
											aria-label={`Decrease ${item.name} quantity`}
										>
											-
										</button>
										<span className={styles.quantity}>
											{item.quantity}
										</span>
										<button
											className={styles.quantityButton}
											onClick={() =>
												handleQuantityChange(
													item.id,
													item.quantity + 1
												)
											}
											aria-label={`Increase ${item.name} quantity`}
										>
											+
										</button>
									</div>
								</div>
							))}
					</div>
				</div>

				<div className={styles.categoryContainer}>
					<h3 className={styles.categoryTitle}>Food</h3>
					<div className={styles.itemsGrid}>
						{foodDrinkItems
							.filter((item) => item.category === "food")
							.map((item) => (
								<div
									key={item.id}
									className={styles.foodDrinkItem}
								>
									<div className={styles.itemInfo}>
										<h4>{item.name}</h4>
										<p className={styles.price}>
											${item.price.toFixed(2)}
										</p>
									</div>
									<div className={styles.quantityControl}>
										<button
											className={styles.quantityButton}
											onClick={() =>
												handleQuantityChange(
													item.id,
													Math.max(
														0,
														item.quantity - 1
													)
												)
											}
											aria-label={`Decrease ${item.name} quantity`}
										>
											-
										</button>
										<span className={styles.quantity}>
											{item.quantity}
										</span>
										<button
											className={styles.quantityButton}
											onClick={() =>
												handleQuantityChange(
													item.id,
													item.quantity + 1
												)
											}
											aria-label={`Increase ${item.name} quantity`}
										>
											+
										</button>
									</div>
								</div>
							))}
					</div>
				</div>
			</div>
		</section>
	);
};

export default FoodAndDrink;
