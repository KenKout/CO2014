from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
import pymysql
from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter(
    prefix="/user",
    tags=["User Ratings"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for request and response
class RatingRequest(BaseModel):
    target_type: str  # 'coach', 'court', 'session'
    target_id: int
    score: int  # 1-5
    comment: Optional[str] = None

class Rating(BaseModel):
    rating_id: int
    target_type: str
    target_id: int
    score: int
    comment: Optional[str] = None

# Routes
@router.post("/ratings", response_model=Rating)
async def submit_rating(rating_request: RatingRequest, current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """Submit a rating (requires validation e.g., user attended session/booked court)."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        cursor.execute("SELECT CustomerID FROM customer WHERE UserID = %s", (user_id,))
        customer = cursor.fetchone()
        if not customer:
            raise HTTPException(status_code=403, detail="Only customers can submit ratings")
        customer_id = customer['CustomerID']
        
        if rating_request.score < 1 or rating_request.score > 5:
            raise HTTPException(status_code=400, detail="Score must be between 1 and 5")
        
        if rating_request.target_type not in ['coach', 'court', 'session']:
            raise HTTPException(status_code=400, detail="Invalid target type")
        
        # Validation: Check if user has interacted with the target
        if rating_request.target_type == 'court':
            cursor.execute("""
            SELECT BookingID FROM booking 
            WHERE CustomerID = %s AND CourtID = %s AND Status = 'Completed'
            """, (customer_id, rating_request.target_id))
            if not cursor.fetchone():
                raise HTTPException(status_code=403, detail="You can only rate courts you have booked")
        elif rating_request.target_type == 'coach':
            cursor.execute("""
            SELECT e.SessionID FROM enroll e
            JOIN training_session ts ON e.SessionID = ts.SessionID
            WHERE e.CustomerID = %s AND ts.CoachID = %s
            """, (customer_id, rating_request.target_id))
            if not cursor.fetchone():
                raise HTTPException(status_code=403, detail="You can only rate coaches whose sessions you have attended")
        elif rating_request.target_type == 'session':
            cursor.execute("SELECT SessionID FROM enroll WHERE CustomerID = %s AND SessionID = %s", (customer_id, rating_request.target_id))
            if not cursor.fetchone():
                raise HTTPException(status_code=403, detail="You can only rate sessions you have enrolled in")
        
        # Insert rating
        cursor.execute("""
        INSERT INTO ratings (customer_id, target_type, target_id, score, comment) 
        VALUES (%s, %s, %s, %s, %s)
        """, (customer_id, rating_request.target_type, rating_request.target_id, rating_request.score, rating_request.comment))
        db.commit()
        rating_id = cursor.lastrowid
        return {**rating_request.dict(), "rating_id": rating_id}

@router.get("/ratings", response_model=List[Rating])
async def list_ratings(current_user: dict = Depends(get_current_user), db: pymysql.connections.Connection = Depends(get_db)):
    """List ratings submitted by the user."""
    user_id = current_user['UserID']
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT r.rating_id, r.target_type, r.target_id, r.score, r.comment
        FROM ratings r
        JOIN customer c ON r.customer_id = c.CustomerID
        WHERE c.UserID = %s
        """, (user_id,))
        ratings = cursor.fetchall()
        return ratings