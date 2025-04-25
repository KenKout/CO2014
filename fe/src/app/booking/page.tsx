"use client";

import { useState } from 'react';
import Information from './components/Information';
import BookingForm from './components/BookingForm';
import Courts from './components/Courts';
import Equipments, { EquipmentItem } from './components/Equipments'; 
import FoodAndDrink, { FoodDrinkItem } from './components/FoodAndDrink'; 
import Total from './components/Total';
import TrainingSessionForm, { TrainingSession } from './components/TrainingSessionForm';
import styles from '../../styles/Booking.module.css';

type BookingMode = 'court' | 'training';

export default function Page() {
  const [mode, setMode] = useState<BookingMode>('court');
  const [bookingData, setBookingData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    duration: 0,
    selectedCourt: null as number | null
  });
  const [selectedTrainingSession, setSelectedTrainingSession] = useState<TrainingSession | null>(null);
  const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]); 
  const [foodDrinkItems, setFoodDrinkItems] = useState<FoodDrinkItem[]>([]); 

  const handleBookingChange = (data: Partial<typeof bookingData>) => {
    setBookingData(prev => ({ ...prev, ...data }));
  };

  const handleCourtSelect = (courtId: number) => {
    setBookingData(prev => ({ ...prev, selectedCourt: courtId }));
  };

  const handleSessionSelect = (session: TrainingSession | null) => {
    setSelectedTrainingSession(session);
  };

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
        } else {
            setBookingData(prev => ({
                ...prev,
                date: '', startTime: '', endTime: '', duration: 0, selectedCourt: null
            }));
            setEquipmentItems([]);
            setFoodDrinkItems([]);
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
                <Equipments
                  onEquipmentChange={handleEquipmentChange}
                />
                <FoodAndDrink
                  onFoodDrinkChange={handleFoodDrinkChange}
                />
            </>
        )}

        {/* Conditional Rendering for Training Booking Specific Components */}
        {mode === 'training' && (
           <TrainingSessionForm
                selectedSession={selectedTrainingSession}
                onSessionSelect={handleSessionSelect}
           />
        )}

        {/* Total component is always rendered, but calculations depend on mode */}
        <Total
          mode={mode}
          bookingData={bookingData}
          selectedTrainingSession={selectedTrainingSession}
          equipmentItems={equipmentItems}
          foodDrinkItems={foodDrinkItems}
        />
      </div>
    </div>
  );
}