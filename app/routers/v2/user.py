from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserTypeEnum # Import UserTypeEnum from models/user.py
from pydantic import BaseModel
from typing import Optional
from enum import Enum

class UserCreate(BaseModel):
    Username: str
    Password: str
    Phone: str
    UserType: UserTypeEnum  # Use UserTypeEnum

class UserUpdate(BaseModel):
    Username: Optional[str] = None
    Password: Optional[str] = None
    Phone: Optional[str] = None
    UserType: Optional[UserTypeEnum] = None  # Use Optional[UserTypeEnum]

class UserResponse(BaseModel):
    UserID: int
    Username: str
    Phone: str
    UserType: UserTypeEnum  # Use UserTypeEnum

    class Config:
        orm_mode = True

router_user = APIRouter(prefix="/user", tags=["User"])

@router_user.post("/users/", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    return User.create_user(
        db=db,
        username=user.Username,
        password=user.Password,
        phone=user.Phone,
        user_type=user.UserType
    )
@router_user.get("/users/{user_id}", response_model=UserResponse)
async def read_user(user_id: int, db: Session = Depends(get_db)):
    return User.get_user_by_id(db=db, user_id=user_id)

@router_user.delete("/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    return User.delete_user(db=db, user_id=user_id)

@router_user.put("/users/{user_id}/change-password")
async def change_password(user_id: int, new_password: str, db: Session = Depends(get_db)):
    return User.change_password(db=db, user_id=user_id, new_password=new_password)

@router_user.get("/users/")
async def get_all_users(db: Session = Depends(get_db)):
    return User.get_all_users(db=db)

@router_user.post("/users/login")
async def login_user(username: str, password: str, db: Session = Depends(get_db)):
    return User.login_user(db=db, username=username, password=password)
