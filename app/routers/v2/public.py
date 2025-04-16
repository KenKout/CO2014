from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db

router = APIRouter(
    prefix="",
    tags=["Public"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class CourtBase(BaseModel):
    court_id: int
    type: str
    hour_rate: int

class Court(CourtBase):
    status: str

class CoachBase(BaseModel):
    coach_id: int
    name: str
    rating: Optional[float] = None

class TrainingSessionBase(BaseModel):
    session_id: int
    type: str
    price: Optional[int] = None
    schedule: Optional[str] = None

# Routes
@router.get("/courts", response_model=List[CourtBase])
async def list_courts(db: pymysql.connections.Connection = Depends(get_db)):
    """List basic court info (ID, Type, Rate)."""
    with db.cursor() as cursor:
        cursor.execute("SELECT Court_ID as court_id, Type as type, HourRate as hour_rate FROM court")
        courts = cursor.fetchall()
        return courts

@router.get("/courts/{court_id}", response_model=Court)
async def get_court(court_id: int, db: pymysql.connections.Connection = Depends(get_db)):
    """Get public details for a specific court."""
    with db.cursor() as cursor:
        cursor.execute("SELECT Court_ID as court_id, Type as type, HourRate as hour_rate, Status as status FROM court WHERE Court_ID = %s", (court_id,))
        court = cursor.fetchone()
        if not court:
            raise HTTPException(status_code=404, detail="Court not found")
        return court

@router.get("/courts/availability")
async def check_court_availability(start_time: datetime, end_time: datetime, type: Optional[str] = None, db: pymysql.connections.Connection = Depends(get_db)):
    """Check general court availability."""
    with db.cursor() as cursor:
        query = """
        SELECT c.Court_ID as court_id, c.Type as type, c.HourRate as hour_rate
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

@router.get("/coaches", response_model=List[CoachBase])
async def list_coaches(db: pymysql.connections.Connection = Depends(get_db)):
    """List coaches (Name, Rating)."""
    with db.cursor() as cursor:
        cursor.execute("SELECT s.StaffID as coach_id, s.Name as name, c.Rating as rating FROM staff s JOIN coach c ON s.StaffID = c.StaffID")
        coaches = cursor.fetchall()
        return coaches

@router.get("/coaches/{coach_id}", response_model=CoachBase)
async def get_coach(coach_id: int, db: pymysql.connections.Connection = Depends(get_db)):
    """Get public coach profile (Name, Experience, Rating)."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT s.StaffID as coach_id, s.Name as name, c.Rating as rating, c.Expereience as experience
        FROM staff s JOIN coach c ON s.StaffID = c.StaffID
        WHERE s.StaffID = %s
        """, (coach_id,))
        coach = cursor.fetchone()
        if not coach:
            raise HTTPException(status_code=404, detail="Coach not found")
        return coach

@router.get("/training-sessions", response_model=List[TrainingSessionBase])
async def list_training_sessions(db: pymysql.connections.Connection = Depends(get_db)):
    """List public training sessions (Type, Price, Schedule Summary)."""
    with db.cursor() as cursor:
        cursor.execute("SELECT SessionID as session_id, Type as type, Price as price, Schedule as schedule FROM training_session")
        sessions = cursor.fetchall()
        return sessions

@router.get("/training-sessions/{session_id}", response_model=TrainingSessionBase)
async def get_training_session(session_id: int, db: pymysql.connections.Connection = Depends(get_db)):
    """Get public details for a session."""
    with db.cursor() as cursor:
        cursor.execute("SELECT SessionID as session_id, Type as type, Price as price, Schedule as schedule FROM training_session WHERE SessionID = %s", (session_id,))
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session

@router.get("/ratings/coach/{coach_id}")
async def get_coach_rating(coach_id: int, db: pymysql.connections.Connection = Depends(get_db)):
    """Get aggregated rating for a coach."""
    with db.cursor() as cursor:
        cursor.execute("SELECT AVG(score) as average_rating FROM ratings WHERE target_type = 'coach' AND target_id = %s", (coach_id,))
        rating = cursor.fetchone()
        return {"coach_id": coach_id, "average_rating": rating['average_rating'] if rating['average_rating'] else 0.0}

@router.get("/ratings/court/{court_id}")
async def get_court_rating(court_id: int, db: pymysql.connections.Connection = Depends(get_db)):
    """Get aggregated rating for a court."""
    with db.cursor() as cursor:
        cursor.execute("SELECT AVG(score) as average_rating FROM ratings WHERE target_type = 'court' AND target_id = %s", (court_id,))
        rating = cursor.fetchone()
        return {"court_id": court_id, "average_rating": rating['average_rating'] if rating['average_rating'] else 0.0}