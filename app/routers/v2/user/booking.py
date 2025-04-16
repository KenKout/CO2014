from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/user",
    tags=["User Bookings"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for request and response
class BookingBase(BaseModel):
    booking_id: int
    court_id: int
    start_time: datetime
    end_time: datetime
    status: str
    total_price: Optional[int] = None

class BookingCreate(BaseModel):
    court_id: int
    start_time: datetime
    end_time: datetime

# Routes
@router.post("/bookings", response_model=BookingBase)
async def create_booking(booking: BookingCreate, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Create a booking."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        # Check if user is a customer
        cursor.execute("SELECT CustomerID FROM customer WHERE UserID = %s", (user_id,))
        customer = cursor.fetchone()
        if not customer:
            raise HTTPException(status_code=403, detail="Only customers can make bookings")
        customer_id = customer['CustomerID']
        
        # Check court availability
        cursor.execute("""
        SELECT Court_ID FROM court WHERE Court_ID = %s AND Status = 'available'
        AND NOT EXISTS (
            SELECT 1 FROM booking b
            WHERE b.CourtID = court.Court_ID
            AND b.StartTime < %s AND b.Endtime > %s
            AND b.Status IN ('Pending', 'Confirmed')
        )
        """, (booking.court_id, booking.end_time, booking.start_time))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Court not available for the selected time")
        
        # Calculate total price based on duration and court rate
        cursor.execute("SELECT HourRate FROM court WHERE Court_ID = %s", (booking.court_id,))
        rate = cursor.fetchone()['HourRate']
        duration_hours = (booking.end_time - booking.start_time).total_seconds() / 3600
        total_price = int(rate * duration_hours)
        
        # Insert booking
        cursor.execute("""
        INSERT INTO booking (CustomerID, CourtID, StartTime, Endtime, Status, TotalPrice)
        VALUES (%s, %s, %s, %s, 'Pending', %s)
        """, (customer_id, booking.court_id, booking.start_time, booking.end_time, total_price))
        db.commit()
        booking_id = cursor.lastrowid
        return {**booking.dict(), "booking_id": booking_id, "status": "Pending", "total_price": total_price}

@router.get("/bookings", response_model=List[BookingBase])
async def list_bookings(current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """List user's bookings."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT b.BookingID as booking_id, b.CourtID as court_id, b.StartTime as start_time, 
               b.Endtime as end_time, b.Status as status, b.TotalPrice as total_price
        FROM booking b
        JOIN customer c ON b.CustomerID = c.CustomerID
        WHERE c.UserID = %s
        """, (user_id,))
        bookings = cursor.fetchall()
        return bookings

@router.get("/bookings/{booking_id}", response_model=BookingBase)
async def get_booking(booking_id: int, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Get user's booking details."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT b.BookingID as booking_id, b.CourtID as court_id, b.StartTime as start_time, 
               b.Endtime as end_time, b.Status as status, b.TotalPrice as total_price
        FROM booking b
        JOIN customer c ON b.CustomerID = c.CustomerID
        WHERE c.UserID = %s AND b.BookingID = %s
        """, (user_id, booking_id))
        booking = cursor.fetchone()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found or not authorized")
        return booking

@router.put("/bookings/{booking_id}", response_model=BookingBase)
async def update_booking(booking_id: int, booking_update: BookingCreate, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Request update/cancellation of a booking."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT b.BookingID, b.CustomerID, c.UserID
        FROM booking b
        JOIN customer c ON b.CustomerID = c.CustomerID
        WHERE b.BookingID = %s
        """, (booking_id,))
        booking = cursor.fetchone()
        if not booking or booking['UserID'] != user_id:
            raise HTTPException(status_code=404, detail="Booking not found or not authorized")
        
        if booking['Status'] not in ['Pending', 'Confirmed']:
            raise HTTPException(status_code=400, detail="Booking cannot be updated")
        
        # Check court availability for new time slot if changed
        if booking_update.start_time != booking['StartTime'] or booking_update.end_time != booking['Endtime']:
            cursor.execute("""
            SELECT Court_ID FROM court WHERE Court_ID = %s AND Status = 'available'
            AND NOT EXISTS (
                SELECT 1 FROM booking b
                WHERE b.CourtID = court.Court_ID
                AND b.StartTime < %s AND b.Endtime > %s
                AND b.Status IN ('Pending', 'Confirmed')
                AND b.BookingID != %s
            )
            """, (booking_update.court_id, booking_update.end_time, booking_update.start_time, booking_id))
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="Court not available for the new selected time")
        
        # Recalculate total price if time or court changed
        cursor.execute("SELECT HourRate FROM court WHERE Court_ID = %s", (booking_update.court_id,))
        rate = cursor.fetchone()['HourRate']
        duration_hours = (booking_update.end_time - booking_update.start_time).total_seconds() / 3600
        total_price = int(rate * duration_hours)
        
        cursor.execute("""
        UPDATE booking 
        SET CourtID = %s, StartTime = %s, Endtime = %s, TotalPrice = %s, Status = 'Pending'
        WHERE BookingID = %s
        """, (booking_update.court_id, booking_update.start_time, booking_update.end_time, total_price, booking_id))
        db.commit()
        return {**booking_update.dict(), "booking_id": booking_id, "status": "Pending", "total_price": total_price}

@router.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: int, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Cancel booking if allowed."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT b.BookingID, b.Status, c.UserID
        FROM booking b
        JOIN customer c ON b.CustomerID = c.CustomerID
        WHERE b.BookingID = %s
        """, (booking_id,))
        booking = cursor.fetchone()
        if not booking or booking['UserID'] != user_id:
            raise HTTPException(status_code=404, detail="Booking not found or not authorized")
        
        if booking['Status'] not in ['Pending', 'Confirmed']:
            raise HTTPException(status_code=400, detail="Booking cannot be cancelled")
        
        cursor.execute("UPDATE booking SET Status = 'Cancelled' WHERE BookingID = %s", (booking_id,))
        db.commit()
        return {"message": "Booking cancelled successfully"}