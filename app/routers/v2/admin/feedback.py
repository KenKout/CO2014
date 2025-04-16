from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Feedback"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class Feedback(BaseModel):
    feedback_id: int
    customer_id: Optional[int] = None
    title: str
    content: Optional[str] = None

# Routes
@router.get("/feedback", response_model=List[Feedback])
async def list_feedback(current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """List all feedback."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT FeedbackID as feedback_id, CustomerID as customer_id, Title as title, Content as content
        FROM feedback
        """)
        feedback_list = cursor.fetchall()
        return feedback_list

@router.get("/feedback/{feedback_id}", response_model=Feedback)
async def get_feedback(feedback_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Get specific feedback."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT FeedbackID as feedback_id, CustomerID as customer_id, Title as title, Content as content
        FROM feedback
        WHERE FeedbackID = %s
        """, (feedback_id,))
        feedback = cursor.fetchone()
        if not feedback:
            raise HTTPException(status_code=404, detail="Feedback not found")
        return feedback

@router.delete("/feedback/{feedback_id}")
async def delete_feedback(feedback_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Delete feedback."""
    with db.cursor() as cursor:
        cursor.execute("SELECT FeedbackID FROM feedback WHERE FeedbackID = %s", (feedback_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Feedback not found")
        
        cursor.execute("DELETE FROM feedback WHERE FeedbackID = %s", (feedback_id,))
        db.commit()
        return {"message": "Feedback deleted successfully"}