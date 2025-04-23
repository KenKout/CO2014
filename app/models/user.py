import pymysql
from fastapi import HTTPException
from passlib.context import CryptContext
from app.database import get_db
from datetime import datetime
from app.models.enums import UserType

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database operations for User model using raw SQL
def get_user_by_username(username: str, db: pymysql.connections.Connection):
    """
    Fetch a user by username from the database.
    """
    with db.cursor() as cursor:
        cursor.execute("SELECT * FROM User WHERE Username = %s", (username,))
        return cursor.fetchone()

def register_user(username: str, hashed_password: str, phone: str, user_type: str, name: str, db: pymysql.connections.Connection):
    """
    Register a new user and associated customer/staff data.
    Validates user_type against UserType enum to ensure consistency.
    """
    try:
        # Validate user_type against UserType enum values
        try:
            user_type_enum = UserType(user_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid user type provided. Must be 'Customer' or 'Staff'.")
            
        with db.cursor() as cursor:
            # Insert into User table
            cursor.execute(
                "INSERT INTO User (Username, Password, Phone, UserType, JoinDate) VALUES (%s, %s, %s, %s, NOW())",
                (username, hashed_password, phone, user_type)
            )
            
            # If user_type is Customer, insert into Customer table
            if user_type_enum == UserType.CUSTOMER:
                cursor.execute(
                    "INSERT INTO Customer (Name, Username, Date_of_Birth) VALUES (%s, %s, NOW())",
                    (name, username)
                )
            db.commit()
        return {"message": "User registered successfully"}
    except pymysql.err.IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username already registered")
