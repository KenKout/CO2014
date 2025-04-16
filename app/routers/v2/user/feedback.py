from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import pymysql
from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/user",
    tags=["User Feedback"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for request
class FeedbackRequest(BaseModel):
    title: str
    content: str

# Routes
@router.post("/feedback")
async def submit_feedback(feedback: FeedbackRequest, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Submit general feedback (feedback table)."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        cursor.execute("SELECT CustomerID FROM customer WHERE UserID = %s", (user_id,))
        customer = cursor.fetchone()
        if not customer:
            raise HTTPException(status_code=403, detail="Only customers can submit feedback")
        customer_id = customer['CustomerID']
        
        cursor.execute("""
        INSERT INTO feedback (CustomerID, Title, Content) 
        VALUES (%s, %s, %s)
        """, (customer_id, feedback.title, feedback.content))
        db.commit()
        feedback_id = cursor.lastrowid
        return {"message": "Feedback submitted successfully", "feedback_id": feedback_id}