from fastapi import APIRouter, Depends, HTTPException
from typing import List
import pymysql
from app.database import get_db
from app.models.feedback import (
    get_all_feedback_admin,
    EquipmentResponse, # Import the Pydantic model
)
from loguru import logger # Import loguru

router = APIRouter(
    prefix="/feedback",
    tags=["feedback"]
)

@router.get("/", response_model=List[FeedbackResponse])
async def get_all_feedbacks(
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all feedbacks with pagination.
    
    Parameters:
    - skip: Number of records to skip (for pagination)
    - limit: Maximum number of records to return
    
    Returns:
    - List of feedbacks
    """
    feedbacks = db.query(Feedback).offset(skip).limit(limit).all()
    return feedbacks