from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Ratings"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for response
class Rating(BaseModel):
    rating_id: int
    target_type: str
    target_id: int
    score: int
    comment: Optional[str] = None
    customer_id: int

# Routes
@router.get("/ratings", response_model=List[Rating])
async def list_ratings(
    target_type: Optional[str] = None,
    user_id: Optional[int] = None,
    score: Optional[int] = None,
    current_admin: dict = Depends(get_current_admin),
    db: pymysql.connections.Connection = Depends(get_db)
):
    """List all ratings with filters."""
    with db.cursor() as cursor:
        query = """
        SELECT rating_id, target_type, target_id, score, comment, customer_id
        FROM ratings
        WHERE 1=1
        """
        params = []
        if target_type:
            query += " AND target_type = %s"
            params.append(target_type)
        if user_id:
            query += " AND customer_id = (SELECT CustomerID FROM customer WHERE UserID = %s)"
            params.append(user_id)
        if score:
            query += " AND score = %s"
            params.append(score)
        
        cursor.execute(query, params)
        ratings = cursor.fetchall()
        return ratings

@router.delete("/ratings/{rating_id}")
async def delete_rating(rating_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Delete a rating."""
    with db.cursor() as cursor:
        cursor.execute("SELECT rating_id FROM ratings WHERE rating_id = %s", (rating_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Rating not found")
        
        cursor.execute("DELETE FROM ratings WHERE rating_id = %s", (rating_id,))
        db.commit()
        return {"message": "Rating deleted successfully"}