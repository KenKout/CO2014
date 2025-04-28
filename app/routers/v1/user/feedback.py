from fastapi import APIRouter, Depends, HTTPException, status, Path, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import pymysql
from loguru import logger

from app.database import get_db
from app.utils.auth import get_current_user
from app.models.feedback import get_all_feedback_admin, get_feedback_by_id_admin
from app.models.enums import FeedbackType
from app.models.user import get_customer_id_by_username  # Import the function to get customer ID

feedback_router = APIRouter(
    prefix="/feedback",
    tags=["User Feedback"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for request and response
class FeedbackRequest(BaseModel):
    title: str = Field(..., max_length=255, description="Title of the feedback")
    content: str = Field(..., description="Content of the feedback")
    feedback_on: FeedbackType = Field(..., description="Type of feedback (Court or Session)")
    target_id: int = Field(..., description="Target ID (CourtID or SessionID)")
    rate: int = Field(..., ge=1, le=5, description="Rating (1-5)")

class FeedbackResponse(BaseModel):
    FeedbackID: int
    CustomerID: int
    Title: str
    Content: str
    ON: FeedbackType
    Rate: int
    TargetDetails: str

@feedback_router.get("/", response_model=List[FeedbackResponse])
async def get_user_feedback(
    db: pymysql.connections.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieve all feedback submitted by the current authenticated user.
    """
    username = current_user['Username']
    logger.info(f"User '{username}' is retrieving their feedback.")

    try:
        # Get CustomerID by username using the imported function
        customer_id = get_customer_id_by_username(username, db)

        feedback_list = get_all_feedback_admin(db, customer_id=customer_id)
        logger.info(f"User '{username}' retrieved {len(feedback_list)} feedback entries.")
        return feedback_list

    except Exception as e:
        logger.exception(f"Unexpected error retrieving feedback for user '{username}': {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error")

@feedback_router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    feedback_data: FeedbackRequest = Body(...),
    db: pymysql.connections.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Submit new feedback for a court or session.
    """
    username = current_user.get('Username')
    logger.info(f"User '{username}' is submitting feedback.")
    if not username:
        # This case should ideally be handled by get_current_user dependency raising 401
        logger.error("Username not found in token payload after authentication dependency.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication error")
    try:
        # Get CustomerID by username using the imported function
        customer_id = get_customer_id_by_username(username, db)

        with db.cursor() as cursor:
            sql = """
            INSERT INTO FeedBack (CustomerID, Title, Content, `ON`, Rate, CourtID, SessionID)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                customer_id,
                feedback_data.title,
                feedback_data.content,
                feedback_data.feedback_on.value,
                feedback_data.rate,
                feedback_data.target_id if feedback_data.feedback_on == FeedbackType.COURT else None,
                feedback_data.target_id if feedback_data.feedback_on == FeedbackType.SESSION else None
            ))
            db.commit()

        logger.info(f"User '{username}' successfully submitted feedback.")
        return {"message": "Feedback submitted successfully"}

    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Database error while submitting feedback: {db_err}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error")
    except Exception as e:
        logger.exception(f"Unexpected error while submitting feedback: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error")