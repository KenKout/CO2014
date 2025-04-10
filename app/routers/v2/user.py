from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db  # Assuming you have a dependency for getting DB session

from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    Username: str
    Password: str
    Phone: str
    UserType: str  # "customer" or "staff"


class UserUpdate(BaseModel):
    Username: Optional[str] = None
    Password: Optional[str] = None
    Phone: Optional[str] = None
    UserType: Optional[str] = None  # "customer" or "staff"


class UserResponse(BaseModel):
    UserID: int
    Username: str
    Phone: str
    UserType: str  # "customer" or "staff"

    class Config:
        orm_mode = True

router_user = APIRouter(prefix="/user", tags=["User"])


@router_user.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Insert the user
    query = text("""
        INSERT INTO user (Username, Password, Phone, UserType)
        VALUES (:Username, :Password, :Phone, :UserType)
    """)
    db.execute(query, {
        "Username": user.Username,
        "Password": user.Password,  # Make sure to hash the password before inserting
        "Phone": user.Phone,
        "UserType": user.UserType  # 'customer' or 'staff'
    })
    db.commit()
    
    # Now fetch the inserted user using the last inserted ID
    query = text("""
        SELECT UserID, Username, Phone, UserType
        FROM user
        WHERE UserID = LAST_INSERT_ID()
    """)
    result = db.execute(query).fetchone()

    if result is None:
        raise HTTPException(status_code=400, detail="User could not be created")
    
    return result


@router_user.get("/users/{user_id}", response_model=UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    query = text("""
        SELECT UserID, Username, Phone, UserType
        FROM user
        WHERE UserID = :user_id
    """)
    result = db.execute(query, {"user_id": user_id}).fetchone()

    if result is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return result


# @router_user.put("/users/{user_id}", response_model=UserResponse)
# def update_user(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
#     query = text( """
#         UPDATE user
#         SET 
#             Username = COALESCE(:Username, Username),
#             Password = COALESCE(:Password, Password),
#             Phone = COALESCE(:Phone, Phone),
#             UserType = COALESCE(:UserType, UserType)
#         WHERE UserID = :user_id
#     """)
    
#     result = db.execute(query, {
#         "Username": user_update.Username,
#         "Password": user_update.Password,  # Ensure password is hashed if updated
#         "Phone": user_update.Phone,
#         "UserType": user_update.UserType,
#         "user_id": user_id
#     }).fetchone()

#     if result is None:
#         raise HTTPException(status_code=404, detail="User not found")
    
#     return result


# @router_user.delete("/users/{user_id}")
# def delete_user(user_id: int, db: Session = Depends(get_db)):
#     query = text("""
#         DELETE FROM user
#         WHERE UserID = :user_id
#         RETURNING UserID
#     """)
#     result = db.execute(query, {"user_id": user_id}).fetchone()
    
#     if result is None:
#         raise HTTPException(status_code=404, detail="User not found")
    
#     return {"message": f"User {user_id} deleted successfully"}
