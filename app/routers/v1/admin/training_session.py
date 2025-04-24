from fastapi import APIRouter, Depends, HTTPException, status, Path, Body
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
import pymysql
from loguru import logger

from app.database import get_db
from app.utils.auth import get_current_admin
from app.models.enums import TrainingSessionType, TrainingSessionStatus # Use correct enum for session status

# Import model functions
from app.models.training_session import (
    create_training_session_admin,
    get_all_training_sessions_admin,
    get_training_session_by_id_admin,
    update_training_session_admin,
    delete_training_session_admin
)

# Define the router
admin_training_router = APIRouter(
    prefix="/training-sessions",
    tags=["Admin - Training Sessions"],
    dependencies=[Depends(get_current_admin)], # Apply admin auth
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not found"}
    },
)

# --- Pydantic Models ---

class TrainingSessionBase(BaseModel):
    StartDate: datetime
    EndDate: datetime
    CoachID: int = Field(..., gt=0)
    CourtID: int = Field(..., gt=0)
    Schedule: Optional[str] = Field(None, max_length=255)
    Type: TrainingSessionType
    Status: TrainingSessionStatus # Use the correct enum
    Price: int = Field(..., ge=0)
    Max_Students: int = Field(..., gt=0)

class AdminTrainingSessionCreateRequest(TrainingSessionBase):
    # SessionID is likely auto-generated or needs careful handling if manually set
    SessionID: int = Field(..., description="SessionID must be provided as it's the PK.") # Make SessionID required for creation
    Rating: Optional[float] = Field(None, ge=0.0, le=5.0, description="Initial rating (optional)")
    # Add schedule slots
    schedule_slots: Optional[List['ScheduleSlot']] = Field(None, description="Specific time slots for this session on the assigned court.")

# Pydantic model for individual schedule slots within the request
class ScheduleSlot(BaseModel):
    StartTime: datetime
    EndTime: datetime

    @validator('EndTime')
    def end_time_must_be_after_start_time(cls, v, values):
        if 'StartTime' in values and v <= values['StartTime']:
            raise ValueError('Schedule slot EndTime must be after StartTime')
        return v

# Define the update request model *after* ScheduleSlot is defined
class AdminTrainingSessionUpdateRequest(BaseModel):
    # Allow updating most fields
    StartDate: Optional[datetime] = None
    EndDate: Optional[datetime] = None
    CoachID: Optional[int] = Field(None, gt=0)
    CourtID: Optional[int] = Field(None, gt=0)
    Schedule: Optional[str] = Field(None, max_length=255)
    Type: Optional[TrainingSessionType] = None
    Status: Optional[TrainingSessionStatus] = None # Use correct enum
    Price: Optional[int] = Field(None, ge=0)
    Rating: Optional[float] = Field(None, ge=0.0, le=5.0)
    Max_Students: Optional[int] = Field(None, gt=0)
    # Allow replacing schedule slots during update
    schedule_slots: Optional[List[ScheduleSlot]] = Field(None, description="Replace existing schedule slots with this list. Provide an empty list to remove all slots.")

    @validator('EndDate')
    def check_dates(cls, end_date, values):
        start_date = values.get('StartDate')
        # Ensure end_date is after start_date if both are provided
        if start_date and end_date and end_date <= start_date:
            raise ValueError('EndDate must be after StartDate')
        return end_date

class AdminTrainingSessionResponse(TrainingSessionBase):
    SessionID: int
    Rating: Optional[float] = None
    # Add fields from joins
    CoachName: Optional[str] = None
    coach_image_url: Optional[str] = None # Added based on model query
    CourtInfo: Optional[str] = None # e.g., "Court 1 (Normal)"
    schedule_slots: Optional[List[ScheduleSlot]] = Field(None, description="Specific time slots for this session.")

# --- Routes ---

# Placeholder for POST /
@admin_training_router.post("/", response_model=AdminTrainingSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: AdminTrainingSessionCreateRequest,
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to create a new training session.
    Requires admin privileges.
    """
    logger.info("Admin request to create a new training session.")
    try:
        created_session = create_training_session_admin(session_data=session_data, db=db)
        # Model function returns the created session details matching the response model
        return created_session
    except HTTPException as e:
        raise e # Re-raise validation errors (400, 404, 409) or DB errors (500)
    except Exception as e:
        logger.exception("Admin: Unexpected error creating training session: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# GET / - List all sessions
@admin_training_router.get("/", response_model=List[AdminTrainingSessionResponse])
async def get_all_sessions(db: pymysql.connections.Connection = Depends(get_db)):
    """
    Admin route to retrieve a list of all training sessions.
    Requires admin privileges.
    """
    logger.info("Admin request to fetch all training sessions.")
    try:
        sessions = get_all_training_sessions_admin(db=db)
        return sessions
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception("Admin: Unexpected error fetching all training sessions: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# GET /{session_id} - Get specific session
@admin_training_router.get("/{session_id}", response_model=AdminTrainingSessionResponse)
async def get_session_detail(
    session_id: int = Path(..., description="The ID of the training session to retrieve."),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to retrieve details for a specific training session.
    Requires admin privileges.
    """
    logger.info(f"Admin request to fetch training session ID: {session_id}")
    try:
        session = get_training_session_by_id_admin(session_id=session_id, db=db)
        # Model function raises 404 if not found
        return session
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching session ID {session_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# PUT /{session_id} - Update specific session
@admin_training_router.put("/{session_id}", response_model=AdminTrainingSessionResponse)
async def update_session_detail(
    session_id: int = Path(..., description="The ID of the training session to update."),
    update_data: AdminTrainingSessionUpdateRequest = Body(...),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to update details for a specific training session.
    Requires admin privileges.
    """
    logger.info(f"Admin request to update training session ID: {session_id}")
    if not update_data.model_dump(exclude_unset=True):
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided."
        )
    
    try:
        updated_session = update_training_session_admin(
            session_id=session_id,
            update_data=update_data,
            db=db
        )
        # Model function handles 404 and returns updated details
        return updated_session
    except HTTPException as e:
        raise e # Re-raise validation errors (400, 404) or DB errors (500)
    except Exception as e:
        logger.exception(f"Admin: Unexpected error updating session ID {session_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# DELETE /{session_id} - Delete specific session
@admin_training_router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int = Path(..., description="The ID of the training session to delete."),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to delete a training session.
    Requires admin privileges.
    WARNING: Check for dependencies (Enroll, OrderTable, Feedback) before deleting.
    """
    logger.warning(f"Admin request to DELETE training session ID: {session_id}")
    try:
        delete_training_session_admin(session_id=session_id, db=db)
        # No return needed for 204 No Content
    except HTTPException as e:
        raise e # Re-raise 404, 409 or DB errors (500)
    except Exception as e:
        logger.exception(f"Admin: Unexpected error deleting session ID {session_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")