from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Courts"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for request and response
class Court(BaseModel):
    court_id: int
    status: str
    hour_rate: int
    type: str

class CourtCreate(BaseModel):
    hour_rate: int
    type: str  # 'normal', 'air-conditioner'
    status: str = "available"  # 'available', 'unavailable'

class CourtUpdate(BaseModel):
    hour_rate: Optional[int] = None
    type: Optional[str] = None  # 'normal', 'air-conditioner'

class CourtStatusUpdate(BaseModel):
    status: str  # 'available', 'unavailable'

class TimeBlock(BaseModel):
    block_id: Optional[int] = None
    court_id: int
    start_time: datetime
    end_time: datetime

# Routes
@router.get("/courts", response_model=List[Court])
async def list_courts(current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """List all courts."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT Court_ID as court_id, Status as status, HourRate as hour_rate, Type as type
        FROM court
        """)
        courts = cursor.fetchall()
        return courts

@router.post("/courts", response_model=Court)
async def create_court(court: CourtCreate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Add new court."""
    if court.status not in ['available', 'unavailable']:
        raise HTTPException(status_code=400, detail="Invalid status value")
    if court.type not in ['normal', 'air-conditioner']:
        raise HTTPException(status_code=400, detail="Invalid type value")
    
    with db.cursor() as cursor:
        cursor.execute("""
        INSERT INTO court (Status, HourRate, Type)
        VALUES (%s, %s, %s)
        """, (court.status, court.hour_rate, court.type))
        db.commit()
        court_id = cursor.lastrowid
        return {"court_id": court_id, "status": court.status, "hour_rate": court.hour_rate, "type": court.type}

@router.get("/courts/{court_id}", response_model=Court)
async def get_court(court_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Get court details."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT Court_ID as court_id, Status as status, HourRate as hour_rate, Type as type
        FROM court
        WHERE Court_ID = %s
        """, (court_id,))
        court = cursor.fetchone()
        if not court:
            raise HTTPException(status_code=404, detail="Court not found")
        return court

@router.put("/courts/{court_id}", response_model=Court)
async def update_court(court_id: int, update: CourtUpdate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Update court (rate, type)."""
    with db.cursor() as cursor:
        cursor.execute("SELECT Court_ID FROM court WHERE Court_ID = %s", (court_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Court not found")
        
        query = "UPDATE court SET "
        params = []
        updates = []
        if update.hour_rate is not None:
            updates.append("HourRate = %s")
            params.append(update.hour_rate)
        if update.type is not None:
            if update.type not in ['normal', 'air-conditioner']:
                raise HTTPException(status_code=400, detail="Invalid type value")
            updates.append("Type = %s")
            params.append(update.type)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        query += ", ".join(updates) + " WHERE Court_ID = %s"
        params.append(court_id)
        cursor.execute(query, params)
        db.commit()
        
        cursor.execute("""
        SELECT Court_ID as court_id, Status as status, HourRate as hour_rate, Type as type
        FROM court
        WHERE Court_ID = %s
        """, (court_id,))
        updated_court = cursor.fetchone()
        return updated_court

@router.patch("/courts/{court_id}/status", response_model=Court)
async def update_court_status(court_id: int, status_update: CourtStatusUpdate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Set court status ('available', 'unavailable')."""
    if status_update.status not in ['available', 'unavailable']:
        raise HTTPException(status_code=400, detail="Invalid status value")
    
    with db.cursor() as cursor:
        cursor.execute("SELECT Court_ID FROM court WHERE Court_ID = %s", (court_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Court not found")
        
        cursor.execute("UPDATE court SET Status = %s WHERE Court_ID = %s", (status_update.status, court_id))
        db.commit()
        
        cursor.execute("""
        SELECT Court_ID as court_id, Status as status, HourRate as hour_rate, Type as type
        FROM court
        WHERE Court_ID = %s
        """, (court_id,))
        updated_court = cursor.fetchone()
        return updated_court

@router.post("/courts/{court_id}/blocks", response_model=TimeBlock)
async def create_time_block(court_id: int, block: TimeBlock, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Create time blocks."""
    with db.cursor() as cursor:
        cursor.execute("SELECT Court_ID FROM court WHERE Court_ID = %s", (court_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Court not found")
        
        # Here we assume a separate table or mechanism for time blocks if needed
        # For now, we'll simulate it as a booking with a special status or type
        cursor.execute("""
        INSERT INTO booking (CourtID, StartTime, Endtime, Status, TotalPrice)
        VALUES (%s, %s, %s, 'Blocked', 0)
        """, (court_id, block.start_time, block.end_time))
        db.commit()
        block_id = cursor.lastrowid
        return {"block_id": block_id, "court_id": court_id, "start_time": block.start_time, "end_time": block.end_time}

@router.get("/courts/{court_id}/blocks", response_model=List[TimeBlock])
async def list_time_blocks(court_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """List time blocks for a court."""
    with db.cursor() as cursor:
        cursor.execute("SELECT Court_ID FROM court WHERE Court_ID = %s", (court_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Court not found")
        
        cursor.execute("""
        SELECT BookingID as block_id, CourtID as court_id, StartTime as start_time, Endtime as end_time
        FROM booking
        WHERE CourtID = %s AND Status = 'Blocked'
        """, (court_id,))
        blocks = cursor.fetchall()
        return blocks

@router.delete("/courts/blocks/{block_id}")
async def delete_time_block(block_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Remove time block."""
    with db.cursor() as cursor:
        cursor.execute("SELECT BookingID FROM booking WHERE BookingID = %s AND Status = 'Blocked'", (block_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Time block not found")
        
        cursor.execute("DELETE FROM booking WHERE BookingID = %s", (block_id,))
        db.commit()
        return {"message": "Time block deleted successfully"}