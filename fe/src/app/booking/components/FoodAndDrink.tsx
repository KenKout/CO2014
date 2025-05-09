"use client";

import { useState, useEffect } from "react";
import styles from "@/styles/Booking.module.css";
import { createApiClient } from '@/utils/api';

// API response interface
interface FoodResponse {
    FoodID: number;
    Stock: number;
    Name: string;
    Category: string;
    Price: number;
    url: string | null;
}

export interface FoodDrinkItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category: "food" | "drink";
    stock?: number;
    imageUrl?: string | null;
}

interface FoodAndDrinkProps {
    onFoodDrinkChange: (items: FoodDrinkItem[]) => void;
}

const FoodAndDrink = ({ onFoodDrinkChange }: FoodAndDrinkProps) => {
    const [foodDrinkItems, setFoodDrinkItems] = useState<FoodDrinkItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentDrinkPage, setCurrentDrinkPage] = useState<number>(1);
    const [currentFoodPage, setCurrentFoodPage] = useState<number>(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchFoodAndDrink = async () => {
            try {
                setLoading(true);
                const apiClient = createApiClient(null);
                const response = await apiClient.get('/public/food/');
                
                // Transform the data from the API to match our FoodDrinkItem interface
                const transformedItems = response.data.map((item: FoodResponse) => ({
                    id: item.FoodID.toString(),
                    name: item.Name,
                    price: item.Price,
                    quantity: 0,
                    // Map the category from the API to our simplified categories
                    category: item.Category === 'Drink' ? 'drink' : 'food',
                    stock: item.Stock,
                    imageUrl: item.url
                }));
                
                setFoodDrinkItems(transformedItems);
                setLoading(false);
            } catch (err) {
                setError('Failed to load food and drinks. Please try again later.');
                setLoading(false);
                console.error('Error fetching food and drinks:', err);
            }
        };

        fetchFoodAndDrink();
    }, []);

    // Initial empty food/drink list notification
    useEffect(() => {
        onFoodDrinkChange(foodDrinkItems);
    }, [foodDrinkItems, onFoodDrinkChange]);

    const handleQuantityChange = (id: string, quantity: number) => {
        const newQuantity = Math.max(0, quantity); // Ensure quantity doesn't go below 0
        const updatedItems = foodDrinkItems.map((item) =>
            item.id === id ? { ...item, quantity: newQuantity } : item
        );
        setFoodDrinkItems(updatedItems);
        onFoodDrinkChange(updatedItems); // Notify parent component
    };

    if (loading) {
        return <section className={styles.foodDrinkSection}><h2 className={styles.sectionTitle}>Refreshments</h2><p>Loading refreshments...</p></section>;
    }

    if (error) {
        return <section className={styles.foodDrinkSection}><h2 className={styles.sectionTitle}>Refreshments</h2><p>{error}</p></section>;
    }

    if (foodDrinkItems.length === 0) {
        return <section className={styles.foodDrinkSection}><h2 className={styles.sectionTitle}>Refreshments</h2><p>No refreshments available.</p></section>;
    }

    // Get drinks and food items
    const drinkItems = foodDrinkItems.filter(item => item.category === "drink");
    const foodItems = foodDrinkItems.filter(item => item.category === "food");

    // Calculate pagination for drinks
    const totalDrinkPages = Math.ceil(drinkItems.length / itemsPerPage);
    const startDrinkIndex = (currentDrinkPage - 1) * itemsPerPage;
    const endDrinkIndex = Math.min(startDrinkIndex + itemsPerPage, drinkItems.length);
    const currentDrinkItems = drinkItems.slice(startDrinkIndex, endDrinkIndex);

    // Calculate pagination for food
    const totalFoodPages = Math.ceil(foodItems.length / itemsPerPage);
    const startFoodIndex = (currentFoodPage - 1) * itemsPerPage;
    const endFoodIndex = Math.min(startFoodIndex + itemsPerPage, foodItems.length);
    const currentFoodItems = foodItems.slice(startFoodIndex, endFoodIndex);

    return (
        <section className={styles.foodDrinkSection}>
            <h2 className={styles.sectionTitle}>Refreshments</h2>
            <div className={styles.foodDrinkContainer}>
                {drinkItems.length > 0 && (
                    <div className={styles.categoryContainer}>
                        <h3 className={styles.categoryTitle}>Drinks</h3>
                        <div className={styles.itemsGrid}>
                            {currentDrinkItems.map((item) => (
                                <div
                                    key={item.id}
                                    className={styles.foodDrinkItem}
                                >
                                    <div className={styles.itemInfo}>
                                        <h4>{item.name}</h4>
                                        <p className={styles.price}>
                                            {item.price.toLocaleString("vi-VN")}{" "}
                                            VND
                                        </p>
                                        {item.stock !== undefined && (
                                            <p className={styles.stock}>
                                                Available: {item.stock}
                                            </p>
                                        )}
                                    </div>
                                    <div className={styles.quantityControl}>
                                        <button
                                            className={`${styles.quantityButton} ${styles.decreaseButton}`}
                                            onClick={() =>
                                                handleQuantityChange(
                                                    item.id,
                                                    item.quantity - 1
                                                )
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
                                                handleQuantityChange(
                                                    item.id,
                                                    item.quantity + 1
                                                )
                                            }
                                            aria-label={`Increase ${item.name} quantity`}
                                            disabled={item.stock !== undefined && item.quantity >= item.stock}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Pagination controls for drinks */}
                        {totalDrinkPages > 1 && (
                            <div className={styles.pagination}>
                                <button
                                    onClick={() => setCurrentDrinkPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentDrinkPage === 1}
                                    className={styles.paginationButton}
                                >
                                    Previous
                                </button>
                                <span className={styles.pageInfo}>
                                    Page {currentDrinkPage} of {totalDrinkPages}
                                </span>
                                <button
                                    onClick={() => setCurrentDrinkPage(prev => Math.min(prev + 1, totalDrinkPages))}
                                    disabled={currentDrinkPage === totalDrinkPages}
                                    className={styles.paginationButton}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {foodItems.length > 0 && (
                    <div className={styles.categoryContainer}>
                        <h3 className={styles.categoryTitle}>Snacks & Food</h3>
                        <div className={styles.itemsGrid}>
                            {currentFoodItems.map((item) => (
                                <div
                                    key={item.id}
                                    className={styles.foodDrinkItem}
                                >
                                    <div className={styles.itemInfo}>
                                        <h4>{item.name}</h4>
                                        <p className={styles.price}>
                                            {item.price.toLocaleString("vi-VN")}{" "}
                                            VND
                                        </p>
                                        {item.stock !== undefined && (
                                            <p className={styles.stock}>
                                                Available: {item.stock}
                                            </p>
                                        )}
                                    </div>
                                    <div className={styles.quantityControl}>
                                        <button
                                            className={`${styles.quantityButton} ${styles.decreaseButton}`}
                                            onClick={() =>
                                                handleQuantityChange(
                                                    item.id,
                                                    item.quantity - 1
                                                )
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
                                                handleQuantityChange(
                                                    item.id,
                                                    item.quantity + 1
                                                )
                                            }
                                            aria-label={`Increase ${item.name} quantity`}
                                            disabled={item.stock !== undefined && item.quantity >= item.stock}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Pagination controls for food */}
                        {totalFoodPages > 1 && (
                            <div className={styles.pagination}>
                                <button
                                    onClick={() => setCurrentFoodPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentFoodPage === 1}
                                    className={styles.paginationButton}
                                >
                                    Previous
                                </button>
                                <span className={styles.pageInfo}>
                                    Page {currentFoodPage} of {totalFoodPages}
                                </span>
                                <button
                                    onClick={() => setCurrentFoodPage(prev => Math.min(prev + 1, totalFoodPages))}
                                    disabled={currentFoodPage === totalFoodPages}
                                    className={styles.paginationButton}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default FoodAndDrink;
