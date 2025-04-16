from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Coaches"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for request and response
class Coach(BaseModel):
    coach_id: int
    name: str
    rating: Optional[float] = None
    experience: Optional[str] = None

class CoachUpdate(BaseModel):
    experience: Optional[str] = None
    rating: Optional[float] = None

class CoachAvailability(BaseModel):
    coach_id: int
    start_time: datetime
    end_time: datetime

# Routes
@router.get("/coaches", response_model=List[Coach])
async def list_coaches(current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """List coaches."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT s.StaffID as coach_id, s.Name as name, c.Rating as rating, c.Expereience as experience
        FROM staff s
        JOIN coach c ON s.StaffID = c.StaffID
        """)
        coaches = cursor.fetchall()
        return coaches

@router.get("/coaches/{coach_id}", response_model=Coach)
async def get_coach(coach_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
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

@router.put("/coaches/{coach_id}", response_model=Coach)
async def update_coach(coach_id: int, update: CoachUpdate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Update coach specifics (experience, rating in coach table)."""
    with db.cursor() as cursor:
        cursor.execute("SELECT StaffID FROM coach WHERE StaffID = %s", (coach_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Coach not found")
        
        query = "UPDATE coach SET "
        params = []
        updates = []
        if update.experience is not None:
            updates.append("Expereience = %s")
            params.append(update.experience)
        if update.rating is not None:
            updates.append("Rating = %s")
            params.append(update.rating)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        query += ", ".join(updates) + " WHERE StaffID = %s"
        params.append(coach_id)
        cursor.execute(query, params)
        db.commit()
        
        cursor.execute("""
        SELECT s.StaffID as coach_id, s.Name as name, c.Rating as rating, c.Expereience as experience
        FROM staff s
        JOIN coach c ON s.StaffID = c.StaffID
        WHERE s.StaffID = %s
        """, (coach_id,))
        updated_coach = cursor.fetchone()
        return updated_coach

@router.post("/coaches/{coach_id}/availability")
async def define_coach_availability(coach_id: int, availability: CoachAvailability, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Define coach availability."""
    with db.cursor() as cursor:
        cursor.execute("SELECT StaffID FROM coach WHERE StaffID = %s", (coach_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Coach not found")
        
        # Assuming a table or mechanism for coach availability
        # For now, we'll simulate it as a placeholder
        # In a real scenario, this would insert into a coach_availability table
        return {"message": "Coach availability defined successfully", "coach_id": coach_id, "start_time": availability.start_time, "end_time": availability.end_time}

@router.get("/coaches/{coach_id}/availability", response_model=List[CoachAvailability])
async def get_coach_availability(coach_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """View coach availability."""
    with db.cursor() as cursor:
        cursor.execute("SELECT StaffID FROM coach WHERE StaffID = %s", (coach_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Coach not found")
        
        # Placeholder for actual availability data
        # In a real scenario, this would query a coach_availability table
        return []

@router.get("/coaches/{coach_id}/schedule", response_model=List[CoachAvailability])
async def get_coach_schedule(coach_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """View assigned training schedule."""
    with db.cursor() as cursor:
        cursor.execute("SELECT StaffID FROM coach WHERE StaffID = %s", (coach_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Coach not found")
        
        cursor.execute("""
        SELECT t.CoachID as coach_id, ts.StartTime as start_time, ts.EndTime as end_time
        FROM training_session t
        JOIN trainingschedule ts ON t.SessionID = ts.SessionID
        WHERE t.CoachID = %s
        """, (coach_id,))
        schedule = cursor.fetchall()
        return schedule