// src/app/admin/components/BookingList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css";
import { useAuth } from '@/context/AuthContext';

interface Booking {
	booking_id: number;
	customer_id: number;
	court_id: number;
	start_time: string;
	end_time: string;
	status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
	total_price: number;
	customer_name?: string; // Optional field that might be included in the API response
}

const BookingList: React.FC = () => {
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Get token from your auth context or localStorage
	const { token } = useAuth();
	const api = createApiClient(token);

	useEffect(() => {
		fetchBookings();
	}, []);

	const fetchBookings = async () => {
		setLoading(true);
		try {
			const response = await api.get("/admin/bookings/");
			setBookings(response.data);
			setError(null);
		} catch (err) {
			console.error("Error fetching bookings:", err);
			setError("Failed to load booking data. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleStatusUpdate = async (
		bookingId: number,
		newStatus: Booking["status"]
	) => {
		try {
			await api.put(`/admin/bookings/${bookingId}/status`, {
				status: newStatus,
			});

			// Update local state
			setBookings((prevBookings) =>
				prevBookings.map((booking) =>
					booking.booking_id === bookingId
						? { ...booking, status: newStatus }
						: booking
				)
			);
		} catch (err) {
			console.error("Error updating booking status:", err);
			alert("Failed to update status. Please try again.");
		}
	};

	const getBookingDetails = async (bookingId: number) => {
		try {
			const response = await api.get(`/admin/bookings/${bookingId}`);
			alert(
				`Booking details for ID ${bookingId} retrieved successfully.`
			);
			console.log(response.data);
			// You could open a modal with the detailed information here
		} catch (err) {
			console.error("Error fetching booking details:", err);
			alert("Failed to get booking details. Please try again.");
		}
	};

	if (loading)
		return (
			<div className={styles.loadingIndicator}>
				Loading booking data...
			</div>
		);
	if (error) return <div className={styles.error}>{error}</div>;

	return (
		<div className={styles.listContainer}>
			<h2>Bookings</h2>
			<table className={styles.dataTable}>
				<thead>
					<tr>
						<th>ID</th>
						<th>Customer</th>
						<th>Court</th>
						<th>Start Time</th>
						<th>End Time</th>
						<th>Status</th>
						<th>Price</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{bookings.map((booking) => (
						<tr key={booking.booking_id}>
							<td>{booking.booking_id}</td>
							<td>
								{booking.customer_name ||
									`Customer #${booking.customer_id}`}
							</td>
							<td>Court {booking.court_id}</td>
							<td>
								{new Date(booking.start_time).toLocaleString()}
							</td>
							<td>
								{new Date(booking.end_time).toLocaleString()}
							</td>
							<td>
								<span
									className={`${styles.statusBadge} ${
										styles[`status${booking.status}`]
									}`}
								>
									{booking.status}
								</span>
							</td>
							<td>{booking.total_price.toLocaleString()} VND</td>
							<td>
								<select
									value={booking.status}
									onChange={(e) =>
										handleStatusUpdate(
											booking.booking_id,
											e.target.value as Booking["status"]
										)
									}
									className={styles.statusSelect}
								>
									<option value="Pending">Pending</option>
									<option value="Confirmed">Confirmed</option>
									<option value="Completed">Completed</option>
									<option value="Cancelled">Cancelled</option>
								</select>
								<button
									className={styles.actionButton}
									onClick={() =>
										getBookingDetails(booking.booking_id)
									}
								>
									Details
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{bookings.length === 0 && !loading && (
				<div className={styles.emptyMessage}>No bookings found.</div>
			)}
		</div>
	);
};

export default BookingList;
