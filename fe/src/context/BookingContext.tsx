// app/context/BookingContext.tsx
"use client";

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { EquipmentItem } from '@/app/booking/components/Equipments';
import { FoodDrinkItem } from '@/app/booking/components/FoodAndDrink';

// --- Define Types ---
interface BookingData {
    date?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    selectedCourt: number | null;
}

interface BookingContextState {
    bookingData: BookingData;
    equipmentItems: EquipmentItem[];
    foodDrinkItems: FoodDrinkItem[];
    setBookingData: (data: Partial<BookingData>) => void; // Allow partial updates
    setEquipmentItems: (items: EquipmentItem[]) => void;
    setFoodDrinkItems: (items: FoodDrinkItem[]) => void;
    selectCourt: (courtId: number | null) => void;
    updateBookingDetails: (details: { date: string; startTime: string; endTime: string; duration: number }) => void;
    resetBooking: () => void; // Function to clear the booking
}

// --- Initial State ---
const initialBookingData: BookingData = {
    date: undefined,
    startTime: undefined,
    endTime: undefined,
    duration: undefined,
    selectedCourt: null,
};

// --- Create Context ---
// Provide a default stub that throws an error if used outside a provider
const BookingContext = createContext<BookingContextState>({
    bookingData: initialBookingData,
    equipmentItems: [],
    foodDrinkItems: [],
    setBookingData: () => { throw new Error('setBookingData function must be used within a BookingProvider'); },
    setEquipmentItems: () => { throw new Error('setEquipmentItems function must be used within a BookingProvider'); },
    setFoodDrinkItems: () => { throw new Error('setFoodDrinkItems function must be used within a BookingProvider'); },
    selectCourt: () => { throw new Error('selectCourt function must be used within a BookingProvider'); },
    updateBookingDetails: () => { throw new Error('updateBookingDetails function must be used within a BookingProvider'); },
    resetBooking: () => { throw new Error('resetBooking function must be used within a BookingProvider'); },
});


// --- Create Provider Component ---
interface BookingProviderProps {
    children: ReactNode;
}

export const BookingProvider = ({ children }: BookingProviderProps) => {
    const [bookingData, setBookingDataState] = useState<BookingData>(initialBookingData);
    // Initialize equipment/food state from the components' defaults if needed,
    // or fetch initial lists from an API. For simplicity, starting empty.
    const [equipmentItems, setEquipmentItems] = useState<EquipmentItem[]>([]);
    const [foodDrinkItems, setFoodDrinkItems] = useState<FoodDrinkItem[]>([]);

    // --- Updater Functions ---
    // More specific updaters are generally better than one generic setter

    const setBookingData = useCallback((data: Partial<BookingData>) => {
        setBookingDataState(prev => ({ ...prev, ...data }));
    }, []);

    const selectCourt = useCallback((courtId: number | null) => {
        setBookingDataState(prev => ({ ...prev, selectedCourt: courtId }));
    }, []);

    const updateBookingDetails = useCallback((details: { date: string; startTime: string; endTime: string; duration: number }) => {
        setBookingDataState(prev => ({
            ...prev,
            date: details.date,
            startTime: details.startTime,
            endTime: details.endTime,
            duration: details.duration,
        }));
    }, []);

    const resetBooking = useCallback(() => {
        setBookingDataState(initialBookingData);
        // Potentially reset items too, or keep them if user might rebook quickly
        setEquipmentItems([]); // Decide if items should reset
        setFoodDrinkItems([]); // Decide if items should reset
    }, []);

    // --- Context Value ---
    const value = {
        bookingData,
        equipmentItems,
        foodDrinkItems,
        setBookingData, // Expose the generic one if needed, but prefer specific ones
        setEquipmentItems,
        setFoodDrinkItems,
        selectCourt,
        updateBookingDetails,
        resetBooking,
    };

    return (
        <BookingContext.Provider value={value}>
            {children}
        </BookingContext.Provider>
    );
};

// --- Custom Hook for easy access ---
export const useBooking = () => {
    const context = useContext(BookingContext);
    if (context === undefined) {
        throw new Error('useBooking must be used within a BookingProvider');
    }
    return context;
};