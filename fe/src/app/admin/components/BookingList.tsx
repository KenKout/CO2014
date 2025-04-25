'use client';

import React, { useState, useEffect } from 'react';
import styles from '../Admin.module.css';

interface Booking {
    booking_id: number;
    customer_id: number; // Keep for potential future use, even if not displayed
    court_id: number;
    start_time: string; // Use ISO date strings
    end_time: string;   // Use ISO date strings
    status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'; // Use specific types
    total_price: number;
}

// --- Mock Data ---
const mockBookingData: Booking[] = [
    { booking_id: 1, customer_id: 501, court_id: 1, start_time: '2024-08-15T09:00:00Z', end_time: '2024-08-15T10:00:00Z', status: 'Confirmed', total_price: 150000 },
    { booking_id: 2, customer_id: 502, court_id: 2, start_time: '2024-08-15T11:00:00Z', end_time: '2024-08-15T12:00:00Z', status: 'Pending', total_price: 150000 },
    { booking_id: 3, customer_id: 503, court_id: 1, start_time: '2024-08-16T14:00:00Z', end_time: '2024-08-16T16:00:00Z', status: 'Completed', total_price: 300000 },
    { booking_id: 4, customer_id: 501, court_id: 3, start_time: '2024-08-17T10:00:00Z', end_time: '2024-08-17T11:00:00Z', status: 'Cancelled', total_price: 180000 },
];
// --- End Mock Data ---


const BookingList: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    // const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        // --- Simulate API Call ---
        const fetchBookings = async () => {
             console.log('Simulating: Fetching booking data...');
            // TODO: Replace this setTimeout with the actual API call
            // Example:
            // try {
            //     const response = await fetch('/api/v2/admin/bookings');
            //     if (!response.ok) throw new Error('Failed to fetch bookings');
            //     const data = await response.json();
            //     setBookings(data);
            // } catch (err) {
            //     setError('Failed to load booking data');
            //     console.error(err);
            // } finally {
            //     setLoading(false);
            // }
            // Simulate network delay
            setTimeout(() => {
                setBookings(mockBookingData);
                setLoading(false);
                console.log('Simulating: Booking data loaded.');
            }, 1200); // Simulate 1.2 second delay
        };
        // --- End Simulate API Call ---

        fetchBookings();
    }, []);

    const handleStatusUpdate = async (bookingId: number, newStatus: Booking['status']) => {
        console.log(`Simulating: Update status for booking ID ${bookingId} to ${newStatus}`);

        // --- Simulate API Call for Update ---
        // TODO: Replace this with the actual API call to update status
        // Example:
        // try {
        //     const response = await fetch(`/api/v2/admin/bookings/${bookingId}/status`, {
        //         method: 'PUT',
        //         headers: { 'Content-Type': 'application/json' },
        //         body: JSON.stringify({ status: newStatus }),
        //     });
        //     if (!response.ok) throw new Error('Failed to update status');
        //     // If API confirms, update local state:
        //     setBookings(prevBookings => 
        //         prevBookings.map(booking => 
        //             booking.booking_id === bookingId 
        //                 ? { ...booking, status: newStatus }
        //                 : booking
        //         )
        //     );
        // } catch (err) {
        //     console.error('Error updating booking status:', err);
        //     alert('Failed to update status. Please try again.'); // Inform user
        // }
        // --- End Simulate API Call ---

        // For demo purposes, update the state directly after a short delay
        setTimeout(() => {
            setBookings(prevBookings =>
                prevBookings.map(booking =>
                    booking.booking_id === bookingId
                        ? { ...booking, status: newStatus }
                        : booking
                )
            );
            console.log(`Simulating: Local state updated for booking ${bookingId}`);
        }, 300); // Short delay to mimic network time
    };

    if (loading) return <div className={styles.loadingIndicator}>Loading booking data...</div>;
    // if (error) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.listContainer}>
            <h2>Bookings</h2>
            <table className={styles.dataTable}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Court</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th>Status</th>
                        <th>Price</th>
                        <th>Actions</th> {/* Changed header */}
                    </tr>
                </thead>
                <tbody>
                    {bookings.map(booking => (
                        <tr key={booking.booking_id}>
                            <td>{booking.booking_id}</td>
                            <td>Court {booking.court_id}</td>
                            {/* Use more robust date formatting */}
                            <td>{new Date(booking.start_time).toLocaleString()}</td>
                            <td>{new Date(booking.end_time).toLocaleString()}</td>
                            <td>
                                <span className={`${styles.statusBadge} ${styles[`status${booking.status}`]}`}>
                                    {booking.status}
                                </span>
                            </td>
                            <td>{booking.total_price.toLocaleString()} VND</td>
                            <td>
                                <select 
                                    value={booking.status}
                                    onChange={(e) => handleStatusUpdate(booking.booking_id, e.target.value as Booking['status'])}
                                    className={styles.statusSelect}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                                {/* TODO: Add View Details button/logic if needed */}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {bookings.length === 0 && !loading && <div>No bookings found.</div>} {/* Show if empty */}
        </div>
    );
};

export default BookingList;