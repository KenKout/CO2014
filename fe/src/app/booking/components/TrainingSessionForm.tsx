// app/booking/components/TrainingSessionForm.tsx
"use client";

import styles from "@/styles/Booking.module.css";

// Define the structure for a Training Session
export interface TrainingSession {
	id: string;
	name: string;
	level: "Beginner" | "Intermediate" | "Advanced";
	description: string;
	coach: string;
	courtAssigned: number;
	schedule: string; // e.g., "Tuesdays, 7 PM - 8 PM (4 weeks)"
	price: number; // Price in VND for the whole course/session pack
}

interface TrainingSessionFormProps {
	selectedSession: TrainingSession | null;
	onSessionSelect: (session: TrainingSession | null) => void;
}

// Sample Data (3 sessions with different levels)
const availableSessions: TrainingSession[] = [
	{
		id: "ts001",
		name: "Beginner Fundamentals",
		level: "Beginner",
		description:
			"Master the basics: grip, footwork, serve, and clear shots. Perfect for new players.",
		coach: "Ken Nguyen",
		courtAssigned: 5, // Assign a standard court
		schedule: "Mondays & Wednesdays, 6 PM - 7 PM (4 Weeks)",
		price: 1200000, // e.g., 1,200,000 VND
	},
	{
		id: "ts002",
		name: "Intermediate Drills & Tactics",
		level: "Intermediate",
		description:
			"Refine your strokes, improve net play, drops, and smashes. Learn basic game strategies.",
		coach: "Nguyen Ken",
		courtAssigned: 3, // Assign a standard court
		schedule: "Tuesdays & Thursdays, 7:30 PM - 8:30 PM (4 Weeks)",
		price: 1600000, // e.g., 1,600,000 VND
	},
	{
		id: "ts003",
		name: "Advanced Sparring & Strategy",
		level: "Advanced",
		description:
			"High-intensity drills, competitive match play, advanced footwork, and tactical analysis.",
		coach: "Dien Nguyen",
		courtAssigned: 1, // Assign a premium court
		schedule: "Saturdays, 9 AM - 11 AM (Single Session Drop-in)",
		price: 350000, // e.g., 350,000 VND per session
	},
];

const TrainingSessionForm = ({
	selectedSession,
	onSessionSelect,
}: TrainingSessionFormProps) => {
	return (
		<section className={styles.trainingSection}>
			<h2 className={styles.sectionTitle}>Available Training Sessions</h2>

			{availableSessions.length > 0 ? (
				<div className={styles.trainingGrid}>
					{availableSessions.map((session) => (
						<div
							key={session.id}
							className={`${styles.trainingCard} ${
								selectedSession?.id === session.id
									? styles.selected
									: ""
							}`}
							onClick={() => onSessionSelect(session)}
							role="button" // Improve accessibility
							tabIndex={0} // Make it focusable
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ")
									onSessionSelect(session);
							}} // Keyboard activation
						>
							<div className={styles.trainingInfo}>
								<h3>
									{session.name}{" "}
									<span className={styles.levelBadge}>
										{session.level}
									</span>
								</h3>
								<p>
									<strong>Coach:</strong> {session.coach}
								</p>
								<p>
									<strong>Schedule:</strong>{" "}
									{session.schedule}
								</p>
								<p>
									<strong>Assigned Court:</strong>{" "}
									{session.courtAssigned}
								</p>
								<p className={styles.trainingDescription}>
									{session.description}
								</p>
								<p className={styles.trainingPrice}>
									{session.price.toLocaleString("vi-VN")} VND
								</p>
							</div>
							<div className={styles.selectButton}>
								{selectedSession?.id === session.id
									? "Selected"
									: "Select Session"}
							</div>
						</div>
					))}
				</div>
			) : (
				<p className={styles.noSessions}>
					No training sessions currently available.
				</p>
			)}
		</section>
	);
};

export default TrainingSessionForm;
