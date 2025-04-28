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
    order_id: int = Field(..., description="Order ID related to this feedback")

class FeedbackResponse(BaseModel):
    FeedbackID: int
    CustomerID: int
    Title: str
    Content: str
    ON: FeedbackType
    Rate: int
    OrderID: int
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

@feedback_router.post("/", status_code=status.HTTP_201_CREATED, response_model=dict)
async def submit_feedback(
    feedback_data: FeedbackRequest = Body(...),
    db: pymysql.connections.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Submit new feedback for a court or session.
    """
    username = current_user.get('Username')
    logger.info(f"User '{username}' is submitting feedback: {feedback_data}")  # Log the incoming data
    if not username:
        logger.error("Username not found in token payload after authentication dependency.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication error")
    
    try:
        # Convert enum to string if needed
        feedback_on_value = feedback_data.feedback_on.value if hasattr(feedback_data.feedback_on, 'value') else str(feedback_data.feedback_on)
        
        # Get CustomerID by username using the imported function
        customer_id = get_customer_id_by_username(username, db)
        
        # Check if user has already submitted feedback for this order
        with db.cursor() as cursor:
            check_sql = """
            SELECT COUNT(*) FROM FeedBack 
            WHERE CustomerID = %s AND OrderID = %s
            """
            cursor.execute(check_sql, (customer_id, feedback_data.order_id))
            
            result = cursor.fetchone()
            existing_feedback_count = result['COUNT(*)'] 
            if existing_feedback_count > 0:
                logger.warning(f"User '{username}' attempted to submit duplicate feedback for order ID {feedback_data.order_id}")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, 
                    detail="You have already submitted feedback for this order"
                )

            # Verify order belongs to this customer and contains the target court/session
            verify_order_sql = """
            SELECT COUNT(*) FROM `OrderTable` o
            LEFT JOIN `Booking` b ON o.OrderID = b.OrderID
            WHERE o.OrderID = %s AND o.CustomerID = %s AND 
            (
                (b.CourtID = %s AND %s = 'COURT') OR
                (o.SessionID = %s AND %s = 'SESSION')
            )
            """
            cursor.execute(verify_order_sql, (
                feedback_data.order_id,
                customer_id,
                feedback_data.target_id,
                feedback_on_value,
                feedback_data.target_id,
                feedback_on_value
            ))
            
            result = cursor.fetchone()
            valid_order_count = result['COUNT(*)']
            if valid_order_count == 0:
                logger.warning(f"User '{username}' attempted to submit feedback for invalid order-target combination")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="The specified order does not match with the target court/session or doesn't belong to you"
                )
                
        # Insert feedback
        with db.cursor() as cursor:
            # Set the appropriate ID based on feedback type
            court_id = feedback_data.target_id if feedback_data.feedback_on == FeedbackType.COURT else None
            session_id = feedback_data.target_id if feedback_data.feedback_on == FeedbackType.SESSION else None
            
            sql = """
            INSERT INTO FeedBack (CustomerID, Title, Content, `ON`, Rate, CourtID, SessionID, OrderID)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                customer_id,
                feedback_data.title,
                feedback_data.content,
                feedback_on_value,
                feedback_data.rate,
                court_id,
                session_id,
                feedback_data.order_id
            ))
            db.commit()

        logger.info(f"User '{username}' successfully submitted feedback.")
        return {"message": "Feedback submitted successfully"}

    except pymysql.Error as db_err:
        db.rollback()
        logger.error(f"Database error while submitting feedback: {db_err}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {str(db_err)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error while submitting feedback: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal Server Error: {str(e)}")