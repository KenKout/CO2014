from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Training"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for request and response
class TrainingSession(BaseModel):
    session_id: int
    type: str
    price: Optional[int] = None
    schedule: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    coach_id: Optional[int] = None
    court_id: Optional[int] = None

class TrainingSessionCreate(BaseModel):
    type: str  # 'beginner', 'intermediate'
    price: int
    schedule: Optional[str] = None
    start_date: datetime
    end_date: datetime
    coach_id: int
    court_id: Optional[int] = None

class TrainingSessionUpdate(BaseModel):
    type: Optional[str] = None  # 'beginner', 'intermediate'
    price: Optional[int] = None
    schedule: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    coach_id: Optional[int] = None
    court_id: Optional[int] = None

class ScheduleEntry(BaseModel):
    session_id: int
    court_id: int
    start_time: datetime
    end_time: datetime
    day_use: Optional[datetime] = None

class ScheduleEntryCreate(BaseModel):
    court_id: int
    start_time: datetime
    end_time: datetime
    day_use: Optional[datetime] = None

class Enrollment(BaseModel):
    customer_id: int
    session_id: int

# Routes
@router.get("/training-sessions", response_model=List[TrainingSession])
async def list_training_sessions(current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """List all training sessions."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT SessionID as session_id, Type as type, Price as price, Schedule as schedule, 
               StartDate as start_date, EndDate as end_date, CoachID as coach_id, CourtID as court_id
        FROM training_session
        """)
        sessions = cursor.fetchall()
        return sessions

@router.post("/training-sessions", response_model=TrainingSession)
async def create_training_session(session: TrainingSessionCreate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Create new training session."""
    if session.type not in ['beginner', 'intermediate']:
        raise HTTPException(status_code=400, detail="Invalid type value")
    
    with db.cursor() as cursor:
        # Check if coach exists
        cursor.execute("SELECT StaffID FROM coach WHERE StaffID = %s", (session.coach_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Coach not found")
        
        # Check if court exists if provided
        if session.court_id:
            cursor.execute("SELECT Court_ID FROM court WHERE Court_ID = %s", (session.court_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Court not found")
        
        cursor.execute("""
        INSERT INTO training_session (Type, Price, Schedule, StartDate, EndDate, CoachID, CourtID)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (session.type, session.price, session.schedule, session.start_date, session.end_date, session.coach_id, session.court_id))
        db.commit()
        session_id = cursor.lastrowid
        return {**session.dict(), "session_id": session_id}

