# Filename: app/models/user.py
# models/user.py
from sqlalchemy import Column, Integer, String, Enum as SQLEnum # Import Enum as SQLEnum to avoid name conflict
from sqlalchemy.orm import relationship
from fastapi import HTTPException
from passlib.context import CryptContext
from app.database import Base
from app.models.customer import Customer
from app.models.staff import Staff
from datetime import datetime
from enum import Enum # Import Python's Enum

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Define UserType as an Enum
class UserTypeEnum(str, Enum):
    customer = "customer"
    staff = "staff"

class User(Base):
    __tablename__ = "user"

    UserID = Column(Integer, primary_key=True, index=True)
    Username = Column(String(50), unique=True, nullable=False, index=True)
    Password = Column(String(100), nullable=False)
    Phone = Column(String(10), nullable=False)
    UserType = Column(SQLEnum(UserTypeEnum), nullable=False)  # Use SQLEnum with UserTypeEnum

    # Relationships
    customer = relationship("Customer", back_populates="user", uselist=False)
    staff = relationship("Staff", back_populates="user", uselist=False)

    @classmethod
    def create_user(cls, db, username: str, password: str, phone: str, user_type: UserTypeEnum): # Expect UserTypeEnum
        # Check if username already exists
        existing_user = db.query(cls).filter(cls.Username == username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")

        # Validate input data
        if len(password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        if len(phone) != 10:
            raise HTTPException(status_code=400, detail="Phone number is invalid")
        if not phone.isdigit():
            raise HTTPException(status_code=400, detail="Phone number must contain only digits")
        # No need to validate user_type string anymore, Enum will handle validation

        # Hash the password
        hashed_password = pwd_context.hash(password)

        # Create new user
        new_user = cls(
            Username=username,
            Password=hashed_password,
            Phone=phone,
            UserType=user_type # Assign UserTypeEnum directly
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Automatically create a Customer or Staff based on UserTypeEnum
        if user_type == UserTypeEnum.customer:
            Customer.create_customer(db, user_id=new_user.UserID, name=username, join_date=datetime.utcnow())
        elif user_type == UserTypeEnum.staff:
            Staff.create_staff(db, user_id=new_user.UserID, name=username, join_date=datetime.utcnow())
        return new_user
    


    
    @classmethod
    def get_user_by_id(cls, db, user_id: int):
        user = db.query(cls).filter(cls.UserID == user_id).first()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    @classmethod
    def login_user(cls, db, username: str, password: str):
        user = db.query(cls).filter(cls.Username == username).first()
        if user is None or not pwd_context.verify(password, user.Password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return user
    @classmethod
    def delete_user(cls, db, user_id: int):
        # Prevent deletion if the user is associated with a Customer
        user = cls.get_user_by_id(db, user_id)
        if user.customer:
            db.delete(user.customer) # Delete customer profile first
        elif user.staff:
            db.delete(user.staff)     # Delete staff profile first
        db.delete(user)
        db.commit()
        return {"detail": "User and associated profile deleted successfully"}

    @classmethod
    def change_password(cls, db, user_id: int, new_password: str):
        user = db.query(cls).filter(cls.UserID == user_id).first()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        if len(new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        if(new_password == user.Password):
            raise HTTPException(status_code=400, detail="New password must be different from the old password")
        user.Password = pwd_context.hash(new_password)
        db.commit()
        db.refresh(user)
        return user
    @classmethod
    def get_user_by_username(cls, db, username: str):
        user = db.query(cls).filter(cls.Username == username).first()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    @classmethod
    def get_all_users(cls, db):
        users = db.query(cls).all()
        if not users:
            raise HTTPException(status_code=404, detail="No users found")
        return users
