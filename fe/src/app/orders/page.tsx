// fe/src/app/orders/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import styles from '@/styles/Orders.module.css';
import { createApiClient } from '@/utils/api';

// --- Interfaces ---
interface BookingDetail {
    BookingID: number;
    StartTime: string;
    Endtime: string;
    Status: string;
    TotalPrice: number;
    Court_ID: number;
    CourtType: string;
    HourRate: number;
}

interface EquipmentRentalDetail {
    EquipmentID: number;
    Name: string;
    Brand?: string;
    EquipmentType: string;
    Price: number;
}

interface FoodItemDetail {
    FoodID: number;
    Name: string;
    FoodCategory: string;
    Price: number;
}

// --- NEW: Interface for Session Details (mirror backend structure) ---
interface SessionDetail {
    SessionID: number;
    Type: string;        // e.g., "Group Training", "Private Coaching"
    StartDate: string;
    EndDate: string;     // Add if available from backend
    // Add other relevant fields like Price, InstructorName if returned by the backend
    Price?: number; // Example
}

interface UserOrderDetail {
    order_id: number;
    order_date: string;
    total_amount: number;
    bookings: BookingDetail[];
    equipment_rentals: EquipmentRentalDetail[];
    food_items: FoodItemDetail[];
    // --- NEW: Add optional session details ---
    session?: SessionDetail | null; // Assuming an order can have at most one session linked directly? Adjust if needed.
    // --- Frontend-only flag (no change) ---
    feedback_submitted?: boolean;
}

interface FeedbackFormData {
    title: string;
    content: string;
    rate: number;
    target_id: number | null;
    feedback_on: 'Court' | 'Session' | ''; // Correct casing from backend enum values
    order_id: number | null;
    // --- NEW: Store the combined value for the select input ---
    feedbackTargetValue: string; // e.g., "court_1", "session_5"
}

