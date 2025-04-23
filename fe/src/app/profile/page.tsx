'use client'; // Needed for useState and useEffect

import React, { useState, useEffect } from 'react';
import styles from './Profile.module.css'; // We'll create this CSS module

// Define interfaces for our data structures (good practice with TypeScript)
interface User {
    id: string;
    username: string;
    email: string;
}

interface Booking {
    id: string;
    courtName: string;
    date: string; // Store dates as strings or Date objects
    time: string;
    status: 'Confirmed' | 'Pending' | 'Cancelled';
}

const ProfilePage: React.FC = () => {
    // State for user data, bookings, loading, and errors
    const [user, setUser] = useState<User | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Simulate fetching data when the component mounts
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // --- Simulate API call for User Data ---
                // In a real app, you'd fetch this from your backend/auth context
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
                const fetchedUser: User = {
                    id: 'user-123',
                    username: 'BadmintonFan_91',
                    email: 'fan@example.com',
                };
                setUser(fetchedUser);

                // --- Simulate API call for Bookings ---
                // In a real app, fetch based on the logged-in user's ID
                await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
                const fetchedBookings: Booking[] = [
                    { id: 'booking-001', courtName: 'Court A', date: '2023-10-27', time: '18:00', status: 'Confirmed' },
                    { id: 'booking-002', courtName: 'Court C', date: '2023-11-05', time: '10:00', status: 'Confirmed' },
                    { id: 'booking-003', courtName: 'Court A', date: '2023-11-12', time: '19:00', status: 'Pending' },
                ];
                // Simulate finding no bookings sometimes
                // const fetchedBookings: Booking[] = [];
                setBookings(fetchedBookings);

            } catch (err) {
                console.error("Failed to fetch profile data:", err);
                setError("Could not load profile information. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []); // Empty dependency array means this runs once on mount

    // --- Render Logic ---
    if (isLoading) {
        return <div className={styles.message}>Loading profile...</div>;
    }

    if (error) {
        return <div className={`${styles.message} ${styles.error}`}>{error}</div>;
    }

    if (!user) {
        // This case might happen if user fetch fails but bookings doesn't, or vice versa
         return <div className={`${styles.message} ${styles.error}`}>Could not load user data.</div>;
    }

    return (
        <div className={styles.profileContainer}>
            <h1>Welcome, {user.username}!</h1>
            <p>Email: {user.email}</p>

            <section className={styles.bookingsSection}>
                <h2>My Bookings</h2>
                {bookings.length > 0 ? (
                    <ul className={styles.bookingList}>
                        {bookings.map((booking) => (
                            <li key={booking.id} className={styles.bookingItem}>
                                <p><strong>Court:</strong> {booking.courtName}</p>
                                <p><strong>Date:</strong> {booking.date}</p>
                                <p><strong>Time:</strong> {booking.time}</p>
                                <p><strong>Status:</strong> <span className={styles[`status${booking.status}`]}>{booking.status}</span></p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>You have no bookings yet.</p>
                )}
            </section>
        </div>
    );
};

export default ProfilePage;
