from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Schedule"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class CalendarEntry(BaseModel):
    event_type: str  # 'booking', 'training'
    event_id: int
    court_id: int
    start_time: datetime
    end_time: datetime
    details: Optional[str] = None

# Routes
@router.get("/schedules/calendar", response_model=List[CalendarEntry])
async def view_calendar(
    start_date: Optional[datetime] = None, 
    end_date: Optional[datetime] = None, 
    court_id: Optional[int] = None, 
    current_admin: dict = Depends(get_current_admin), 
    db: pymysql.connections.Connection = Depends(get_db)
):
    """View consolidated calendar."""
    with db.cursor() as cursor:
        # Fetch bookings
        booking_query = """
        SELECT 'booking' as event_type, BookingID as event_id, CourtID as court_id, 
               StartTime as start_time, Endtime as end_time, Status as details
        FROM booking
        WHERE Status IN ('Pending', 'Confirmed', 'Completed')
        """
        booking_params = []
        if start_date:
            booking_query += " AND StartTime >= %s"
            booking_params.append(start_date)
        if end_date:
            booking_query += " AND Endtime <= %s"
            booking_params.append(end_date)
        if court_id:
            booking_query += " AND CourtID = %s"
            booking_params.append(court_id)
        
        cursor.execute(booking_query, booking_params)
        bookings = cursor.fetchall()
        
        # Fetch training schedules
        training_query = """
        SELECT 'training' as event_type, ts.SessionID as event_id, ts.CourtID as court_id, 
               ts.StartTime as start_time, ts.EndTime as end_time, t.Type as details
        FROM trainingschedule ts
        JOIN training_session t ON ts.SessionID = t.SessionID
        """
        training_params = []
        if start_date:
            training_query += " AND ts.StartTime >= %s"
            training_params.append(start_date)
        if end_date:
            training_query += " AND ts.EndTime <= %s"
            training_params.append(end_date)
        if court_id:
            training_query += " AND ts.CourtID = %s"
            training_params.append(court_id)
        
        cursor.execute(training_query, training_params)
        trainings = cursor.fetchall()
        
        # Combine results
        calendar = bookings + trainings
        return calendar