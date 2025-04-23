'use client';

import React, { useState } from 'react';
import StaffList from './components/StaffList';
import CoachList from './components/CoachList';
import BookingList from './components/BookingList';
import styles from './Admin.module.css';

type DashboardTab = 'staff' | 'coaches' | 'bookings';

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<DashboardTab>('staff');

    return (
        <div className={styles.dashboardContainer}>
            <nav className={styles.tabNav}>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'staff' ? styles.active : ''}`}
                    onClick={() => setActiveTab('staff')}
                >
                    Staff Management
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'coaches' ? styles.active : ''}`}
                    onClick={() => setActiveTab('coaches')}
                >
                    Coaches
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'bookings' ? styles.active : ''}`}
                    onClick={() => setActiveTab('bookings')}
                >
                    Bookings
                </button>
            </nav>

            <main className={styles.content}>
                {activeTab === 'staff' && <StaffList />}
                {activeTab === 'coaches' && <CoachList />}
                {activeTab === 'bookings' && <BookingList />}
            </main>
        </div>
    );
};

export default AdminDashboard;