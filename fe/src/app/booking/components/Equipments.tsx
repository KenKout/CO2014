// app/booking/components/Equipments.tsx
"use client";

import { useState, useEffect } from "react";
import styles from "@/styles/Booking.module.css";
import { createApiClient } from '@/utils/api';

// API response interface
interface EquipmentResponse {
    EquipmentID: number;
    Price: number;
    Type: string;
    Stock: number;
    Name: string;
    Brand: string;
    url: string | null;
}

export interface EquipmentItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    brand?: string;
    type?: string;
    stock?: number;
    imageUrl?: string | null;
}

interface EquipmentsProps {
    onEquipmentChange: (items: EquipmentItem[]) => void;
}

const Equipments = ({ onEquipmentChange }: EquipmentsProps) => {
    const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEquipment = async () => {
            try {
                setLoading(true);
                const apiClient = createApiClient(null);
                const response = await apiClient.get('/public/equipment/');
                
                // Transform the data from the API to match our EquipmentItem interface
                const transformedEquipment = response.data.map((item: EquipmentResponse) => ({
                    id: item.EquipmentID.toString(),
                    name: item.Name,
                    price: item.Price,
                    quantity: 0,
                    brand: item.Brand,
                    type: item.Type,
                    stock: item.Stock,
                    imageUrl: item.url
                }));
                
                setEquipmentItems(transformedEquipment);
                setLoading(false);
            } catch (err) {
                setError('Failed to load equipment. Please try again later.');
                setLoading(false);
                console.error('Error fetching equipment:', err);
            }
        };

        fetchEquipment();
    }, []);

	   const handleQuantityChange = (id: string, quantity: number) => {
	       const newQuantity = Math.max(0, quantity); // Ensure quantity doesn't go below 0
	       const updatedItems = equipmentItems.map((item) =>
	           item.id === id ? { ...item, quantity: newQuantity } : item
	       );
	       setEquipmentItems(updatedItems);
	       onEquipmentChange(updatedItems); // Notify parent component
	   };

	   // Initial empty equipment list notification
	   useEffect(() => {
	       onEquipmentChange(equipmentItems);
	   }, [equipmentItems, onEquipmentChange]);

	   if (loading) {
	       return <section className={styles.equipmentSection}><h2 className={styles.sectionTitle}>Equipment Rental</h2><p>Loading equipment...</p></section>;
	   }

	   if (error) {
	       return <section className={styles.equipmentSection}><h2 className={styles.sectionTitle}>Equipment Rental</h2><p>{error}</p></section>;
	   }

	   if (equipmentItems.length === 0) {
	       return <section className={styles.equipmentSection}><h2 className={styles.sectionTitle}>Equipment Rental</h2><p>No equipment available.</p></section>;
	   }

	   // Group equipment by type for categorization
	   const groupedEquipment = equipmentItems.reduce((acc, item) => {
	       const type = item.type || "Other";
	       if (!acc[type]) {
	           acc[type] = [];
	       }
	       acc[type].push(item);
	       return acc;
	   }, {} as Record<string, EquipmentItem[]>);

	   return (
	       <section className={styles.equipmentSection}>
	           <h2 className={styles.sectionTitle}>Equipment Rental</h2>
	           <div className={styles.equipmentContainer}>
	               {Object.entries(groupedEquipment).map(([type, items]) => (
	                   <div key={type} className={styles.categoryContainer}>
	                       <h3 className={styles.categoryTitle}>{type}</h3>
	                       <div className={styles.itemsGrid}>
	                           {items.map((item) => (
	                               <div key={item.id} className={styles.equipmentItem}>
	                                   <div className={styles.equipmentInfo}>
	                                       <h3>{item.name}</h3>
	                                       {item.brand && <p className={styles.brand}>Brand: {item.brand}</p>}
	                                       <p className={styles.price}>
	                                           {item.price.toLocaleString("vi-VN")} VND
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
	                                           aria-label={`Decrease ${item.name} quantity`}
	                                           disabled={item.quantity === 0}
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
	                   </div>
	               ))}
	           </div>
	       </section>
	   );
};

export default Equipments;
