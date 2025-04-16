from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/user",
    tags=["User Coaches"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class Coach(BaseModel):
    coach_id: int
    name: str
    rating: Optional[float] = None
    experience: Optional[str] = None

class CoachAvailability(BaseModel):
    coach_id: int
    start_time: datetime
    end_time: datetime

# Routes
@router.get("/coaches", response_model=List[Coach])
async def list_coaches(current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """List coaches with details."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT s.StaffID as coach_id, s.Name as name, c.Rating as rating, c.Expereience as experience
        FROM staff s 
        JOIN coach c ON s.StaffID = c.StaffID
        """)
        coaches = cursor.fetchall()
        return coaches

@router.get("/coaches/{coach_id}", response_model=Coach)
async def get_coach(coach_id: int, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Get coach details."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT s.StaffID as coach_id, s.Name as name, c.Rating as rating, c.Expereience as experience
        FROM staff s 
        JOIN coach c ON s.StaffID = c.StaffID
        WHERE s.StaffID = %s
        """, (coach_id,))
        coach = cursor.fetchone()
        if not coach:
            raise HTTPException(status_code=404, detail="Coach not found")
        return coach

@router.get("/coaches/availability", response_model=List[CoachAvailability])
async def check_coach_availability(start_time: datetime, end_time: datetime, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Check coach availability."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT s.StaffID as coach_id, ts.StartTime as start_time, ts.EndTime as end_time
        FROM staff s
        JOIN coach c ON s.StaffID = c.StaffID
        LEFT JOIN training_session t ON c.StaffID = t.CoachID
        LEFT JOIN trainingschedule ts ON t.SessionID = ts.SessionID
        WHERE NOT EXISTS (
            SELECT 1 
            FROM training_session t2 
            JOIN trainingschedule ts2 ON t2.SessionID = ts2.SessionID
            WHERE t2.CoachID = c.StaffID
            AND ts2.StartTime < %s AND ts2.EndTime > %s
        )
        GROUP BY s.StaffID
        """, (end_time, start_time))
        availability = cursor.fetchall()
        return availability