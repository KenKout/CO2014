from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import pymysql
from app.database import get_db
from app.utils.auth import get_current_admin

router = APIRouter(
    prefix="/admin",
    tags=["Admin Users"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models for request and response
class User(BaseModel):
    user_id: int
    username: str
    phone: str
    user_type: str
    join_date: Optional[datetime] = None

class UserUpdate(BaseModel):
    phone: Optional[str] = None
    user_type: Optional[str] = None  # 'customer', 'staff'
    status: Optional[str] = None  # Placeholder if status field exists

# Routes
@router.get("/users", response_model=List[User])
async def list_users(current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """List all users."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT UserID as user_id, Username as username, Phone as phone, UserType as user_type, JoinDate as join_date
        FROM user
        """)
        users = cursor.fetchall()
        return users

@router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Get user details."""
    with db.cursor() as cursor:
        cursor.execute("""
        SELECT UserID as user_id, Username as username, Phone as phone, UserType as user_type, JoinDate as join_date
        FROM user
        WHERE UserID = %s
        """, (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

@router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: int, update: UserUpdate, current_admin: dict = Depends(get_current_admin), db: pymysql.connections.Connection = Depends(get_db)):
    """Update user (phone, type, status)."""
    with db.cursor() as cursor:
        cursor.execute("SELECT UserID FROM user WHERE UserID = %s", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        
        query = "UPDATE user SET "
        params = []
        updates = []
        if update.phone is not None:
            updates.append("Phone = %s")
            params.append(update.phone)
        if update.user_type is not None:
            if update.user_type not in ['customer', 'staff']:
                raise HTTPException(status_code=400, detail="Invalid user type")
            updates.append("UserType = %s")
            params.append(update.user_type)
        # If status field exists, it would be updated here
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        query += ", ".join(updates) + " WHERE UserID = %s"
        params.append(user_id)
        cursor.execute(query, params)
        db.commit()
        
        cursor.execute("""
        SELECT UserID as user_id, Username as username, Phone as phone, UserType as user_type, JoinDate as join_date
        FROM user
        WHERE UserID = %s
        """, (user_id,))
        updated_user = cursor.fetchone()
        return updated_user