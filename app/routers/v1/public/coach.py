from fastapi import APIRouter, Depends, HTTPException, Path
from typing import List, Optional
import pymysql
from app.database import get_db
from app.models.coach import ( # Updated import
    get_all_coaches,
    get_coach_by_id,
)
from pydantic import BaseModel

# Create coach router
coach_router = APIRouter(
    prefix="/coaches",
    tags=["Coaches"],
    responses={404: {"description": "Not found"}},
)

# Pydantic model for response
class CoachResponse(BaseModel):
    StaffID: int
    Description: Optional[str] = None
    image_url: Optional[str] = None
    Name: str

@coach_router.get("/", response_model=List[CoachResponse])
async def get_coaches(
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Get all coaches.
    """
    try:
        coaches = get_all_coaches(db)
        return coaches
    except HTTPException as e:
        raise e
    except Exception as e:
        # Use loguru for logging
        from loguru import logger
        logger.error(f"Error getting all coaches: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@coach_router.get("/{coach_id}", response_model=CoachResponse)
async def get_coach(
    coach_id: int = Path(..., description="Coach ID (StaffID)"),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Get a specific coach by ID.
    """
    try:
        coach = get_coach_by_id(coach_id, db)
        return coach
    except HTTPException as e:
        raise e
    except Exception as e:
        # Use loguru for logging
        from loguru import logger
        logger.error(f"Error getting coach by ID {coach_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")