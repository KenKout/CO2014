"use client";

import React, { useState, useEffect } from "react";
import styles from "@/styles/Admin.module.css";

interface Staff {
	staff_id: number;
	name: string;
	salary: number;
	hired_date: string; // Use ISO date strings for consistency
	user_id: number;
}

// --- Mock Data ---
const mockStaffData: Staff[] = [
	{
		staff_id: 101,
		name: "Alice Wonder",
		salary: 5000000,
		hired_date: "2023-01-15T00:00:00Z",
		user_id: 1,
	},
	{
		staff_id: 102,
		name: "Bob The Builder",
		salary: 5500000,
		hired_date: "2022-11-01T00:00:00Z",
		user_id: 2,
	},
	{
		staff_id: 103,
		name: "Charlie Chaplin",
		salary: 4800000,
		hired_date: "2023-05-20T00:00:00Z",
		user_id: 3,
	},
];
// --- End Mock Data ---

const StaffList: React.FC = () => {
	const [staff, setStaff] = useState<Staff[]>([]);
	const [loading, setLoading] = useState(true);
	// Error state might not be needed for demo unless you want to simulate an error
	// const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);
		// --- Simulate API Call ---
		const fetchStaff = async () => {
			console.log("Simulating: Fetching staff data...");
			// TODO: Replace this setTimeout with the actual API call
			// Example:
			// try {
			//     const response = await fetch('/api/v2/admin/staff');
			//     if (!response.ok) throw new Error('Failed to fetch staff');
			//     const data = await response.json();
			//     setStaff(data);
			// } catch (err) {
			//     setError('Failed to load staff data');
			//     console.error(err);
			// } finally {
			//     setLoading(false);
			// }

			// Simulate network delay
			setTimeout(() => {
				setStaff(mockStaffData);
				setLoading(false);
				console.log("Simulating: Staff data loaded.");
			}, 1000); // Simulate 1 second delay
		};
		// --- End Simulate API Call ---

		fetchStaff();
	}, []);

	// Optional: Function to handle editing (for demo purposes)
	const handleEdit = (staffId: number) => {
		console.log(`Simulating: Edit button clicked for staff ID: ${staffId}`);
		alert(`Demo: Edit staff member ${staffId}`);
		// TODO: Implement actual edit logic (e.g., open modal, navigate to edit page)
		// This might involve another API call to fetch full details or update data.
	};

	if (loading)
		return (
			<div className={styles.loadingIndicator}>Loading staff data...</div>
		);
	// if (error) return <div className={styles.error}>{error}</div>; // Uncomment if using error state

	return (
		<div className={styles.listContainer}>
			<h2>Staff Management</h2>
			{/* TODO: Add a button here for "Add New Staff" if needed */}
			<table className={styles.dataTable}>
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Salary</th>
						<th>Hired Date</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{staff.map((member) => (
						<tr key={member.staff_id}>
							<td>{member.staff_id}</td>
							<td>{member.name}</td>
							<td>{member.salary.toLocaleString()} VND</td>
							{/* Ensure date formatting is robust */}
							<td>
								{new Date(
									member.hired_date
								).toLocaleDateString()}
							</td>
							<td>
								<button
									className={styles.actionButton}
									onClick={() => handleEdit(member.staff_id)}
								>
									Edit
								</button>
								{/* TODO: Add Delete button/logic here if needed */}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{staff.length === 0 && !loading && (
				<div>No staff members found.</div>
			)}{" "}
			{/* Show if empty */}
		</div>
	);
};

export default StaffList;
