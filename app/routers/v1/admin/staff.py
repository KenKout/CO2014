from fastapi import APIRouter, Depends, HTTPException, status, Path, Body
from pydantic import BaseModel, Field
from typing import List, Optional
import pymysql
from loguru import logger

from app.database import get_db
from app.utils.auth import get_current_admin
# from app.models.enums import UserType # Not needed here
# Import model functions
from app.models.user import get_all_staff_admin, get_staff_by_id_admin, update_staff_admin

# Define the router
admin_staff_router = APIRouter(
    prefix="/staff",
    tags=["Admin - Staff"],
    dependencies=[Depends(get_current_admin)], # Apply admin auth
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not found"}
    },
)

# --- Pydantic Models ---

# Response model for listing/getting staff (includes User details)
class StaffDetailResponse(BaseModel):
    StaffID: int
    Username: str
    Name: str
    Salary: Optional[int] = None
    Phone: Optional[str] = None # Added from User table
    JoinDate: Optional[str] = None # Added from User table

# Request model for updating staff
class StaffUpdateRequest(BaseModel):
    # Only salary is staff-specific and updatable via this route for now
    # Name/Phone updates could go via the /users/{username} route
    salary: Optional[int] = Field(None, gt=0, description="Updated salary for the staff member.")

# --- Routes ---

# Placeholder for GET /
@admin_staff_router.get("/", response_model=List[StaffDetailResponse])
async def get_all_staff(db: pymysql.connections.Connection = Depends(get_db)):
    """
    Admin route to retrieve a list of all staff members.
    Requires admin privileges.
    """
    logger.info("Admin request to fetch all staff.")
    try:
        staff_list = get_all_staff_admin(db=db)
        return staff_list
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception("Unexpected error fetching all staff: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# GET /{staff_id} - Get specific staff member
@admin_staff_router.get("/{staff_id}", response_model=StaffDetailResponse)
async def get_staff_member(
    staff_id: int = Path(..., gt=0, description="The ID of the staff member to retrieve."),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to retrieve details for a specific staff member by StaffID.
    Requires admin privileges.
    """
    logger.info(f"Admin request to fetch staff member with ID: {staff_id}")
    try:
        staff_member = get_staff_by_id_admin(staff_id=staff_id, db=db)
        # Model function raises 404 if not found
        return staff_member
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Unexpected error fetching staff ID {staff_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# PUT /{staff_id} - Update staff member (e.g., salary)
@admin_staff_router.put("/{staff_id}", response_model=StaffDetailResponse)
async def update_staff_member(
    staff_id: int = Path(..., gt=0, description="The ID of the staff member to update."),
    update_data: StaffUpdateRequest = Body(...),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to update details (e.g., salary) for a specific staff member.
    Requires admin privileges.
    """
    logger.info(f"Admin request to update staff member with ID: {staff_id}")
    if not update_data.model_dump(exclude_unset=True):
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided."
        )
    
    try:
        updated_staff = update_staff_admin(
            staff_id=staff_id,
            db=db,
            update_data=update_data
        )
        # Model function handles 404 and returns updated details
        return updated_staff
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Unexpected error updating staff ID {staff_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")