from fastapi import APIRouter, Depends, HTTPException, Query, Path
from typing import List, Optional
import pymysql
from datetime import datetime
from app.database import get_db
from app.models.training_session import ( # Updated import
    get_all_training_sessions,
    get_training_session_by_id,
    get_training_sessions_by_coach
)
from pydantic import BaseModel
from app.models.enums import TrainingSessionType # Keep this if needed, check dump.sql

# Create training session router
training_router = APIRouter(
    prefix="/training-sessions",
    tags=["Training Sessions"],
    responses={404: {"description": "Not found"}},
)

# Pydantic model for response
class TrainingSessionResponse(BaseModel):
    SessionID: int
    StartDate: datetime
    EndDate: datetime
    CoachID: int
    CourtID: int
    Schedule: Optional[str] = None
    Type: str # Corresponds to ENUM('Beginner', 'Intermediate', 'Advanced') in dump.sql
    Price: int
    Max_Students: int
    Status: str # Corresponds to ENUM('Available','Unavailable') in dump.sql
    Rating: Optional[float] = None
    CoachName: str
    coach_image_url: Optional[str] = None

@training_router.get("/", response_model=List[TrainingSessionResponse])
async def get_training_sessions(
    coach_id: Optional[int] = Query(None, description="Filter by coach ID"),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Get all training sessions. Optionally filter by coach ID.
    """
    try:
        if coach_id:
            sessions = get_training_sessions_by_coach(coach_id, db)
        else:
            sessions = get_all_training_sessions(db)
        return sessions
    except HTTPException as e:
        raise e
    except Exception as e:
        # Use loguru for logging
        from loguru import logger
        logger.error(f"Error getting training sessions (coach_id={coach_id}): {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@training_router.get("/{session_id}", response_model=TrainingSessionResponse)
async def get_training_session(
    session_id: int = Path(..., description="Training Session ID"),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Get a specific training session by ID.
    """
    try:
        session = get_training_session_by_id(session_id, db)
        return session
    except HTTPException as e:
        raise e
    except Exception as e:
        # Use loguru for logging
        from loguru import logger
        logger.error(f"Error getting training session by ID {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")