// app/booking/page.tsx
"use client";

import { useState } from 'react';
import Information from './components/Information';
import BookingForm from './components/BookingForm';
import Courts from './components/Courts';
import Equipments, { EquipmentItem } from './components/Equipments';
import FoodAndDrink, { FoodDrinkItem } from './components/FoodAndDrink';
import Total from './components/Total';
import styles from './Booking.module.css';

const Booking = () => {
  const [bookingData, setBookingData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    duration: 0,
    selectedCourt: null
  });
  
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]);
  const [foodDrinkItems, setFoodDrinkItems] = useState<FoodDrinkItem[]>([]);

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

  const handleEquipmentChange = (items: EquipmentItem[]) => {
    setEquipmentItems(items);
  };

  const handleFoodDrinkChange = (items: FoodDrinkItem[]) => {
    setFoodDrinkItems(items);
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
        
        <Equipments 
          onEquipmentChange={handleEquipmentChange} 
        />
        
        <FoodAndDrink 
          onFoodDrinkChange={handleFoodDrinkChange} 
        />
        
        <Total 
          bookingData={bookingData}
          equipmentItems={equipmentItems}
          foodDrinkItems={foodDrinkItems}
        />
      </div>
    </div>
  );
};

export default Booking;