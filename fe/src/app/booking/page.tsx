// app/booking/page.tsx
"use client";

import { useState } from 'react';
import Information from './components/Information';
import BookingForm from './components/BookingForm';
import Courts from './components/Courts';
import Equipments, { EquipmentItem } from './components/Equipments'; // Keep imports
import FoodAndDrink, { FoodDrinkItem } from './components/FoodAndDrink'; // Keep imports
import Total from './components/Total';
import TrainingSessionForm, { TrainingSession } from './components/TrainingSessionForm';
import styles from '../../styles/Booking.module.css';

type BookingMode = 'court' | 'training';

const Booking = () => {
  const [mode, setMode] = useState<BookingMode>('court');
  const [bookingData, setBookingData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    duration: 0,
    selectedCourt: null as number | null
  });
  const [selectedTrainingSession, setSelectedTrainingSession] = useState<TrainingSession | null>(null);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]); // Keep state
  const [foodDrinkItems, setFoodDrinkItems] = useState<FoodDrinkItem[]>([]); // Keep state

  const handleBookingChange = (data: Partial<typeof bookingData>) => {
    setBookingData(prev => ({ ...prev, ...data }));
  };

  const handleCourtSelect = (courtId: number) => {
    setBookingData(prev => ({ ...prev, selectedCourt: courtId }));
  };

  const handleSessionSelect = (session: TrainingSession | null) => {
    setSelectedTrainingSession(session);
  };

  // Keep handlers, they won't be called if components aren't rendered
  const handleEquipmentChange = (items: EquipmentItem[]) => {
    setEquipmentItems(items);
  };

  const handleFoodDrinkChange = (items: FoodDrinkItem[]) => {
    setFoodDrinkItems(items);
  };

  const switchMode = (newMode: BookingMode) => {
    if (mode !== newMode) {
        setMode(newMode);
        if (newMode === 'court') {
            setSelectedTrainingSession(null);
            // Reset addons if you want a clean slate when switching back to court mode
            // setEquipmentItems([]);
            // setFoodDrinkItems([]);
        } else {
            setBookingData(prev => ({
                ...prev,
                date: '', startTime: '', endTime: '', duration: 0, selectedCourt: null
            }));
            // --- IMPORTANT: Reset addons when switching TO training mode ---
            setEquipmentItems([]);
            setFoodDrinkItems([]);
            // --- End modification ---
        }
    }
  };

  return (
    <div className={styles.bookingPage}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Book Your Badminton Experience</h1>

        <Information />

        {/* Mode Selector */}
        <div className={styles.modeSelector}>
            {/* ... mode buttons ... */}
            <button
                className={`${styles.modeButton} ${mode === 'court' ? styles.active : ''}`}
                onClick={() => switchMode('court')}
            >
                Book a Court
            </button>
            <button
                className={`${styles.modeButton} ${mode === 'training' ? styles.active : ''}`}
                onClick={() => switchMode('training')}
            >
                Book Training
            </button>
        </div>

        {/* Conditional Rendering for Court Booking Specific Components */}
        {mode === 'court' && (
            <>
                <BookingForm
                    bookingData={bookingData}
                    onBookingChange={handleBookingChange}
                    selectedCourt={bookingData.selectedCourt}
                />
                <Courts
                    selectedCourt={bookingData.selectedCourt}
                    onCourtSelect={handleCourtSelect}
                />
                {/* --- MODIFICATION START: Render Addons only in court mode --- */}
                <Equipments
                  onEquipmentChange={handleEquipmentChange}
                />
                <FoodAndDrink
                  onFoodDrinkChange={handleFoodDrinkChange}
                />
                {/* --- MODIFICATION END --- */}
            </>
        )}

        {/* Conditional Rendering for Training Booking Specific Components */}
        {mode === 'training' && (
           <TrainingSessionForm
                selectedSession={selectedTrainingSession}
                onSessionSelect={handleSessionSelect}
           />
           // Note: Equipment and Food/Drink are intentionally omitted here
        )}

        {/* Total component is always rendered, but calculations depend on mode */}
        <Total
          mode={mode}
          bookingData={bookingData}
          selectedTrainingSession={selectedTrainingSession}
          // Pass the potentially empty arrays for addons when in training mode
          equipmentItems={equipmentItems}
          foodDrinkItems={foodDrinkItems}
        />
      </div>
    </div>
  );
};

export default Booking;
