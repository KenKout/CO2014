from fastapi import APIRouter, Depends, HTTPException, status, Path, Query
from pydantic import BaseModel, Field
from typing import List, Optional
import pymysql
from loguru import logger

from app.database import get_db
from app.utils.auth import get_current_admin
from app.models.enums import FeedbackType # From dump.sql ON column

# Import model functions
from app.models.feedback import (
    get_all_feedback_admin,
    get_feedback_by_id_admin,
    delete_feedback_admin
)

# Define the router
admin_feedback_router = APIRouter(
    prefix="/feedback",
    tags=["Admin - Feedback"],
    dependencies=[Depends(get_current_admin)], # Apply admin auth
    responses={
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not found"}
    },
)

# --- Pydantic Models ---

# Response model for listing/getting feedback
class FeedbackDetailResponse(BaseModel):
    FeedbackID: int
    CustomerID: int
    Content: Optional[str] = None
    Title: Optional[str] = None
    ON: FeedbackType # Enum 'Court' or 'Session'
    Rate: Optional[int] = None
    CourtID: Optional[int] = None
    SessionID: Optional[int] = None
    OrderID: Optional[int] = None
    # Consider adding Customer Name, Court/Session details
    CustomerName: Optional[str] = None
    TargetDetails: Optional[str] = None # e.g., "Court 5" or "Beginner Session (ID: 101)"

# --- Routes ---

# Placeholder for GET /
@admin_feedback_router.get("/", response_model=List[FeedbackDetailResponse])
async def get_all_feedback(
    customer_id: Optional[int] = Query(None, description="Filter by CustomerID"),
    feedback_on: Optional[FeedbackType] = Query(None, alias="on", description="Filter by type (Court or Session)"),
    target_id: Optional[int] = Query(None, description="Filter by CourtID or SessionID (use with 'on' filter)"),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to retrieve a list of all feedback, with optional filters.
    Requires admin privileges.
    """
    logger.info(f"Admin request to fetch feedback with filters: customer_id={customer_id}, on={feedback_on}, target_id={target_id}")
    try:
        feedback_list = get_all_feedback_admin(
            db=db,
            customer_id=customer_id,
            feedback_on=feedback_on,
            target_id=target_id
        )
        return feedback_list
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception("Admin: Unexpected error fetching feedback: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# GET /{feedback_id} - Get specific feedback
@admin_feedback_router.get("/{feedback_id}", response_model=FeedbackDetailResponse)
async def get_feedback_detail(
    feedback_id: int = Path(..., gt=0, description="The ID of the feedback to retrieve."),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to retrieve details for specific feedback.
    Requires admin privileges.
    """
    logger.info(f"Admin request to fetch feedback ID: {feedback_id}")
    try:
        feedback = get_feedback_by_id_admin(feedback_id=feedback_id, db=db)
        # Model function raises 404 if not found
        return feedback
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.exception(f"Admin: Unexpected error fetching feedback ID {feedback_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

# DELETE /{feedback_id} - Delete specific feedback
@admin_feedback_router.delete("/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feedback(
    feedback_id: int = Path(..., gt=0, description="The ID of the feedback to delete."),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """
    Admin route to delete feedback.
    Requires admin privileges.
    """
    logger.warning(f"Admin request to DELETE feedback ID: {feedback_id}")
    try:
        delete_feedback_admin(feedback_id=feedback_id, db=db)
        # No return needed for 204 No Content
    except HTTPException as e:
        raise e # Re-raise 404, 500
    except Exception as e:
        logger.exception(f"Admin: Unexpected error deleting feedback ID {feedback_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")