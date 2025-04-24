from fastapi import APIRouter, Depends, HTTPException, Query, Path
from typing import List, Dict, Optional, Any
import pymysql
from datetime import datetime, timedelta
from app.database import get_db
from app.models.court import (
    get_available_courts,
    get_court_by_id,
    get_available_time_slots
)
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/court",
    tags=["Court"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class TimeSlot(BaseModel):
    start: datetime
    end: datetime

class CourtResponse(BaseModel):
    Court_ID: int
    Status: str
    HourRate: int
    Type: str

class CourtTimeSlotResponse(BaseModel):
    court: Dict[str, Any]
    available_slots: List[TimeSlot]

@router.get("/", response_model=List[CourtResponse])
async def get_courts(
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Get all available courts.
    """
    try:
        courts = get_available_courts(db)
        return courts
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.get("/{court_id}", response_model=CourtTimeSlotResponse)
async def get_court_by_id_with_availability(
    court_id: int = Path(..., description="Court ID"),
    start_time: Optional[datetime] = Query(None, description="Start time (ISO format)"),
    end_time: Optional[datetime] = Query(None, description="End time (ISO format)"),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Get a specific court by ID with available time slots.
    
    If start_time and end_time are not provided, uses working hours (5:00-23:00 UTC+7).
    """
    try:
        # Get court information
        court = get_court_by_id(court_id, db)
        
        # Get available time slots
        available_slots = get_available_time_slots(court_id, start_time, end_time, db)
        
        # Convert to response model
        response = {
            "court": court,
            "available_slots": available_slots
        }
        
        return response
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal Server Error")