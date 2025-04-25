
// app/booking/components/Equipments.tsx
"use client";

import { useState, useEffect } from "react"; // Import useEffect if needed elsewhere, not strictly needed for this change
import styles from "../Booking.module.css";

export interface EquipmentItem {
    id: string;
    name: string;
    price: number; // Price is now in VND
    quantity: number;
}

interface EquipmentsProps {
    onEquipmentChange: (items: EquipmentItem[]) => void;
}

const Equipments = ({ onEquipmentChange }: EquipmentsProps) => {
    // --- MODIFICATION START ---
    // Update prices to plausible VND amounts
    const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([
        { id: "racket", name: "Racket Rental", price: 40000, quantity: 0 },
        { id: "shoes", name: "Court Shoes Rental", price: 60000, quantity: 0 }, // e.g., 150,000 VND
        { id: "wristband", name: "Wristband Purchase", price: 15000, quantity: 0 }, // e.g., 50,000 VND
        { id: "towel", name: "Towel Rental", price: 30000, quantity: 0 },       // e.g., 70,000 VND
    ]);
    // --- MODIFICATION END ---

    const handleQuantityChange = (id: string, quantity: number) => {
        const newQuantity = Math.max(0, quantity); // Ensure quantity doesn't go below 0
        const updatedItems = equipmentItems.map((item) =>
            item.id === id ? { ...item, quantity: newQuantity } : item
        );
        setEquipmentItems(updatedItems);
        onEquipmentChange(updatedItems); // Notify parent component
    };

    // Use useEffect to call onEquipmentChange initially if needed, though typically done on interaction
    // useEffect(() => {
    //   onEquipmentChange(equipmentItems);
    // }, []); // Empty dependency array means run once on mount

    return (
        <section className={styles.equipmentSection}>
            <h2 className={styles.sectionTitle}>Equipment Rental</h2>
            <div className={styles.equipmentContainer}>
                {equipmentItems.map((item) => (
                    <div key={item.id} className={styles.equipmentItem}>
                        <div className={styles.equipmentInfo}>
                            <h3>{item.name}</h3>
                            {/* --- MODIFICATION START --- */}
                            {/* Update price display */}
                            <p className={styles.price}>
                                {item.price.toLocaleString("vi-VN")} VND 
                            </p>
                            {/* --- MODIFICATION END --- */}
                        </div>
                        <div className={styles.quantityControl}>
                            <button
                                className={`${styles.quantityButton} ${styles.decreaseButton}`} // Added specific class
                                onClick={() =>
                                    handleQuantityChange(item.id, item.quantity - 1)
                                }
                                aria-label={`Decrease ${item.name} quantity`}
                                disabled={item.quantity === 0} // Disable if quantity is 0
                            >
                                -
                            </button>
                            <span className={styles.quantity}>
                                {item.quantity}
                            </span>
                            <button
                                className={`${styles.quantityButton} ${styles.increaseButton}`} // Added specific class
                                onClick={() =>
                                    handleQuantityChange(item.id, item.quantity + 1)
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