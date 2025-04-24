from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from pydantic import BaseModel, Field
from typing import List, Optional
import pymysql
from loguru import logger

from app.database import get_db
from app.utils.auth import get_current_admin

# Import model functions
from app.models.enroll import (
    get_enrollments_admin,
    create_enrollment_admin,
    delete_enrollment_admin
)

# Define the router
admin_enrollment_router = APIRouter(
    prefix="/enrollments",
    tags=["Admin - Enrollments"],
    dependencies=[Depends(get_current_admin)], # Apply admin auth
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not found"},
        409: {"description": "Conflict"} # For duplicate enrollment or dependency issues
    },
)

# --- Pydantic Models ---

# Request model for creating/deleting an enrollment
class EnrollmentRequest(BaseModel):
    CustomerID: int = Field(..., gt=0)
    SessionID: int = Field(..., gt=0)

# Response model for listing enrollments
class EnrollmentDetailResponse(BaseModel):
    CustomerID: int
    SessionID: int
    # Consider adding Customer Name and Session Details by joining in the model
    CustomerName: Optional[str] = None
    SessionDetails: Optional[str] = None # e.g., "Beginner Session (Mon 10:00)"

# --- Routes ---

# Placeholder for GET /
@admin_enrollment_router.get("/", response_model=List[EnrollmentDetailResponse])
async def get_enrollments(
    customer_id: Optional[int] = Query(None, description="Filter by CustomerID"),
    session_id: Optional[int] = Query(None, description="Filter by SessionID"),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to retrieve a list of enrollments, with optional filters.
    Requires admin privileges.
    """
    logger.info(f"Admin request to fetch enrollments with filters: customer_id={customer_id}, session_id={session_id}")
    try:
        enrollments = get_enrollments_admin(
            db=db,
            customer_id=customer_id,
            session_id=session_id
        )
        return enrollments
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception("Admin: Unexpected error fetching enrollments: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# POST / - Manually create enrollment
@admin_enrollment_router.post("/", response_model=EnrollmentDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_enrollment(
    enrollment_data: EnrollmentRequest = Body(...),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to manually enroll a customer in a training session.
    Requires admin privileges.
    """
    logger.info(f"Admin request to enroll CustomerID {enrollment_data.CustomerID} in SessionID {enrollment_data.SessionID}")
    try:
        # The model function returns a basic dict {"CustomerID": id, "SessionID": id} on success
        # This doesn't perfectly match EnrollmentDetailResponse which expects optional Name/Details.
        # We can either adjust the model function to fetch details, or adjust the response model here.
        # Let's adjust the response model for POST to be simpler for now.
        # Or, we can fetch details after creation. Let's try fetching details.
        created_enrollment_keys = create_enrollment_admin(
            customer_id=enrollment_data.CustomerID,
            session_id=enrollment_data.SessionID,
            db=db
        )
        # Now fetch the full details to match the response model
        enrollment_details = get_enrollments_admin(
            db=db,
            customer_id=created_enrollment_keys["CustomerID"],
            session_id=created_enrollment_keys["SessionID"]
        )
        if not enrollment_details: # Should not happen if creation succeeded
             raise HTTPException(status_code=500, detail="Failed to fetch details after creating enrollment.")
        return enrollment_details[0] # Return the first (and only) result
    except HTTPException as e:
        raise e # Re-raise 404, 409, 500
    except Exception as e:
        logger.exception(f"Admin: Unexpected error creating enrollment for C:{enrollment_data.CustomerID} S:{enrollment_data.SessionID}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# DELETE / - Manually delete enrollment
# Note: DELETE usually targets a specific resource via path param, but here we need composite key.
# Using DELETE on the collection with body/query params is one way, though less standard REST.
# Alternatively, could use a path like /customers/{customer_id}/enrollments/{session_id}
# Let's stick to DELETE /enrollments with body data for now as requested.
@admin_enrollment_router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_enrollment(
    enrollment_data: EnrollmentRequest = Body(...), # Get keys from body
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to manually unenroll a customer from a training session.
    Requires admin privileges and both CustomerID and SessionID in the request body.
    """
    logger.warning(f"Admin request to DELETE enrollment for CustomerID {enrollment_data.CustomerID}, SessionID {enrollment_data.SessionID}")
    try:
        delete_enrollment_admin(
            customer_id=enrollment_data.CustomerID,
            session_id=enrollment_data.SessionID,
            db=db
        )
        # No return needed for 204 No Content
    except HTTPException as e:
        raise e # Re-raise 404, 500
    except Exception as e:
        logger.exception(f"Admin: Unexpected error deleting enrollment for C:{enrollment_data.CustomerID} S:{enrollment_data.SessionID}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")