@router.get("/training-sessions/{session_id}", response_model=TrainingSession)
async def get_training_session(session_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Get training session details."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT SessionID as session_id, Type as type, Price as price, Schedule as schedule, 
               StartDate as start_date, EndDate as end_date, CoachID as coach_id, CourtID as court_id
        FROM training_session
        WHERE SessionID = %s
        """, (session_id,))
        session = cursor.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Training session not found")
        return session

@router.put("/training-sessions/{session_id}", response_model=TrainingSession)
async def update_training_session(session_id: int, update: TrainingSessionUpdate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Update training session."""
    with db.cursor() as cursor:
        cursor.execute("SELECT SessionID FROM training_session WHERE SessionID = %s", (session_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Training session not found")
        
        query = "UPDATE training_session SET "
        params = []
        updates = []
        if update.type is not None:
            if update.type not in ['beginner', 'intermediate']:
                raise HTTPException(status_code=400, detail="Invalid type value")
            updates.append("Type = %s")
            params.append(update.type)
        if update.price is not None:
            updates.append("Price = %s")
            params.append(update.price)
        if update.schedule is not None:
            updates.append("Schedule = %s")
            params.append(update.schedule)
        if update.start_date is not None:
            updates.append("StartDate = %s")
            params.append(update.start_date)
        if update.end_date is not None:
            updates.append("EndDate = %s")
            params.append(update.end_date)
        if update.coach_id is not None:
            cursor.execute("SELECT StaffID FROM coach WHERE StaffID = %s", (update.coach_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Coach not found")
            updates.append("CoachID = %s")
            params.append(update.coach_id)
        if update.court_id is not None:
            cursor.execute("SELECT Court_ID FROM court WHERE Court_ID = %s", (update.court_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Court not found")
            updates.append("CourtID = %s")
            params.append(update.court_id)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        query += ", ".join(updates) + " WHERE SessionID = %s"
        params.append(session_id)
        cursor.execute(query, params)
        db.commit()
        
        cursor.execute("""
        SELECT SessionID as session_id, Type as type, Price as price, Schedule as schedule, 
               StartDate as start_date, EndDate as end_date, CoachID as coach_id, CourtID as court_id
        FROM training_session
        WHERE SessionID = %s
        """, (session_id,))
        updated_session = cursor.fetchone()
        return updated_session

@router.delete("/training-sessions/{session_id}")
async def delete_training_session(session_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Delete training session."""
    with db.cursor() as cursor:
        cursor.execute("SELECT SessionID FROM training_session WHERE SessionID = %s", (session_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Training session not found")
        
        cursor.execute("DELETE FROM training_session WHERE SessionID = %s", (session_id,))
        db.commit()
        return {"message": "Training session deleted successfully"}

@router.get("/training-sessions/{session_id}/enrollments", response_model=List[Enrollment])
async def list_enrollments(session_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """List enrolled customers for a session."""
    with db.cursor() as cursor:
        cursor.execute("SELECT SessionID FROM training_session WHERE SessionID = %s", (session_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Training session not found")
        
        cursor.execute("SELECT CustomerID as customer_id, SessionID as session_id FROM enroll WHERE SessionID = %s", (session_id,))
        enrollments = cursor.fetchall()
        return enrollments

@router.post("/training-sessions/{session_id}/schedule", response_model=ScheduleEntry)
async def add_schedule_entry(session_id: int, entry: ScheduleEntryCreate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Add schedule entry (court, time) to trainingschedule."""
    with db.cursor() as cursor:
        cursor.execute("SELECT SessionID FROM training_session WHERE SessionID = %s", (session_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Training session not found")
        
        cursor.execute("SELECT Court_ID FROM court WHERE Court_ID = %s", (entry.court_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Court not found")
        
        cursor.execute("""
        INSERT INTO trainingschedule (SessionID, CourtID, StartTime, EndTime, DayUse)
        VALUES (%s, %s, %s, %s, %s)
        """, (session_id, entry.court_id, entry.start_time, entry.end_time, entry.day_use))
        db.commit()
        return {**entry.dict(), "session_id": session_id}

@router.get("/training-sessions/{session_id}/schedule", response_model=List[ScheduleEntry])
async def list_schedule_entries(session_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """List schedule entries for a session."""
    with db.cursor() as cursor:
        cursor.execute("SELECT SessionID FROM training_session WHERE SessionID = %s", (session_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Training session not found")
        
        cursor.execute("""
        SELECT SessionID as session_id, CourtID as court_id, StartTime as start_time, EndTime as end_time, DayUse as day_use
        FROM trainingschedule
        WHERE SessionID = %s
        """, (session_id,))
        entries = cursor.fetchall()
        return entries

@router.delete("/training-sessions/{session_id}/schedule/court/{court_id}")
async def delete_schedule_entry(session_id: int, court_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Remove specific schedule entry."""
    with db.cursor() as cursor:
        cursor.execute("SELECT SessionID FROM training_session WHERE SessionID = %s", (session_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Training session not found")
        
        cursor.execute("SELECT Court_ID FROM court WHERE Court_ID = %s", (court_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Court not found")
        
        cursor.execute("DELETE FROM trainingschedule WHERE SessionID = %s AND CourtID = %s", (session_id, court_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Schedule entry not found")
        db.commit()
        return {"message": "Schedule entry deleted successfully"}