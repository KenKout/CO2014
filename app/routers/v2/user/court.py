from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/user",
    tags=["User Courts"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class Court(BaseModel):
    court_id: int
    type: str
    hour_rate: int
    status: str

# Routes
@router.get("/courts", response_model=List[Court])
async def list_courts(current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """List courts with full details available to users."""
    with db.cursor() as cursor:
        cursor.execute("SELECT Court_ID as court_id, Type as type, HourRate as hour_rate, Status as status FROM court")
        courts = cursor.fetchall()
        return courts

@router.get("/courts/{court_id}", response_model=Court)
async def get_court(court_id: int, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Get detailed court info."""
    with db.cursor() as cursor:
        cursor.execute("SELECT Court_ID as court_id, Type as type, HourRate as hour_rate, Status as status FROM court WHERE Court_ID = %s", (court_id,))
        court = cursor.fetchone()
        if not court:
            raise HTTPException(status_code=404, detail="Court not found")
        return court

@router.get("/courts/availability")
async def check_court_availability(start_time: datetime, end_time: datetime, type: Optional[str] = None, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Check specific court availability."""
    with db.cursor() as cursor:
        query = """
        SELECT c.Court_ID as court_id, c.Type as type, c.HourRate as hour_rate, c.Status as status
        FROM court c
        WHERE c.Status = 'available'
        AND NOT EXISTS (
            SELECT 1 FROM booking b
            WHERE b.CourtID = c.Court_ID
            AND b.StartTime < %s AND b.Endtime > %s
            AND b.Status IN ('Pending', 'Confirmed')
        )
        """
        params = (end_time, start_time)
        if type:
            query += " AND c.Type = %s"
            params += (type,)
        cursor.execute(query, params)
        available_courts = cursor.fetchall()
        return available_courts