"use client";

import React, { useState, useEffect } from "react";
import styles from "@/styles/Admin.module.css";

interface Coach {
	coach_id: number;
	name: string;
	rating: number | null; // Allow null for N/A
	experience: string | null; // Allow null for N/A
}

// --- Mock Data ---
const mockCoachData: Coach[] = [
	{
		coach_id: 201,
		name: "Coach Carter",
		rating: 4.8,
		experience: "10+ Years",
	},
	{
		coach_id: 202,
		name: "Serena Williams",
		rating: 5.0,
		experience: "20+ Years Pro",
	},
	{
		coach_id: 203,
		name: "Roger Federer",
		rating: 4.9,
		experience: "20+ Years Pro",
	},
	{ coach_id: 204, name: "New Coach", rating: null, experience: "1 Year" },
];
// --- End Mock Data ---

const CoachList: React.FC = () => {
	const [coaches, setCoaches] = useState<Coach[]>([]);
	const [loading, setLoading] = useState(true);
	// const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);
		// --- Simulate API Call ---
		const fetchCoaches = async () => {
			console.log("Simulating: Fetching coach data...");
			// TODO: Replace this setTimeout with the actual API call
			// Example:
			// try {
			//     const response = await fetch('/api/v2/admin/coaches');
			//     if (!response.ok) throw new Error('Failed to fetch coaches');
			//     const data = await response.json();
			//     setCoaches(data);
			// } catch (err) {
			//     setError('Failed to load coach data');
			//     console.error(err);
			// } finally {
			//     setLoading(false);
			// }

			// Simulate network delay
			setTimeout(() => {
				setCoaches(mockCoachData);
				setLoading(false);
				console.log("Simulating: Coach data loaded.");
			}, 800); // Simulate 0.8 second delay
		};
		// --- End Simulate API Call ---

		fetchCoaches();
	}, []);

	// Optional: Functions to handle actions (for demo purposes)
	const handleSchedule = (coachId: number) => {
		console.log(
			`Simulating: Schedule button clicked for coach ID: ${coachId}`
		);
		alert(`Demo: View/Edit schedule for coach ${coachId}`);
		// TODO: Implement actual schedule logic (e.g., open calendar modal)
	};

	const handleEdit = (coachId: number) => {
		console.log(`Simulating: Edit button clicked for coach ID: ${coachId}`);
		alert(`Demo: Edit coach ${coachId}`);
		// TODO: Implement actual edit logic (e.g., open modal, navigate to edit page)
	};

	if (loading)
		return (
			<div className={styles.loadingIndicator}>Loading coach data...</div>
		);
	// if (error) return <div className={styles.error}>{error}</div>;

	return (
		<div className={styles.listContainer}>
			<h2>Coaches</h2>
			{/* TODO: Add a button here for "Add New Coach" if needed */}
			<table className={styles.dataTable}>
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Rating</th>
						<th>Experience</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{coaches.map((coach) => (
						<tr key={coach.coach_id}>
							<td>{coach.coach_id}</td>
							<td>{coach.name}</td>
							<td>{coach.rating?.toFixed(1) || "N/A"}</td>
							<td>{coach.experience || "N/A"}</td>
							<td>
								<button
									className={styles.actionButton}
									onClick={() =>
										handleSchedule(coach.coach_id)
									}
								>
									Schedule
								</button>
								<button
									className={styles.actionButton}
									onClick={() => handleEdit(coach.coach_id)}
								>
									Edit
								</button>
								{/* TODO: Add Delete button/logic here if needed */}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{coaches.length === 0 && !loading && <div>No coaches found.</div>}{" "}
			{/* Show if empty */}
		</div>
	);
};

export default CoachList;
