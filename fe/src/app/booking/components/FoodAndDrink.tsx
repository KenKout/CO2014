"use client";

import { useState, useEffect } from "react"; // Import useEffect if needed
import styles from "../Booking.module.css";

export interface FoodDrinkItem {
    id: string;
    name: string;
    price: number; // Price is now in VND
    quantity: number;
    category: "food" | "drink";
}

interface FoodAndDrinkProps {
    onFoodDrinkChange: (items: FoodDrinkItem[]) => void;
}

const FoodAndDrink = ({ onFoodDrinkChange }: FoodAndDrinkProps) => {
    // --- MODIFICATION START ---
    // Update prices to plausible VND amounts
    const [foodDrinkItems, setFoodDrinkItems] = useState<FoodDrinkItem[]>([
        { id: "water", name: "Bottled Water (500ml)", price: 15000, quantity: 0, category: "drink" }, // 15k
        { id: "sportsdrink", name: "Sports Drink (Revive/Pocari)", price: 20000, quantity: 0, category: "drink" }, // 25k
        { id: "juice", name: "Fresh Juice", price: 10000, quantity: 0, category: "drink" }, // 40k (new item example)
        { id: "energybar", name: "Energy Bar", price: 35000, quantity: 0, category: "food" }, // 35k
        { id: "sandwich", name: "Club Sandwich", price: 25000, quantity: 0, category: "food" }, // 70k
        { id: "fruit", name: "Fruit Bowl", price: 50000, quantity: 0, category: "food" }, // 50k
        { id: "chips", name: "Potato Chips (Small)", price: 20000, quantity: 0, category: "food" }, // 20k
    ]);
    // --- MODIFICATION END ---

    const handleQuantityChange = (id: string, quantity: number) => {
        const newQuantity = Math.max(0, quantity); // Ensure quantity doesn't go below 0
        const updatedItems = foodDrinkItems.map((item) =>
            item.id === id ? { ...item, quantity: newQuantity } : item
        );
        setFoodDrinkItems(updatedItems);
        onFoodDrinkChange(updatedItems); // Notify parent component
    };

    // Optional: useEffect(() => { onFoodDrinkChange(foodDrinkItems); }, []);

    return (
        <section className={styles.foodDrinkSection}>
            <h2 className={styles.sectionTitle}>Refreshments</h2> {/* Changed title */}
            <div className={styles.foodDrinkContainer}>
                <div className={styles.categoryContainer}>
                    <h3 className={styles.categoryTitle}>Drinks</h3>
                    <div className={styles.itemsGrid}>
                        {foodDrinkItems
                            .filter((item) => item.category === "drink")
                            .map((item) => (
                                <div
                                    key={item.id}
                                    className={styles.foodDrinkItem} // Use specific class if needed
                                >
                                    <div className={styles.itemInfo}>
                                        <h4>{item.name}</h4>
                                        {/* --- MODIFICATION START --- */}
                                        {/* Update price display */}
                                        <p className={styles.price}>
                                            {item.price.toLocaleString('vi-VN')} VND
                                        </p>
                                        {/* --- MODIFICATION END --- */}
                                    </div>
                                    <div className={styles.quantityControl}>
                                        <button
                                            className={`${styles.quantityButton} ${styles.decreaseButton}`}
                                            onClick={() =>
                                                handleQuantityChange(item.id, item.quantity - 1)
                                            }
                                            disabled={item.quantity === 0}
                                            aria-label={`Decrease ${item.name} quantity`}
                                        >
                                            -
                                        </button>
                                        <span className={styles.quantity}>
                                            {item.quantity}
                                        </span>
                                        <button
                                            className={`${styles.quantityButton} ${styles.increaseButton}`}
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
                </div>

                <div className={styles.categoryContainer}>
                    <h3 className={styles.categoryTitle}>Snacks & Food</h3> {/* Changed title */}
                    <div className={styles.itemsGrid}>
                        {foodDrinkItems
                            .filter((item) => item.category === "food")
                            .map((item) => (
                                <div
                                    key={item.id}
                                    className={styles.foodDrinkItem} // Use specific class if needed
                                >
                                    <div className={styles.itemInfo}>
                                        <h4>{item.name}</h4>
                                        {/* --- MODIFICATION START --- */}
                                        {/* Update price display */}
                                        <p className={styles.price}>
                                            {item.price.toLocaleString('vi-VN')} VND
                                        </p>
                                        {/* --- MODIFICATION END --- */}
                                    </div>
                                    <div className={styles.quantityControl}>
                                        <button
                                            className={`${styles.quantityButton} ${styles.decreaseButton}`}
                                            onClick={() =>
                                                handleQuantityChange(item.id, item.quantity - 1)
                                            }
                                            disabled={item.quantity === 0}
                                            aria-label={`Decrease ${item.name} quantity`}
                                        >
                                            -
                                        </button>
                                        <span className={styles.quantity}>
                                            {item.quantity}
                                        </span>
                                        <button
                                            className={`${styles.quantityButton} ${styles.increaseButton}`}
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
                </div>
            </div>
        </section>
    );
};

export default FoodAndDrink;