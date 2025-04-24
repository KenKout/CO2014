from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel
import pymysql
from loguru import logger

from app.database import get_db
from app.utils.auth import get_current_user
from app.models.user import get_customer_id_by_username
from app.models.training_session import get_training_session_by_id
from app.models.enroll import get_enrollment_count, is_user_enrolled, enroll_user_in_session

# Create router
router = APIRouter(
    prefix="/training-sessions",
    tags=["User Training Sessions"],
    responses={404: {"description": "Not found"}},
)

# Pydantic model for response
class EnrollResponse(BaseModel):
    message: str
    order_id: int

@router.post("/{session_id}/enroll", response_model=EnrollResponse, status_code=status.HTTP_201_CREATED)
async def enroll_in_training_session(
    session_id: int = Path(..., description="The ID of the training session to enroll in", gt=0),
    db: pymysql.connections.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user) # Requires user authentication
):
    """
    Enroll the current authenticated user in a specific training session.

    Checks for session availability, capacity, and prevents duplicate enrollments.
    Creates an order and enrollment record upon successful enrollment.
    """
    username = current_user['Username']
    logger.info(f"User '{username}' attempting enrollment in session ID: {session_id}")

    try:
        # 1. Get CustomerID from username
        customer_id = get_customer_id_by_username(username, db)

        # 2. Get Training Session details
        session = get_training_session_by_id(session_id, db)

        # 3. Check if session is available
        if session['Status'] != 'Available':
            logger.warning(f"Enrollment failed: Session {session_id} is not available (Status: {session['Status']}). User: {username}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This training session is currently unavailable.")

        # 4. Check if user is already enrolled
        if is_user_enrolled(customer_id, session_id, db):
            logger.warning(f"Enrollment failed: User {username} (CustomerID: {customer_id}) already enrolled in session {session_id}.")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You are already enrolled in this session.")

        # 5. Check session capacity
        current_enrollments = get_enrollment_count(session_id, db)
        if current_enrollments >= session['Max_Students']:
            logger.warning(f"Enrollment failed: Session {session_id} is full (Enrolled: {current_enrollments}, Max: {session['Max_Students']}). User: {username}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This training session is full.")

        # 6. Perform enrollment (creates order and enroll record)
        order_id = enroll_user_in_session(customer_id, session_id, session['Price'], db)

        logger.info(f"User '{username}' (CustomerID: {customer_id}) successfully enrolled in session {session_id}. OrderID: {order_id}")
        return {"message": "Successfully enrolled in training session", "order_id": order_id}

    except HTTPException as http_exc:
        # Re-raise HTTPExceptions (like 404 Not Found from models, or specific ones raised above)
        raise http_exc
    except Exception as e:
        # Log unexpected errors
        logger.exception(f"Unexpected error during enrollment for user '{username}' in session {session_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error")