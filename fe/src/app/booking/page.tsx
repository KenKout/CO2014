// app/booking/page.tsx
"use client";

import { useState } from 'react';
import Information from './components/Information';
import BookingForm from './components/BookingForm';
import Courts from './components/Courts';
import styles from './Booking.module.css';

const Booking = () => {
  const [bookingData, setBookingData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    duration: 0,
    selectedCourt: null
  });

  const handleBookingChange = (data: any) => {
    setBookingData({
      ...bookingData,
      ...data
    });
  };

  const handleCourtSelect = (courtId: any) => {
    setBookingData({
      ...bookingData,
      selectedCourt: courtId
    });
  };

  return (
    <div className={styles.bookingPage}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Badminton Court Booking</h1>
        
        <Information />
        
        <BookingForm 
          bookingData={bookingData} 
          onBookingChange={handleBookingChange} 
        />
        
        <Courts 
          selectedCourt={bookingData.selectedCourt}
          onCourtSelect={handleCourtSelect}
        />
      </div>
    </div>
  );
};

export default Booking;