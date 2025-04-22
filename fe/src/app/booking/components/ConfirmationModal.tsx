// app/booking/components/ConfirmationModal.tsx
import React from 'react';
import styles from '../Booking.module.css'; // Use the same CSS module or create a new one
import Link from 'next/link';

interface ConfirmationDetails {
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    courtNumber: number;
    courtType: string; // e.g., "Standard", "Premium"
    courtPrice: number;
    equipmentTotal: number;
    foodDrinkTotal: number;
    grandTotal: number;
    // Add equipmentItems/foodDrinkItems details if you want to list them
    // equipmentItems: { name: string; quantity: number; price: number }[];
    // foodDrinkItems: { name: string; quantity: number; price: number }[];
}

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void; // Function to close the modal and navigate home
    details: ConfirmationDetails | null;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, details }) => {
    if (!isOpen || !details) {
        return null; // Don't render anything if not open or no details
    }

    // Helper to format currency
    const formatCurrency = (amount: number) => {
        return amount.toLocaleString("vi-VN", { style: 'currency', currency: 'VND' });
    };

    return (
        <div className={styles.modalOverlay}> {/* Add styles for overlay */}
            <div className={styles.modalContent}> {/* Add styles for content box */}
                <h2 className={styles.modalTitle}>Booking Confirmed!</h2>

                <div className={styles.modalSection}>
                    <h4 className={styles.modalSectionTitle}>Booking Details</h4>
                    <p><strong>Date:</strong> {new Date(details.date).toLocaleDateString('en-GB')}</p>
                    <p><strong>Time:</strong> {details.startTime} - {details.endTime} ({details.duration} hour{details.duration > 1 ? 's' : ''})</p>
                    <p><strong>Court:</strong> {details.courtNumber} ({details.courtType})</p>
                </div>

                <div className={styles.modalSection}>
                    <h4 className={styles.modalSectionTitle}>Order Summary</h4>
                    <div className={styles.modalSummaryItem}>
                        <span>Court Booking:</span>
                        <span>{formatCurrency(details.courtPrice)}</span>
                    </div>
                    {details.equipmentTotal > 0 && (
                        <div className={styles.modalSummaryItem}>
                            <span>Equipment Rental:</span>
                            <span>{formatCurrency(details.equipmentTotal)}</span>
                        </div>
                    )}
                    {details.foodDrinkTotal > 0 && (
                        <div className={styles.modalSummaryItem}>
                            <span>Food & Drinks:</span>
                            <span>{formatCurrency(details.foodDrinkTotal)}</span>
                        </div>
                    )}
                     <div className={`${styles.modalSummaryItem} ${styles.modalGrandTotal}`}>
                        <span>Total Paid:</span>
                        <span>{formatCurrency(details.grandTotal)}</span>
                    </div>
                </div>

                {/* Optional: List specific items */}
                {/*
                {details.equipmentItems.length > 0 && (
                    <div className={styles.modalSection}>
                        <h4 className={styles.modalSectionTitle}>Equipment</h4>
                        <ul>
                            {details.equipmentItems.map(item => (
                                <li key={item.name}>{item.name} x {item.quantity}</li>
                            ))}
                        </ul>
                    </div>
                )}
                 {details.foodDrinkItems.length > 0 && (
                    <div className={styles.modalSection}>
                        <h4 className={styles.modalSectionTitle}>Food & Drink</h4>
                         <ul>
                            {details.foodDrinkItems.map(item => (
                                <li key={item.name}>{item.name} x {item.quantity}</li>
                            ))}
                        </ul>
                    </div>
                )}
                */}
             
                <button onClick={onClose} className={styles.modalHomeButton}>
                    HOME
                </button>
            </div>
        </div>
    );
};

export default ConfirmationModal;