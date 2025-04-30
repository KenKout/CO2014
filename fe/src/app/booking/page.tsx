"use client";

import { useState, useEffect, useCallback } from 'react'; // Import useCallback
import Information from './components/Information';
// Import the CourtData type (or define it here if not shared)
import BookingForm, { CourtData } from './components/BookingForm';
import Courts from './components/Courts';
import Equipments, { EquipmentItem } from './components/Equipments';
import FoodAndDrink, { FoodDrinkItem } from './components/FoodAndDrink';
// Import API client and potentially types
import { createApiClient } from '@/utils/api';
import Total from './components/Total';
import TrainingSessionForm, { TrainingSession } from './components/TrainingSessionForm';
import styles from '../../styles/Booking.module.css';

// Define CourtResponse and Court types (similar to Courts.tsx)
interface CourtResponse {
	Court_ID: number;
	Status: string;
	Type: string;
	HourRate: number;
}

// Define the Court type explicitly including all fields
interface Court {
    id: number;         // Explicitly include properties from CourtData
    hourRate: number;
    isPremium: boolean;
    name: string;       // Add other properties
    features: string[];
}

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
  // State for all courts data
  const [allCourts, setAllCourts] = useState<Court[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [courtsError, setCourtsError] = useState<string | null>(null);

  // Fetch courts data on component mount
  useEffect(() => {
    const fetchCourts = async () => {
      try {
        setLoadingCourts(true);
        setCourtsError(null);
        const apiClient = createApiClient(null);
        const response = await apiClient.get('/public/court/');
        
        // Transform the data from the API to match our Court interface
        const transformedCourts = response.data.map((court: CourtResponse): Court => ({
            id: court.Court_ID,
            name: `Court ${court.Court_ID}`,
            features: [
                `Type: ${court.Type}`,
                `Rate: ${court.HourRate.toLocaleString('vi-VN')}₫/hour`
            ],
            isPremium: court.Type === 'Air-conditioner',
            hourRate: court.HourRate // Store the hour rate
        }));
        
        setAllCourts(transformedCourts);
      } catch (err) {
        setCourtsError('Failed to load court information. Please try refreshing.');
        console.error('Error fetching courts in page:', err);
      } finally {
        setLoadingCourts(false);
      }
    };

    fetchCourts();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Wrap handleBookingChange in useCallback to prevent unnecessary re-renders
  const handleBookingChange = useCallback((data: Partial<typeof bookingData>) => {
    setBookingData(prev => ({ ...prev, ...data }));
  }, []); // Empty dependency array as setBookingData is stable

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

  // Derive selected court data
  const selectedCourtData = allCourts.find(court => court.id === bookingData.selectedCourt) || null;

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
                    // Pass the derived selectedCourtData object
                    selectedCourtData={selectedCourtData}
                />
                {/* Pass courts data and loading/error state to Courts component */}
                <Courts
                    selectedCourt={bookingData.selectedCourt}
                    onCourtSelect={handleCourtSelect}
                    bookingData={bookingData}
                    // Pass down fetched data and state
                    courts={allCourts}
                    loading={loadingCourts}
                    error={courtsError}
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
          // Pass selected court data to Total as well if needed for calculation
          selectedCourtData={selectedCourtData}
        />
      </div>
    </div>
  );
}