const OrderHistoryPage: React.FC = () => {
    const [orders, setOrders] = useState<UserOrderDetail[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { token, logout } = useAuth();

    const [openFeedbackFormOrderId, setOpenFeedbackFormOrderId] = useState<number | null>(null);
    const [feedbackData, setFeedbackData] = useState<FeedbackFormData>({
        title: '',
        content: '',
        rate: 5,
        target_id: null,
        feedback_on: '',
        order_id: null,
        feedbackTargetValue: '', // Initialize new state field
    });
    const [feedbackLoading, setFeedbackLoading] = useState<boolean>(false);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);
    const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
    const [submittedOrderIds, setSubmittedOrderIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        const fetchOrders = async () => {
             if (!token) {
                 setLoading(false);
                 return;
             }
             setLoading(true);
             setError(null);
             try {
                 const apiClient = createApiClient(token, logout);
                 // IMPORTANT: Ensure backend /user/order/ now includes `session` details
                 const response = await apiClient.get<{ orders: UserOrderDetail[] }>('/user/order/');
                 setOrders(response.data.orders);
             } catch (err: any) {
                 console.error("Failed to fetch orders:", err);
                 setError(err.response?.data?.detail || err.message || "Failed to fetch order history.");
             } finally {
                 setLoading(false);
             }
         };

        if (token) {
             fetchOrders();
        } else {
             setLoading(false);
        }
    }, [token, logout]);

    // --- Formatting functions (keep as before, maybe add one for Session Date/Time if needed) ---
    const formatDate_order = (dateString: string | null | undefined): string => {
        if (!dateString) return "N/A";
        try {
            let dateToParse = dateString;
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateString)) {
                dateToParse = `${dateString}+07:00`;
            }
            const dateObj = new Date(dateToParse);
            if (isNaN(dateObj.getTime())) {
                 console.error("Invalid Date object created from:", dateToParse, "(original:", dateString, ")");
                 return "Invalid Date";
            }
            return dateObj.toLocaleDateString('en-US', {
                timeZone: 'Asia/Bangkok',
                year: 'numeric', month: 'short', day: 'numeric',
            });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return "Invalid Date Format";
        }
    };

    const formatDate = (dateString: string | null | undefined): string => {
        if (!dateString) return "N/A";
        try {
            const dateObj = new Date(dateString);
            if (isNaN(dateObj.getTime())) return "Invalid Date";
            return dateObj.toLocaleString('en-US', {
                timeZone: 'Asia/Bangkok',
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch (e) {
            console.error("Error creating Date object:", dateString, e);
            return "Invalid Date";
        }
    };

    // Format session start date (example, adjust as needed)
    const formatSessionDate = (dateString: string | null | undefined): string => {
         if (!dateString) return "N/A";
         // Use formatDate or a specific format for sessions
         return formatDate(dateString);
    };


    const formatVND = (value: number | null | undefined): string => {
        if (value === null || value === undefined || isNaN(value)) return "N/A";
        try {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency', currency: 'VND',
                minimumFractionDigits: 0, maximumFractionDigits: 0
            }).format(value);
        } catch (e) {
            console.error("Error formatting currency:", value, e);
            return `${value?.toLocaleString('vi-VN') ?? 'N/A'} ₫`;
        }
    };

    // --- Feedback form handlers ---

    const handleOpenFeedbackForm = (orderId: number) => {
        setOpenFeedbackFormOrderId(orderId);
        setFeedbackData({ // Reset form
            title: '',
            content: '',
            rate: 5,
            target_id: null,
            feedback_on: '',
            order_id: orderId,
            feedbackTargetValue: '', // Reset target value
        });
        setFeedbackError(null);
        setFeedbackSuccess(null);
    };

    const handleCloseFeedbackForm = () => {
        setOpenFeedbackFormOrderId(null);
    };

    const handleFeedbackInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Handle regular inputs
        if (name !== 'feedbackTargetValue') {
            setFeedbackData(prev => ({
                ...prev,
                [name]: name === 'rate' ? parseInt(value, 10) : value,
            }));
        } else {
            // --- UPDATED: Handle the combined target selection ---
            const selectedValue = value;
            let newTargetId: number | null = null;
            let newFeedbackOn: 'Court' | 'Session' | '' = '';

            if (selectedValue.startsWith('court_')) {
                const id = parseInt(selectedValue.split('_')[1], 10);
                if (!isNaN(id)) {
                    newTargetId = id;
                    newFeedbackOn = 'Court';
                }
            } else if (selectedValue.startsWith('session_')) {
                const id = parseInt(selectedValue.split('_')[1], 10);
                 if (!isNaN(id)) {
                    newTargetId = id;
                    newFeedbackOn = 'Session';
                }
            }

            setFeedbackData(prev => ({
                ...prev,
                feedbackTargetValue: selectedValue, // Store the raw select value
                target_id: newTargetId,          // Store the parsed ID
                feedback_on: newFeedbackOn,        // Store the determined type
            }));
        }
    };

    const handleFeedbackSubmit = async () => {
        // Validation now checks feedbackTargetValue to ensure something was selected
        if (!token || !feedbackData.order_id || !feedbackData.feedbackTargetValue || !feedbackData.target_id || !feedbackData.feedback_on || !feedbackData.title || !feedbackData.content) {
            setFeedbackError("Please select an item to review and fill in all feedback fields.");
            return;
        }

        setFeedbackLoading(true);
        setFeedbackError(null);
        setFeedbackSuccess(null);

        try {
            const apiClient = createApiClient(token, logout);
            // Payload uses the correctly parsed target_id and feedback_on
            const payload = {
                title: feedbackData.title,
                content: feedbackData.content,
                rate: feedbackData.rate,
                target_id: feedbackData.target_id, // Use the parsed ID
                feedback_on: feedbackData.feedback_on, // Use the determined type ('Court' or 'Session')
                order_id: feedbackData.order_id,
            };

            console.log("Submitting feedback payload:", payload);

            await apiClient.post('/user/feedback/', payload);

            setFeedbackSuccess("Feedback submitted successfully!");
            setSubmittedOrderIds(prev => new Set(prev).add(feedbackData.order_id!));
            setOpenFeedbackFormOrderId(null);

        } catch (err: any) {
            console.error("Failed to submit feedback:", err);
            let errorMessage = "Failed to submit feedback.";
             if (err.response?.status === 409) {
                 errorMessage = err.response.data?.detail || "You have already submitted feedback for this order.";
                 setSubmittedOrderIds(prev => new Set(prev).add(feedbackData.order_id!));
                 setOpenFeedbackFormOrderId(null);
             } else if (err.response?.data?.detail) {
                  if (typeof err.response.data.detail === 'string') {
                     errorMessage = err.response.data.detail;
                  } else if (Array.isArray(err.response.data.detail)) {
                     errorMessage = err.response.data.detail.map((d: any) => `${d.loc?.join('.') || 'error'}: ${d.msg}`).join('; ');
                  }
             } else if (err.message) {
                 errorMessage = err.message;
             }
            setFeedbackError(errorMessage);
        } finally {
            setFeedbackLoading(false);
        }
    };


    // --- Render logic ---
    const renderContent = () => {
        if (loading) return <p>Loading orders...</p>;
        if (error) return <p className={styles.errorText}>Error: {error}</p>;
        if (!orders) return <p>Could not load orders.</p>;
        if (orders.length === 0) return <p>You have no past orders.</p>;

        return (
            <div className={styles.orderList}>
                {orders.map((order) => {
                    // --- *** START DEBUG LOGGING *** ---
                    console.log(`[Order #${order.order_id}] Checking Feedback Button Conditions:
                      - Order ID: ${order.order_id}
                      - Is Feedback Submitted (in submittedOrderIds Set)?: ${submittedOrderIds.has(order.order_id)}
                      - Order Bookings (exists & length > 0)?: ${!!(order.bookings && order.bookings.length > 0)}
                      - Order Bookings Content:`, order.bookings); // Log the bookings array
                    console.log(`
                      - Order Session (exists & not null)?: ${!!order.session}
                      - Order Session Content:`, order.session); // Log the session object
                    // Calculate the specific part of the condition we care about
                    const canLeaveFeedbackForItem = !!((order.bookings && order.bookings.length > 0) || order.session);
                    console.log(`
                      - Can Leave Feedback based on items (bookings || session)?: ${canLeaveFeedbackForItem}
                      - FINAL Show Button Condition (!submitted && canLeaveFeedbackForItem)?: ${!submittedOrderIds.has(order.order_id) && canLeaveFeedbackForItem}`);
                    // --- *** END DEBUG LOGGING *** ---

                    // Return the JSX for the complete order card
                    return (
                        <div key={order.order_id} className={styles.orderCard}>
                            {/* Order Details Header */}
                            <div className={styles.orderHeader}>
                                <div>
                                    <h2 className={styles.orderId}>Order #{order.order_id ?? 'N/A'}</h2>
                                    <p className={styles.orderDate}>Date: {formatDate_order(order.order_date)}</p>
                                    <p className={styles.orderTotal}>Total Amount: {formatVND(order.total_amount)}</p>
                                </div>
                                {/* Feedback Button / Submitted Message */}
                                {!submittedOrderIds.has(order.order_id) &&
                                ((order.bookings && order.bookings.length > 0) || order.session) && (
                                    <button
                                        onClick={() => openFeedbackFormOrderId === order.order_id ? handleCloseFeedbackForm() : handleOpenFeedbackForm(order.order_id)}
                                        className={styles.feedbackButton}
                                        disabled={openFeedbackFormOrderId !== null && openFeedbackFormOrderId !== order.order_id}
                                    >
                                        {openFeedbackFormOrderId === order.order_id ? 'Cancel Feedback' : 'Leave Feedback'}
                                    </button>
                                )}
                                {submittedOrderIds.has(order.order_id) && (
                                    <p className={styles.feedbackSubmitted}>Feedback Submitted</p>
                                )}
                            </div>

                            {/* Collapsible Feedback Form */}
                            {openFeedbackFormOrderId === order.order_id && (
                                <div className={styles.feedbackFormContainer}>
                                    <h3>Feedback for Order #{order.order_id}</h3>
                                    {feedbackError && <p className={styles.errorText}>{feedbackError}</p>}
                                    {feedbackSuccess && <p className={styles.successText}>{feedbackSuccess}</p>}

                                    {/* Target Selection Dropdown */}
                                    <div className={styles.formGroup}>
                                        <label htmlFor={`feedbackTargetValue_${order.order_id}`}>Feedback for:</label>
                                        <select
                                            id={`feedbackTargetValue_${order.order_id}`}
                                            name="feedbackTargetValue"
                                            value={feedbackData.feedbackTargetValue}
                                            onChange={handleFeedbackInputChange}
                                            required
                                            className={styles.feedbackSelect} // Add specific class if needed
                                        >
                                            <option value="" disabled>-- Select an Item to Review --</option>
                                            {/* Court Bookings Options */}
                                            {order.bookings?.map(booking => (
                                                <option key={`court_${booking.BookingID}`} value={`court_${booking.Court_ID}`}>
                                                    Court {booking.Court_ID} ({booking.CourtType}) - {formatDate(booking.StartTime)}
                                                </option>
                                            ))}
                                            {/* Session Booking Option (if exists) */}
                                            {order.session && (
                                                <option key={`session_${order.session.SessionID}`} value={`session_${order.session.SessionID}`}>
                                                    Session: {order.session.Type} - Starts {formatSessionDate(order.session.StartDate)}
                                                </option>
                                            )}
                                        </select>
                                    </div>

                                    {/* Feedback Title Input */}
                                    <div className={styles.formGroup}>
                                        <label htmlFor={`title_${order.order_id}`}>Title:</label>
                                        <input
                                            type="text"
                                            id={`title_${order.order_id}`}
                                            name="title"
                                            value={feedbackData.title}
                                            onChange={handleFeedbackInputChange}
                                            required
                                            maxLength={255}
                                            className={styles.feedbackInput} // Add specific class if needed
                                        />
                                    </div>

                                    {/* Feedback Content Textarea */}
                                    <div className={styles.formGroup}>
                                        <label htmlFor={`content_${order.order_id}`}>Content:</label>
                                        <textarea
                                            id={`content_${order.order_id}`}
                                            name="content"
                                            value={feedbackData.content}
                                            onChange={handleFeedbackInputChange}
                                            required
                                            rows={4}
                                            className={styles.feedbackTextarea} // Add specific class if needed
                                        />
                                    </div>

                                    {/* Feedback Rating Select */}
                                    <div className={styles.formGroup}>
                                        <label htmlFor={`rate_${order.order_id}`}>Rating (1-5):</label>
                                        <select
                                            id={`rate_${order.order_id}`}
                                            name="rate"
                                            value={feedbackData.rate}
                                            onChange={handleFeedbackInputChange}
                                            required
                                            className={styles.feedbackSelect} // Add specific class if needed
                                        >
                                            <option value={5}>5 - Excellent</option>
                                            <option value={4}>4 - Good</option>
                                            <option value={3}>3 - Average</option>
                                            <option value={2}>2 - Fair</option>
                                            <option value={1}>1 - Poor</option>
                                        </select>
                                    </div>

                                    {/* Submit/Cancel Buttons */}
                                    <div className={styles.feedbackButtonContainer}>
                                        <button onClick={handleFeedbackSubmit} disabled={feedbackLoading} className={styles.submitFeedbackButton}>
                                            {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                                        </button>
                                        <button onClick={handleCloseFeedbackForm} disabled={feedbackLoading} className={styles.cancelFeedbackButton} type="button">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}


                            {/* Court Bookings Section */}
                            {order.bookings && order.bookings.length > 0 && (
                                <div className={styles.orderSection}>
                                    <h3 className={styles.sectionTitle}>Court Bookings</h3>
                                    {order.bookings.map((booking) => (
                                        <div key={`booking_detail_${booking?.BookingID ?? Math.random()}`} className={styles.orderItem}>
                                            <p>Court {booking.Court_ID ?? 'N/A'} ({booking.CourtType ?? 'Unknown Type'})</p>
                                            <p>Time: {formatDate(booking.StartTime)} - {formatDate(booking.Endtime)}</p>
                                            <p>Status: {booking.Status ?? 'N/A'}</p>
                                            <p>Price: {formatVND(booking.TotalPrice)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Training Session Section */}
                            {order.session && (
                                <div className={styles.orderSection}>
                                    <h3 className={styles.sectionTitle}>Training Session</h3>
                                    <div className={styles.orderItem}>
                                        <p>Type: {order.session.Type ?? 'N/A'}</p>
                                        <p>Starts: {formatSessionDate(order.session.StartDate)}</p>
                                        {order.session.EndDate && <p>Ends: {formatSessionDate(order.session.EndDate)}</p>}
                                        {order.session.Price !== undefined && <p>Price: {formatVND(order.session.Price)}</p>}
                                        {/* Optionally display Session ID for debugging */}
                                        {/* <p>Session ID: {order.session.SessionID}</p> */}
                                    </div>
                                </div>
                            )}

                            {/* Equipment Rentals Section */}
                            {order.equipment_rentals && order.equipment_rentals.length > 0 && (
                                <div className={styles.orderSection}>
                                    <h3 className={styles.sectionTitle}>Equipment Rentals</h3>
                                    {order.equipment_rentals.map((equip) => (
                                        <div key={`equip_detail_${equip?.EquipmentID ?? Math.random()}`} className={styles.orderItem}>
                                            <p>{equip.Name ?? 'N/A'} ({equip.EquipmentType ?? 'N/A'}) {equip.Brand ? `- ${equip.Brand}` : ''}</p>
                                            <p>Price: {formatVND(equip.Price)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Food & Drink Orders Section */}
                            {order.food_items && order.food_items.length > 0 && (
                                <div className={styles.orderSection}>
                                    <h3 className={styles.sectionTitle}>Food & Drink Orders</h3>
                                    {order.food_items.map((food) => (
                                        <div key={`food_detail_${food?.FoodID ?? Math.random()}`} className={styles.orderItem}>
                                            <p>{food.Name ?? 'N/A'} ({food.FoodCategory ?? 'N/A'})</p>
                                            <p>Price: {formatVND(food.Price)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div> // End orderCard div
                    ); // End return for map callback
                })} {/* End orders.map */}
            </div>
        );
    };

    return (
        <ProtectedRoute>
            <div className={styles.orderPageContainer}>
                <h1 className={styles.pageTitle}>My Order History</h1>
                {renderContent()}
            </div>
        </ProtectedRoute>
    );
};

export default OrderHistoryPage;