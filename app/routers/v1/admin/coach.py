from fastapi import APIRouter, Depends, HTTPException, status, Path, Body
from pydantic import BaseModel, Field
from typing import List, Optional
import pymysql
from loguru import logger

from app.database import get_db
from app.utils.auth import get_current_admin
# Import model functions
from app.models.coach import get_all_coaches_admin, get_coach_details_admin, update_coach_admin

# Define the router
admin_coach_router = APIRouter(
    prefix="/coaches",
    tags=["Admin - Coaches"],
    dependencies=[Depends(get_current_admin)], # Apply admin auth
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not found"}
    },
)

# --- Pydantic Models ---

# Response model for listing/getting coaches (includes User/Staff details)
class CoachDetailResponse(BaseModel):
    StaffID: int
    Username: str # From User join
    Name: str # From Staff join
    Description: Optional[str] = None
    image_url: Optional[str] = Field(None, alias="url") # Alias from DB column name
    Phone: Optional[str] = None # From User join
    JoinDate: Optional[str] = None # From User join

    class Config:
        populate_by_name = True # Allow using alias 'url'

# Request model for updating coach details
class CoachUpdateRequest(BaseModel):
    description: Optional[str] = Field(None, description="Updated coach description.")
    image_url: Optional[str] = Field(None, alias="url", description="Updated URL for the coach's image.")

    class Config:
        populate_by_name = True # Allow using alias 'url'

# --- Routes ---

# Placeholder for GET /
@admin_coach_router.get("/", response_model=List[CoachDetailResponse])
async def get_all_coaches(db: pymysql.connections.Connection = Depends(get_db)):
    """
    Admin route to retrieve a list of all coaches with their details.
    Requires admin privileges.
    """
    logger.info("Admin request to fetch all coaches.")
    try:
        coaches = get_all_coaches_admin(db=db)
        return coaches
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception("Admin: Unexpected error fetching all coaches: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# GET /{staff_id} - Get specific coach details
@admin_coach_router.get("/{staff_id}", response_model=CoachDetailResponse)
async def get_coach_detail(
    staff_id: int = Path(..., gt=0, description="The StaffID of the coach to retrieve."),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to retrieve details for a specific coach by StaffID.
    Requires admin privileges.
    """
    logger.info(f"Admin request to fetch coach with StaffID: {staff_id}")
    try:
        coach = get_coach_details_admin(staff_id=staff_id, db=db)
        # Model function raises 404 if not found
        return coach
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching coach StaffID {staff_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# PUT /{staff_id} - Update coach details
@admin_coach_router.put("/{staff_id}", response_model=CoachDetailResponse)
async def update_coach_detail(
    staff_id: int = Path(..., gt=0, description="The StaffID of the coach to update."),
    update_data: CoachUpdateRequest = Body(...),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to update details (description, image URL) for a specific coach.
    Requires admin privileges.
    """
    logger.info(f"Admin request to update coach with StaffID: {staff_id}")
    if not update_data.model_dump(exclude_unset=True, by_alias=True): # Use by_alias for url
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided."
        )
    
    try:
        updated_coach = update_coach_admin(
            staff_id=staff_id,
            db=db,
            update_data=update_data
        )
        # Model function handles 404 and returns updated details
        return updated_coach
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Admin: Unexpected error updating coach StaffID {staff_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")