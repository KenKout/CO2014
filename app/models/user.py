import pymysql
from fastapi import HTTPException
from passlib.context import CryptContext
from app.database import get_db
from datetime import datetime
from enum import Enum # Import Python's Enum

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Define UserType as an Enum
class UserTypeEnum(str, Enum):
    customer = "customer"
    staff = "staff"

# Database operations for User model using raw SQL
def get_user_by_username(username: str, db: pymysql.connections.Connection):
    """
    Fetch a user by username from the database.
    """
    with db.cursor() as cursor:
        cursor.execute("SELECT * FROM user WHERE Username = %s", (username,))
        return cursor.fetchone()

def get_user_by_id(user_id: int, db: pymysql.connections.Connection):
    """
    Fetch a user by UserID from the database.
    """
    with db.cursor() as cursor:
        cursor.execute("SELECT * FROM user WHERE UserID = %s", (user_id,))
        return cursor.fetchone()

def register_user(username: str, hashed_password: str, phone: str, user_type: str, name: str, db: pymysql.connections.Connection):
    """
    Register a new user and associated customer/staff data.
    """
    try:
        with db.cursor() as cursor:
            # Insert into user table
            cursor.execute(
                "INSERT INTO user (Username, Password, Phone, UserType, JoinDate) VALUES (%s, %s, %s, %s, NOW())",
                (username, hashed_password, phone, user_type)
            )
            user_id = cursor.lastrowid
            
            # If user_type is customer, insert into customer table
            if user_type == "customer":
                cursor.execute(
                    "INSERT INTO customer (Name, UserID) VALUES (%s, %s)",
                    (name, user_id)
                )
            db.commit()
        return {"message": "User registered successfully"}
    except pymysql.err.IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username already registered")
