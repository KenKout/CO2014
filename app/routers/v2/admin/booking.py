from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Bookings"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class Booking(BaseModel):
    booking_id: int
    customer_id: Optional[int] = None
    court_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: str
    total_price: Optional[int] = None

class BookingUpdate(BaseModel):
    status: str  # 'Pending', 'Confirmed', 'Completed', 'Cancelled'

# Routes
@router.get("/bookings", response_model=List[Booking])
async def list_bookings(
    user_id: Optional[int] = None, 
    court_id: Optional[int] = None, 
    date: Optional[datetime] = None, 
    status: Optional[str] = None, 
    current_admin: dict = Depends(get_current_admin), 
    db: pymysql.connections.Connection = Depends(get_db)
):
    """List all bookings with filters."""
    with db.cursor() as cursor:
        query = """
        SELECT BookingID as booking_id, CustomerID as customer_id, CourtID as court_id, 
               StartTime as start_time, Endtime as end_time, Status as status, TotalPrice as total_price
        FROM booking
        WHERE 1=1
        """
        params = []
        if user_id:
            query += " AND CustomerID = %s"
            params.append(user_id)
        if court_id:
            query += " AND CourtID = %s"
            params.append(court_id)
        if date:
            query += " AND DATE(StartTime) = DATE(%s)"
            params.append(date)
        if status:
            query += " AND Status = %s"
            params.append(status)
        
        cursor.execute(query, params)
        bookings = cursor.fetchall()
        return bookings

@router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Get any booking details."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT BookingID as booking_id, CustomerID as customer_id, CourtID as court_id, 
               StartTime as start_time, Endtime as end_time, Status as status, TotalPrice as total_price
        FROM booking
        WHERE BookingID = %s
        """, (booking_id,))
        booking = cursor.fetchone()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        return booking

@router.put("/bookings/{booking_id}/status", response_model=Booking)
async def update_booking_status(booking_id: int, update: BookingUpdate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Update booking status."""
    with db.cursor() as cursor:
        cursor.execute("SELECT BookingID, Status FROM booking WHERE BookingID = %s", (booking_id,))
        booking = cursor.fetchone()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if update.status not in ['Pending', 'Confirmed', 'Completed', 'Cancelled']:
            raise HTTPException(status_code=400, detail="Invalid status value")
        
        cursor.execute("UPDATE booking SET Status = %s WHERE BookingID = %s", (update.status, booking_id))
        db.commit()
        
        cursor.execute("""
        SELECT BookingID as booking_id, CustomerID as customer_id, CourtID as court_id, 
               StartTime as start_time, Endtime as end_time, Status as status, TotalPrice as total_price
        FROM booking
        WHERE BookingID = %s
        """, (booking_id,))
        updated_booking = cursor.fetchone()
        return updated_booking

@router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Delete any booking."""
    with db.cursor() as cursor:
        cursor.execute("SELECT BookingID FROM booking WHERE BookingID = %s", (booking_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Booking not found")
        
        cursor.execute("DELETE FROM booking WHERE BookingID = %s", (booking_id,))
        db.commit()
        return {"message": "Booking deleted successfully"}