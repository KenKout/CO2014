from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import Optional
from app.utils.auth import pwd_context, verify_password, get_password_hash, create_access_token, get_current_user
from app.models.user import get_user_by_username, register_user
from pydantic import BaseModel, validator
import pymysql
from app.database import get_db
from app.env import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
    responses={404: {"description": "Not found"}},
)


oauth2_scheme = None  # Not needed as it's handled in utils/auth.py

# Pydantic models for request and response
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    user_id: int
    username: str
    phone: str
    user_type: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    phone: str
    name: str

    @validator('password')
    def validate_password(cls, value):
        if len(value) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return value

class LoginRequest(BaseModel):
    username: str
    password: str

class ForgotPasswordRequest(BaseModel):
    username: str
    phone: str

# Helper functions are now in app/utils/auth.py

# Routes
@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db: pymysql.connections.Connection = Depends(get_db)):
    user = get_user_by_username(login_data.username, db)
    if not user or not verify_password(login_data.password, user['Password']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": str(user['UserID'])}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register")
async def register(user: RegisterRequest, db: pymysql.connections.Connection = Depends(get_db)):
    hashed_password = get_password_hash(user.password)
    return register_user(user.username, hashed_password, user.phone, "customer", user.name, db)

@router.get("/profile", response_model=User)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {"user_id": current_user['UserID'], "username": current_user['Username'], "phone": current_user['Phone'], "user_type": current_user['UserType']}