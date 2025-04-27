// In @/app/profile/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Add this import
import { useAuth } from '@/context/AuthContext';
import styles from '@/styles/Profile.module.css';

const ProfilePage = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter(); // Initialize the router hook
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated !== undefined) {
      setLoading(false);
    }
    
    // Redirect if not authenticated
    if (isAuthenticated === false) {
      router.push('/login');
    }
  }, [isAuthenticated, router]); // Add router to dependency array

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div className={styles.error}>Please log in to view your profile.</div>;
  }

  return (
    <div className={styles.profilePage}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Your Profile</h1>
        <div className={styles.profileDetails}>
          <div className={styles.profileHeader}>
            <h2>{user?.username || 'User Name'}</h2>
            <p>{user?.phone || 'Not provided'}</p>
          </div>
          <div className={styles.profileBody}>
            <div className={styles.profileSection}>
              <h3>Personal Information</h3>
              <p><strong>Username:</strong> {user?.username || 'Not provided'}</p>
              <p><strong>Phone:</strong> {user?.phone || 'Not provided'}</p>
              <p><strong>User Type:</strong> {user?.user_type || 'Not provided'}</p>
            </div>
            <div className={styles.profileSection}>
              <h3>Booking History</h3>
              <p>No recent bookings.</p>
              {/* Placeholder for booking history list */}
            </div>
            <div className={styles.profileSection}>
              <h3>Account Settings</h3>
              <button className={styles.editButton}>Edit Profile</button>
              <button className={styles.logoutButton}>Logout</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// For the ProtectedRoute approach, make sure to import useRouter there as well
export default ProfilePage;