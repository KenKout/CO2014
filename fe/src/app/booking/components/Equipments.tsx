// app/booking/components/Equipments.tsx
"use client";

import { useState } from "react";
import styles from "../Booking.module.css";

export interface EquipmentItem {
	id: string;
	name: string;
	price: number;
	quantity: number;
}

interface EquipmentsProps {
	onEquipmentChange: (items: EquipmentItem[]) => void;
}

const Equipments = ({ onEquipmentChange }: EquipmentsProps) => {
	const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([
		{ id: "racket", name: "Racket", price: 5, quantity: 0 },
		{
			id: "shuttlecock",
			name: "Shuttlecock (tube of 12)",
			price: 8,
			quantity: 0,
		},
		{ id: "shoes", name: "Court Shoes", price: 7, quantity: 0 },
		{ id: "wristband", name: "Wristband", price: 2, quantity: 0 },
		{ id: "towel", name: "Towel", price: 3, quantity: 0 },
	]);

	const handleQuantityChange = (id: string, quantity: number) => {
		const updatedItems = equipmentItems.map((item) =>
			item.id === id ? { ...item, quantity } : item
		);
		setEquipmentItems(updatedItems);
		onEquipmentChange(updatedItems);
	};

	return (
		<section className={styles.equipmentSection}>
			<h2 className={styles.sectionTitle}>Equipment Rental</h2>
			<div className={styles.equipmentContainer}>
				{equipmentItems.map((item) => (
					<div key={item.id} className={styles.equipmentItem}>
						<div className={styles.equipmentInfo}>
							<h3>{item.name}</h3>
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
										Math.max(0, item.quantity - 1)
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
		</section>
	);
};

export default Equipments;
