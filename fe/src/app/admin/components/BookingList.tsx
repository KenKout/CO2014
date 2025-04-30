// src/app/admin/components/BookingList.tsx
"use client";

import React, { useState, useEffect } from "react";
import { createApiClient } from "@/utils/api";
import styles from "@/styles/Admin.module.css"; // Assuming this CSS module exists
import { useAuth } from "@/context/AuthContext";

// Interface matching the backend Pydantic model (PascalCase)
// and backend Status enum values
interface Booking {
	BookingID: number; // Changed to PascalCase
	CustomerID: number; // Changed to PascalCase
	CourtID: number; // Changed to PascalCase
	StartTime: string; // Changed to PascalCase (assuming string from JSON)
	Endtime: string; // Changed to PascalCase (assuming string from JSON)
	Status: "Pending" | "Success" | "Cancel"; // Changed to backend enum values
	TotalPrice: number; // Changed to PascalCase
	CustomerName?: string; // Optional field, Changed to PascalCase
	// CourtInfo is not strictly needed based on FE code, but keep if API sends it
	CourtInfo?: string; // Optional field, Changed to PascalCase
}

// Define the statuses the backend *accepts* for updates
type BackendBookingStatus = "Pending" | "Success" | "Cancel";

// Define the statuses we want to *show* in the UI dropdown
type FrontendBookingStatus =
	| "Pending"
	| "Confirmed"
	| "Completed"
	| "Cancelled";

const BookingList: React.FC = () => {
	const [bookings, setBookings] = useState<Booking[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const { token } = useAuth();
	const api = createApiClient(token);

	useEffect(() => {
		fetchBookings();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Dependency array is empty, fetchBookings uses token from context closure

	const fetchBookings = async () => {
		setLoading(true);
		try {
			// API endpoint is correct
			const response = await api.get("/admin/bookings/");
			// Assuming response.data is an array of objects with PascalCase keys
			setBookings(response.data);
			setError(null);
		} catch (err) {
			console.error("Error fetching bookings:", err);
			setError("Failed to load booking data. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	// Helper function to map Frontend Status choice to Backend Status for API call
	const mapFrontendStatusToBackend = (
		frontendStatus: FrontendBookingStatus
	): BackendBookingStatus => {
		switch (frontendStatus) {
			case "Pending":
				return "Pending";
			case "Confirmed": // Map frontend "Confirmed" to backend "Success"
				return "Success";
			case "Completed": // Map frontend "Completed" to backend "Success"
				return "Success";
			case "Cancelled": // Map frontend "Cancelled" to backend "Cancel"
				return "Cancel";
			default:
				// Fallback or error handling if needed, though TS should prevent this
				return "Pending";
		}
	};

	// Helper function to map Backend Status to a display string for the UI
	const mapBackendStatusToDisplay = (
		backendStatus: BackendBookingStatus
	): string => {
		switch (backendStatus) {
			case "Pending":
				return "Pending";
			case "Success":
				return "Completed"; // Display "Success" as "Completed"
			case "Cancel":
				return "Cancelled"; // Display "Cancel" as "Cancelled"
			default:
				return backendStatus;
		}
	};

	// Helper function to map Backend Status to CSS class suffix
	// Assumes CSS classes like statusPending, statusCompleted, statusCancelled exist
	const mapBackendStatusToCssSuffix = (
		backendStatus: BackendBookingStatus
	): string => {
		switch (backendStatus) {
			case "Pending":
				return "Pending";
			case "Success":
				return "Completed"; // Use 'Completed' class for 'Success' status
			case "Cancel":
				return "Cancelled"; // Use 'Cancelled' class for 'Cancel' status
			default:
				return "";
		}
	};

	const handleStatusUpdate = async (
		bookingId: number,
		newFrontendStatus: FrontendBookingStatus // User selected one of these
	) => {
		const newBackendStatus = mapFrontendStatusToBackend(newFrontendStatus); // Map to backend value

		try {
			// Use PascalCase 'status' in the request body if the backend expects it
			// Based on the backend code provided (BookingStatusUpdateRequest), it expects lowercase 'status'.
			await api.put(`/admin/bookings/${bookingId}/status`, {
				status: newBackendStatus, // Send the mapped backend status value
			});

			// Update local state: Fetch the updated booking or manually update
			// Manual update: use the *backend* status we expect the API to have set
			setBookings((prevBookings) =>
				prevBookings.map((booking) =>
					booking.BookingID === bookingId // Use PascalCase for comparison
						? { ...booking, Status: newBackendStatus } // Update Status with backend value
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
			// Data in response.data will have PascalCase keys
			alert(
				`Booking details for ID ${bookingId} retrieved successfully. Check console.`
			);
			console.log("Raw Booking Details:", response.data);
			// If displaying in a modal, access properties like response.data.BookingID, response.data.StartTime etc.
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
			<div className={styles.listHeader}>
			    <h2>Bookings</h2>
			</div>
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
						<tr key={booking.BookingID}>
							<td>{booking.BookingID}</td>
							<td>
								{booking.CustomerName ||
									`Customer #${booking.CustomerID}`}
							</td>
							<td>Court {booking.CourtID}</td>
							<td>
								{new Date(booking.StartTime).toLocaleString()}
							</td>
							<td>
								{new Date(booking.Endtime).toLocaleString()}
							</td>
							<td>
								<span
									className={`${styles.statusBadge} ${
										styles[
											`status${mapBackendStatusToCssSuffix(
												booking.Status
											)}`
										]
									}`}
								>
									{mapBackendStatusToDisplay(booking.Status)}
								</span>
							</td>
							<td>{booking.TotalPrice?.toLocaleString()}k VND</td>
							<td>
								<select
									value={mapBackendStatusToDisplay(
										booking.Status
									)} // Show corresponding frontend status as selected
									onChange={(e) =>
										handleStatusUpdate(
											booking.BookingID, // Use PascalCase
											e.target
												.value as FrontendBookingStatus // Read the selected frontend status
										)
									}
									className={styles.statusSelect}
								>
									<option value="Pending">Pending</option>
									<option value="Confirmed">
										Confirm
									</option>{" "}
									<option value="Completed">Complete</option>{" "}
									<option value="Cancelled">Cancel</option>{" "}
								</select>

								<button
									className={styles.actionButton}
									onClick={
										() =>
											getBookingDetails(booking.BookingID) // Use PascalCase
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
