// src/app/admin/page.tsx
'use client';

import React, { useState } from 'react';
import StaffList from './components/StaffList';
import CoachList from './components/CoachList';
import BookingList from './components/BookingList';
import UserList from './components/UserList';
import TrainingSessionList from './components/TrainingSessionList';
import FoodList from './components/FoodList';
import EquipmentList from './components/EquipmentList';
import EnrollmentList from './components/EnrollmentList';
import FeedbackList from './components/FeedbackList';
import styles from '@/styles/Admin.module.css';

type DashboardTab = 'users' | 'staff' | 'coaches' | 'training-sessions' | 'bookings' | 'food' | 'equipment' | 'enrollments' | 'feedback';

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<DashboardTab>('users');

    return (
        <div className={styles.dashboardContainer}>
            <h1 className={styles.dashboardTitle}>Admin Dashboard</h1>
            
            <nav className={styles.tabNav}>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'users' ? styles.active : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    Users
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'staff' ? styles.active : ''}`}
                    onClick={() => setActiveTab('staff')}
                >
                    Staff
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'coaches' ? styles.active : ''}`}
                    onClick={() => setActiveTab('coaches')}
                >
                    Coaches
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'training-sessions' ? styles.active : ''}`}
                    onClick={() => setActiveTab('training-sessions')}
                >
                    Training Sessions
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'bookings' ? styles.active : ''}`}
                    onClick={() => setActiveTab('bookings')}
                >
                    Bookings
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'food' ? styles.active : ''}`}
                    onClick={() => setActiveTab('food')}
                >
                    Cafeteria Food
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'equipment' ? styles.active : ''}`}
                    onClick={() => setActiveTab('equipment')}
                >
                    Equipment
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'enrollments' ? styles.active : ''}`}
                    onClick={() => setActiveTab('enrollments')}
                >
                    Enrollments
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'feedback' ? styles.active : ''}`}
                    onClick={() => setActiveTab('feedback')}
                >
                    Feedback
                </button>
            </nav>

            <main className={styles.content}>
                {activeTab === 'users' && <UserList />}
                {activeTab === 'staff' && <StaffList />}
                {activeTab === 'coaches' && <CoachList />}
                {activeTab === 'training-sessions' && <TrainingSessionList />}
                {activeTab === 'bookings' && <BookingList />}
                {activeTab === 'food' && <FoodList />}
                {activeTab === 'equipment' && <EquipmentList />}
                {activeTab === 'enrollments' && <EnrollmentList />}
                {activeTab === 'feedback' && <FeedbackList />}
            </main>
        </div>
    );
};

export default AdminDashboard;